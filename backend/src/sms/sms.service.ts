import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { Vonage } from "@vonage/server-sdk";
import { PersonService } from "../person/person.service";
import { EventService } from "../event/event.service";
import { Event, EventStatus } from "../event/event.entity";
import { Person } from "../person/person.entity";

@Injectable()
export class SmsService {
  private vonage: Vonage;

  constructor(
    private personService: PersonService,
    @Inject(forwardRef(() => EventService))
    private eventService: EventService
  ) {
    this.vonage = new Vonage({
      apiKey: process.env.VONAGE_API_KEY || "",
      apiSecret: process.env.VONAGE_API_SECRET || "",
    });
  }

  /**
   * Send SMS for all participants in an event
   * Can be called for DRAWN or COMPLETED events (to resend)
   */
  async sendEventSms(
    eventId: string,
    allowResend: boolean = false
  ): Promise<{ success: number; failed: number }> {
    const event = await this.eventService.findOne(eventId);
    if (!event) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    if (!event.drawResult) {
      throw new Error("No draw result found. Please generate a draw first.");
    }

    // Handle old events without status - if they have a drawResult, consider them as DRAWN
    const currentStatus =
      event.status ||
      (event.drawResult ? EventStatus.DRAWN : EventStatus.DRAFT);

    // Allow sending SMS for DRAWN status, or COMPLETED if resend is allowed
    if (
      currentStatus !== EventStatus.DRAWN &&
      !(allowResend && currentStatus === EventStatus.COMPLETED)
    ) {
      throw new Error(
        `Event must be in DRAWN status to send SMS, or COMPLETED if resending. Current status: ${currentStatus}`
      );
    }

    const persons = await this.personService.findAll();
    const personMap = new Map(persons.map((p) => [p.id, p]));

    let success = 0;
    let failed = 0;

    for (const [senderId, receiverId] of Object.entries(event.drawResult)) {
      const sender = personMap.get(senderId);
      const receiver = personMap.get(receiverId);

      if (!sender || !receiver) {
        failed++;
        continue;
      }

      try {
        await this.sendSmsToPerson(sender, receiver, event);
        success++;
      } catch (error) {
        console.error(
          `Failed to send SMS to ${sender.firstName} ${sender.lastName}:`,
          error
        );
        failed++;
      }
    }

    // Note: markAsCompleted is now called from EventService.markAsCompleted
    // to avoid circular dependency. The status update happens there.

    return { success, failed };
  }

  /**
   * Validate and format phone number for Vonage
   * - Removes leading + (Vonage doesn't accept it)
   * - Validates that it has exactly 11 digits
   * @returns Formatted phone number (without +) or throws error if invalid
   */
  private validateAndFormatPhoneNumber(
    phoneNumber: string,
    personName?: string
  ): string {
    if (!phoneNumber) {
      throw new Error(
        personName
          ? `${personName} has no phone number`
          : "Phone number is required"
      );
    }

    // Remove leading + and any spaces
    const formatted = phoneNumber.replace(/^\+/, "").replace(/\s/g, "");

    // Check if it contains only digits
    if (!/^\d+$/.test(formatted)) {
      throw new Error(
        personName
          ? `${personName} has invalid phone number format: ${phoneNumber} (must contain only digits after removing +)`
          : `Invalid phone number format: ${phoneNumber} (must contain only digits after removing +)`
      );
    }

    // Check length (should be 11 digits for French numbers)
    if (formatted.length !== 11) {
      throw new Error(
        personName
          ? `${personName} has invalid phone number length: ${formatted.length} digits (expected 11). Original: ${phoneNumber}`
          : `Invalid phone number length: ${formatted.length} digits (expected 11). Original: ${phoneNumber}`
      );
    }

    return formatted;
  }

  /**
   * Send SMS to a specific person
   */
  private async sendSmsToPerson(
    sender: Person,
    receiver: Person,
    event: Event
  ): Promise<void> {
    let phoneNumber: string;
    let message: string;

    // If sender has a phone number, use regular template
    if (sender.phoneNumber) {
      phoneNumber = this.validateAndFormatPhoneNumber(
        sender.phoneNumber,
        `${sender.firstName} ${sender.lastName}`
      );
      message = this.replaceTemplatePlaceholders(event.smsTemplate, {
        sender,
        receiver,
      });
    }
    // If sender has an assistant, use assistant template
    else if (sender.assistantId) {
      // Load assistant if not already loaded
      if (!sender.assistant) {
        const assistant = await this.personService.findOne(sender.assistantId);
        if (!assistant) {
          throw new Error(`Assistant with ID ${sender.assistantId} not found`);
        }
        sender.assistant = assistant;
      }

      if (!sender.assistant.phoneNumber) {
        throw new Error(
          `Assistant ${sender.assistant.firstName} ${sender.assistant.lastName} has no phone number`
        );
      }

      phoneNumber = this.validateAndFormatPhoneNumber(
        sender.assistant.phoneNumber,
        `Assistant ${sender.assistant.firstName} ${sender.assistant.lastName}`
      );
      message = this.replaceTemplatePlaceholders(event.assistantSmsTemplate, {
        assistant: sender.assistant,
        sender,
        receiver,
      });
    } else {
      throw new Error(
        `Person ${sender.firstName} ${sender.lastName} has no phone number and no assistant`
      );
    }

    // Send SMS via Vonage
    const from = process.env.VONAGE_FROM_NUMBER || "SecretSanta";

    // Detect if message contains Unicode characters (accents, special chars)
    // If so, use 'unicode' type, otherwise use 'text' (default)
    // Check for any character outside basic ASCII range (32-126 are printable ASCII)
    const hasUnicode = /[^\x20-\x7E]/.test(message);

    const smsParams: any = {
      to: phoneNumber,
      from,
      text: message,
    };

    // Add type: 'unicode' if message contains non-ASCII characters
    if (hasUnicode) {
      smsParams.type = "unicode";
    }

    const response = await this.vonage.sms.send(smsParams);

    if (response.messages[0].status !== "0") {
      throw new Error(`SMS failed: ${response.messages[0]["error-text"]}`);
    }
  }

  /**
   * Dry-run: Prepare SMS messages without sending them
   */
  async dryRunSms(eventId: string): Promise<{
    messages: Array<{
      to: string;
      toName: string;
      sender: string;
      receiver: string;
      message: string;
      type: "regular" | "assistant";
      error?: string;
    }>;
    summary: {
      total: number;
      success: number;
      failed: number;
    };
  }> {
    const event = await this.eventService.findOne(eventId);
    if (!event) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    if (!event.drawResult) {
      throw new Error("No draw result found. Please generate a draw first.");
    }

    const persons = await this.personService.findAll();
    const personMap = new Map(persons.map((p) => [p.id, p]));

    const messages: Array<{
      to: string;
      toName: string;
      sender: string;
      receiver: string;
      message: string;
      type: "regular" | "assistant";
      error?: string;
    }> = [];

    for (const [senderId, receiverId] of Object.entries(event.drawResult)) {
      const sender = personMap.get(senderId);
      const receiver = personMap.get(receiverId);

      if (!sender || !receiver) {
        messages.push({
          to: "N/A",
          toName: "Unknown",
          sender: senderId,
          receiver: receiverId,
          message: "",
          type: "regular",
          error: "Sender or receiver not found",
        });
        continue;
      }

      try {
        let phoneNumber: string;
        let message: string;
        let toName: string;
        let type: "regular" | "assistant";

        // If sender has a phone number, use regular template
        if (sender.phoneNumber) {
          phoneNumber = this.validateAndFormatPhoneNumber(
            sender.phoneNumber,
            `${sender.firstName} ${sender.lastName}`
          );
          toName = `${sender.firstName} ${sender.lastName}`;
          type = "regular";
          message = this.replaceTemplatePlaceholders(event.smsTemplate, {
            sender,
            receiver,
          });
        }
        // If sender has an assistant, use assistant template
        else if (sender.assistantId) {
          // Load assistant if not already loaded
          if (!sender.assistant) {
            const assistant = await this.personService.findOne(
              sender.assistantId
            );
            if (!assistant) {
              throw new Error(
                `Assistant with ID ${sender.assistantId} not found`
              );
            }
            sender.assistant = assistant;
          }

          if (!sender.assistant.phoneNumber) {
            throw new Error(
              `Assistant ${sender.assistant.firstName} ${sender.assistant.lastName} has no phone number`
            );
          }

          phoneNumber = this.validateAndFormatPhoneNumber(
            sender.assistant.phoneNumber,
            `Assistant ${sender.assistant.firstName} ${sender.assistant.lastName}`
          );
          toName = `${sender.assistant.firstName} ${sender.assistant.lastName}`;
          type = "assistant";
          message = this.replaceTemplatePlaceholders(
            event.assistantSmsTemplate,
            {
              assistant: sender.assistant,
              sender,
              receiver,
            }
          );
        } else {
          throw new Error(
            `Person ${sender.firstName} ${sender.lastName} has no phone number and no assistant`
          );
        }

        messages.push({
          to: phoneNumber, // Formatted number without +
          toName,
          sender: `${sender.firstName} ${sender.lastName}`,
          receiver: `${receiver.firstName} ${receiver.lastName}`,
          message,
          type,
        });
      } catch (error) {
        messages.push({
          to: "N/A",
          toName: "Unknown",
          sender: `${sender.firstName} ${sender.lastName}`,
          receiver: `${receiver.firstName} ${receiver.lastName}`,
          message: "",
          type: "regular",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const success = messages.filter((m) => !m.error).length;
    const failed = messages.filter((m) => m.error).length;

    return {
      messages,
      summary: {
        total: messages.length,
        success,
        failed,
      },
    };
  }

  /**
   * Replace template placeholders with actual values
   * Supports both simple placeholders like {sender} and object properties like {sender.firstName}
   */
  private replaceTemplatePlaceholders(
    template: string,
    values: Record<string, Person | string>
  ): string {
    let message = template;

    // First, replace object property placeholders like {sender.firstName}, {receiver.slug}
    // Pattern: {objectName.propertyName}
    message = message.replace(
      /\{(\w+)\.(\w+)\}/g,
      (match, objectName, propertyName) => {
        const obj = values[objectName];
        if (obj && typeof obj === "object") {
          const person = obj;
          // Support firstName, lastName, slug
          if (propertyName === "firstName") {
            return person.firstName || "";
          }
          if (propertyName === "lastName") {
            return person.lastName || "";
          }
          if (propertyName === "slug") {
            return person.slug || "";
          }
          // Fallback: try to access the property directly
          return (person as any)[propertyName] || match;
        }
        return match; // Return original if not found
      }
    );

    // Then, replace simple placeholders like {sender}, {receiver}, {assistant}
    // These will use the full name as fallback for backward compatibility
    for (const [key, value] of Object.entries(values)) {
      if (typeof value === "object") {
        const person = value;
        // Replace {key} with full name for backward compatibility
        message = message.replace(
          new RegExp(`\\{${key}\\}`, "g"),
          `${person.firstName} ${person.lastName}`
        );
      } else {
        message = message.replace(new RegExp(`\\{${key}\\}`, "g"), value);
      }
    }

    return message;
  }
}

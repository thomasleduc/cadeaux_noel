import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { PersonService } from "../person/person.service";
import { EventService } from "../event/event.service";
import { Event, EventStatus } from "../event/event.entity";
import { Person } from "../person/person.entity";
import { SmsProvider } from "./sms-provider.interface";
import { TwilioProvider } from "./providers/twilio.provider";
import { SmsGatewayProvider } from "./providers/sms-gateway.provider";

@Injectable()
export class SmsService {
  private smsProvider: SmsProvider;
  private providerName: string;

  constructor(
    private personService: PersonService,
    @Inject(forwardRef(() => EventService))
    private eventService: EventService
  ) {
    // Choose SMS provider based on environment variables
    // Priority: SMS_GATEWAY_URL > TWILIO_ACCOUNT_SID > VONAGE_API_KEY (legacy)
    if (process.env.SMS_GATEWAY_URL) {
      this.smsProvider = new SmsGatewayProvider();
      this.providerName = "SMS Gateway";
      console.log("📱 Using SMS Gateway provider");
    } else if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN
    ) {
      this.smsProvider = new TwilioProvider();
      this.providerName = "Twilio";
      console.log("📱 Using Twilio provider");
    } else {
      // Fallback to Vonage for backward compatibility
      const Vonage = require("@vonage/server-sdk").Vonage;
      const apiKey = process.env.VONAGE_API_KEY;
      const apiSecret = process.env.VONAGE_API_SECRET;

      if (!apiKey || !apiSecret) {
        console.warn("⚠️  No SMS provider configured. Set one of:");
        console.warn("  - SMS_GATEWAY_URL (for Android SMS Gateway)");
        console.warn("  - TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN (for Twilio)");
        console.warn(
          "  - VONAGE_API_KEY + VONAGE_API_SECRET (for Vonage - legacy)"
        );
      }

      // Create a Vonage adapter
      const vonage = new Vonage({
        apiKey: apiKey || "",
        apiSecret: apiSecret || "",
      });

      this.smsProvider = {
        async sendSms(params) {
          const response = await vonage.sms.send({
            to: params.to,
            from: params.from,
            text: params.text,
            ...(params.type === "unicode" && { type: "unicode" }),
          });

          if (response.messages[0].status !== "0") {
            throw new Error(
              `Vonage SMS failed: ${response.messages[0]["error-text"]}`
            );
          }
        },
      };
      this.providerName = "Vonage (legacy)";
      console.log("📱 Using Vonage provider (legacy)");
    }
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
        // Additional context logging at the loop level
        console.error(
          `[${this.providerName}] Failed to send SMS to ${sender.firstName} ${sender.lastName} (ID: ${sender.id}):`,
          error instanceof Error ? error.message : String(error)
        );
        console.error("Error details:", {
          provider: this.providerName,
          senderId: sender.id,
          receiverId: receiver.id,
          eventId: event.id,
          errorType:
            error instanceof Error ? error.constructor.name : typeof error,
        });
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Validate and format phone number
   * - Removes leading + for providers that don't accept it
   * - Validates that it has exactly 11 digits
   * @returns Formatted phone number or throws error if invalid
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

    // Get from number based on provider
    const from =
      process.env.TWILIO_PHONE_NUMBER ||
      process.env.VONAGE_FROM_NUMBER ||
      "SecretSanta";

    // Detect if message contains Unicode characters (accents, special chars)
    const hasUnicode = /[^\x20-\x7E]/.test(message);

    try {
      await this.smsProvider.sendSms({
        to: phoneNumber,
        from,
        text: message,
        type: hasUnicode ? "unicode" : "text",
      });
    } catch (error) {
      // Log all relevant information when SMS fails
      console.error(`=== ${this.providerName.toUpperCase()} SMS ERROR ===`);
      console.error("Error:", error);
      console.error("SMS Parameters:", {
        to: phoneNumber,
        from,
        text: message.substring(0, 100) + (message.length > 100 ? "..." : ""),
        textLength: message.length,
        hasUnicode,
      });
      console.error("Sender Info:", {
        id: sender.id,
        name: `${sender.firstName} ${sender.lastName}`,
        phoneNumber: sender.phoneNumber || "N/A",
        assistantId: sender.assistantId || "N/A",
      });
      console.error("Receiver Info:", {
        id: receiver.id,
        name: `${receiver.firstName} ${receiver.lastName}`,
      });
      console.error("Event Info:", {
        id: event.id,
        name: event.name,
      });
      console.error(`=== END ${this.providerName.toUpperCase()} ERROR ===`);
      throw error;
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
          to: phoneNumber,
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
    message = message.replace(
      /\{(\w+)\.(\w+)\}/g,
      (match, objectName, propertyName) => {
        const obj = values[objectName];
        if (obj && typeof obj === "object") {
          const person = obj;
          if (propertyName === "firstName") {
            return person.firstName || "";
          }
          if (propertyName === "lastName") {
            return person.lastName || "";
          }
          if (propertyName === "slug") {
            return person.slug || "";
          }
          return (person as any)[propertyName] || match;
        }
        return match;
      }
    );

    // Then, replace simple placeholders like {sender}, {receiver}, {assistant}
    for (const [key, value] of Object.entries(values)) {
      if (typeof value === "object") {
        const person = value;
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

import { Injectable } from "@nestjs/common";
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
    private eventService: EventService
  ) {
    this.vonage = new Vonage({
      apiKey: process.env.VONAGE_API_KEY || "",
      apiSecret: process.env.VONAGE_API_SECRET || "",
    });
  }

  /**
   * Send SMS for all participants in an event
   */
  async sendEventSms(eventId: string): Promise<{ success: number; failed: number }> {
    const event = await this.eventService.findOne(eventId);
    if (!event) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    if (!event.drawResult) {
      throw new Error("No draw result found. Please generate a draw first.");
    }

    // Handle old events without status - if they have a drawResult, consider them as DRAWN
    const currentStatus = event.status || (event.drawResult ? EventStatus.DRAWN : EventStatus.DRAFT);
    if (currentStatus !== EventStatus.DRAWN) {
      throw new Error(`Event must be in DRAWN status to send SMS. Current status: ${currentStatus}`);
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
        console.error(`Failed to send SMS to ${sender.firstName} ${sender.lastName}:`, error);
        failed++;
      }
    }

    // Mark event as completed after sending SMS
    if (success > 0) {
      await this.eventService.markAsCompleted(eventId);
    }

    return { success, failed };
  }

  /**
   * Send SMS to a specific person
   */
  private async sendSmsToPerson(sender: Person, receiver: Person, event: Event): Promise<void> {
    let phoneNumber: string;
    let message: string;

    // If sender has a phone number, use regular template
    if (sender.phoneNumber) {
      phoneNumber = sender.phoneNumber;
      message = this.replaceTemplatePlaceholders(event.smsTemplate, {
        sender: `${sender.firstName} ${sender.lastName}`,
        receiver: `${receiver.firstName} ${receiver.lastName}`,
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

      phoneNumber = sender.assistant.phoneNumber || "";
      if (!phoneNumber) {
        throw new Error(
          `Assistant ${sender.assistant.firstName} ${sender.assistant.lastName} has no phone number`
        );
      }
      message = this.replaceTemplatePlaceholders(event.assistantSmsTemplate, {
        assistant: `${sender.assistant.firstName} ${sender.assistant.lastName}`,
        sender: `${sender.firstName} ${sender.lastName}`,
        receiver: `${receiver.firstName} ${receiver.lastName}`,
      });
    } else {
      throw new Error(
        `Person ${sender.firstName} ${sender.lastName} has no phone number and no assistant`
      );
    }

    // Send SMS via Vonage
    const from = process.env.VONAGE_FROM_NUMBER || "SecretSanta";
    const response = await this.vonage.sms.send({ to: phoneNumber, from, text: message });

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
          phoneNumber = sender.phoneNumber;
          toName = `${sender.firstName} ${sender.lastName}`;
          type = "regular";
          message = this.replaceTemplatePlaceholders(event.smsTemplate, {
            sender: `${sender.firstName} ${sender.lastName}`,
            receiver: `${receiver.firstName} ${receiver.lastName}`,
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

          phoneNumber = sender.assistant.phoneNumber || "";
          if (!phoneNumber) {
            throw new Error(
              `Assistant ${sender.assistant.firstName} ${sender.assistant.lastName} has no phone number`
            );
          }
          toName = `${sender.assistant.firstName} ${sender.assistant.lastName}`;
          type = "assistant";
          message = this.replaceTemplatePlaceholders(event.assistantSmsTemplate, {
            assistant: `${sender.assistant.firstName} ${sender.assistant.lastName}`,
            sender: `${sender.firstName} ${sender.lastName}`,
            receiver: `${receiver.firstName} ${receiver.lastName}`,
          });
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
   */
  private replaceTemplatePlaceholders(template: string, values: Record<string, string>): string {
    let message = template;
    for (const [key, value] of Object.entries(values)) {
      message = message.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }
    return message;
  }
}


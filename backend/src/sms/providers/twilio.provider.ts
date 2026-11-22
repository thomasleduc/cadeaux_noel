import { Injectable } from "@nestjs/common";
import { SmsProvider } from "../sms-provider.interface";
import twilio from "twilio";

@Injectable()
export class TwilioProvider implements SmsProvider {
  private client: ReturnType<typeof twilio>;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      console.warn(
        "⚠️  TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not found in environment variables"
      );
      console.warn("Make sure your .env file contains:");
      console.warn("TWILIO_ACCOUNT_SID=your_account_sid");
      console.warn("TWILIO_AUTH_TOKEN=your_auth_token");
      console.warn("TWILIO_PHONE_NUMBER=your_twilio_phone_number");
    }

    this.client = twilio(accountSid || "", authToken || "");
  }

  async sendSms(params: {
    to: string;
    from: string;
    text: string;
    type?: "text" | "unicode";
  }): Promise<void> {
    // Twilio requires phone numbers in E.164 format (with +)
    const to = params.to.startsWith("+") ? params.to : `+${params.to}`;
    const from = process.env.TWILIO_PHONE_NUMBER || params.from;

    try {
      const message = await this.client.messages.create({
        body: params.text,
        to,
        from,
      });

      if (message.errorCode || message.errorMessage) {
        throw new Error(
          `Twilio SMS failed: ${message.errorCode} - ${message.errorMessage}`
        );
      }
    } catch (error) {
      console.error("=== TWILIO SMS ERROR ===");
      console.error("Error:", error);
      console.error("SMS Parameters:", {
        to,
        from,
        text:
          params.text.substring(0, 100) +
          (params.text.length > 100 ? "..." : ""),
        textLength: params.text.length,
        type: params.type || "text",
      });
      console.error("=== END TWILIO ERROR ===");
      throw error;
    }
  }
}

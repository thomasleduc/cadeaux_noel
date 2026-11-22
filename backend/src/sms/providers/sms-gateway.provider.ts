import { Injectable } from "@nestjs/common";
import { SmsProvider } from "../sms-provider.interface";

/**
 * SMS Gateway Provider
 * Sends SMS via a local HTTP API (e.g., Android SMS Gateway app)
 *
 * Setup instructions:
 * 1. Install "SMS Gateway" app on your Android phone
 * 2. Configure it to expose an HTTP API (usually on port 8080)
 * 3. Set SMS_GATEWAY_URL in .env (e.g., http://192.168.1.100:8080)
 * 4. Set SMS_GATEWAY_TOKEN if the app requires authentication
 */
@Injectable()
export class SmsGatewayProvider implements SmsProvider {
  private gatewayUrl: string;
  private token?: string;

  constructor() {
    this.gatewayUrl = process.env.SMS_GATEWAY_URL || "";
    this.token = process.env.SMS_GATEWAY_TOKEN;

    if (!this.gatewayUrl) {
      console.warn("⚠️  SMS_GATEWAY_URL not found in environment variables");
      console.warn("For SMS Gateway setup:");
      console.warn("1. Install 'SMS Gateway' app on Android");
      console.warn("2. Configure HTTP API in the app");
      console.warn("3. Set SMS_GATEWAY_URL=http://YOUR_PHONE_IP:8080");
      console.warn("4. Optionally set SMS_GATEWAY_TOKEN if auth is required");
    }
  }

  async sendSms(params: {
    to: string;
    from: string;
    text: string;
    type?: "text" | "unicode";
  }): Promise<void> {
    if (!this.gatewayUrl) {
      throw new Error("SMS_GATEWAY_URL not configured");
    }

    // Format phone number (add + if not present, or keep as is depending on gateway)
    const to = params.to.startsWith("+") ? params.to : `+${params.to}`;

    try {
      const url = `${this.gatewayUrl}/send`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (this.token) {
        headers["Authorization"] = `Bearer ${this.token}`;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          phone: to,
          message: params.text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `SMS Gateway failed: ${response.status} - ${errorText}`
        );
      }

      const result = await response.json();
      if (result.error || result.status === "error") {
        throw new Error(
          `SMS Gateway error: ${result.error || result.message || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("=== SMS GATEWAY ERROR ===");
      console.error("Error:", error);
      console.error("Gateway URL:", this.gatewayUrl);
      console.error("SMS Parameters:", {
        to,
        from: params.from,
        text:
          params.text.substring(0, 100) +
          (params.text.length > 100 ? "..." : ""),
        textLength: params.text.length,
      });
      console.error("=== END SMS GATEWAY ERROR ===");
      throw error;
    }
  }
}

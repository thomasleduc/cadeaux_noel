/**
 * Interface for SMS providers
 * Allows switching between different SMS services (Twilio, Vonage, SMS Gateway, etc.)
 */
export interface SmsProvider {
  sendSms(params: {
    to: string;
    from: string;
    text: string;
    type?: "text" | "unicode";
  }): Promise<void>;
}

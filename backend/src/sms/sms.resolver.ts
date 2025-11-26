import { Resolver, Mutation, Args, ID } from "@nestjs/graphql";
import { SmsService } from "./sms.service";

@Resolver()
export class SmsResolver {
  constructor(private readonly smsService: SmsService) {}

  @Mutation(() => String)
  async sendEventSms(@Args("eventId", { type: () => ID }) eventId: string) {
    const result = await this.smsService.sendEventSms(eventId);
    return `SMS sent: ${result.success} successful, ${result.failed} failed`;
  }
}


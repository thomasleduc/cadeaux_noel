import { Resolver, Mutation, Args, ID, ObjectType, Field } from "@nestjs/graphql";
import { SmsService } from "./sms.service";

@ObjectType()
class SmsDryRunMessage {
  @Field()
  to: string;

  @Field()
  toName: string;

  @Field()
  sender: string;

  @Field()
  receiver: string;

  @Field()
  message: string;

  @Field()
  type: string;

  @Field({ nullable: true })
  error?: string;
}

@ObjectType()
class SmsDryRunSummary {
  @Field()
  total: number;

  @Field()
  success: number;

  @Field()
  failed: number;
}

@ObjectType()
class SmsDryRunResult {
  @Field(() => [SmsDryRunMessage])
  messages: SmsDryRunMessage[];

  @Field(() => SmsDryRunSummary)
  summary: SmsDryRunSummary;
}

@Resolver()
export class SmsResolver {
  constructor(private readonly smsService: SmsService) {}

  @Mutation(() => String)
  async sendEventSms(@Args("eventId", { type: () => ID }) eventId: string) {
    const result = await this.smsService.sendEventSms(eventId);
    return `SMS sent: ${result.success} successful, ${result.failed} failed`;
  }

  @Mutation(() => SmsDryRunResult)
  async dryRunSms(@Args("eventId", { type: () => ID }) eventId: string) {
    return this.smsService.dryRunSms(eventId);
  }
}


import { Module } from "@nestjs/common";
import { SmsService } from "./sms.service";
import { SmsResolver } from "./sms.resolver";
import { PersonModule } from "../person/person.module";
import { EventModule } from "../event/event.module";

@Module({
  imports: [PersonModule, EventModule],
  providers: [SmsService, SmsResolver],
  exports: [SmsService],
})
export class SmsModule {}


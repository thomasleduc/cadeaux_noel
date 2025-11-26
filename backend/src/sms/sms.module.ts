import { Module, forwardRef } from "@nestjs/common";
import { SmsService } from "./sms.service";
import { SmsResolver } from "./sms.resolver";
import { PersonModule } from "../person/person.module";
import { EventModule } from "../event/event.module";

@Module({
  imports: [PersonModule, forwardRef(() => EventModule)],
  providers: [SmsService, SmsResolver],
  exports: [SmsService],
})
export class SmsModule {}


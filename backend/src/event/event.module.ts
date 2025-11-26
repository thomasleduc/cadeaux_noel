import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EventService } from "./event.service";
import { EventResolver } from "./event.resolver";
import { Event } from "./event.entity";
import { PersonModule } from "../person/person.module";

@Module({
  imports: [TypeOrmModule.forFeature([Event]), PersonModule],
  providers: [EventService, EventResolver],
  exports: [EventService],
})
export class EventModule {}


import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PersonService } from "./person.service";
import { PersonResolver } from "./person.resolver";
import { Person } from "./person.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Person])],
  providers: [PersonService, PersonResolver],
  exports: [PersonService],
})
export class PersonModule {}

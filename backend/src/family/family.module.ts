import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FamilyService } from "./family.service";
import { FamilyResolver } from "./family.resolver";
import { Family } from "./family.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Family])],
  providers: [FamilyService, FamilyResolver],
  exports: [FamilyService],
})
export class FamilyModule {}


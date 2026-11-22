import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Family, CreateFamilyInput, UpdateFamilyInput } from "./family.entity";

@Injectable()
export class FamilyService {
  constructor(
    @InjectRepository(Family)
    private familyRepository: Repository<Family>
  ) {}

  async create(createFamilyInput: CreateFamilyInput): Promise<Family> {
    const family = this.familyRepository.create(createFamilyInput);
    return this.familyRepository.save(family);
  }

  async findAll(): Promise<Family[]> {
    return this.familyRepository.find({
      relations: ["members"],
    });
  }

  async findOne(id: string): Promise<Family | null> {
    return this.familyRepository.findOne({
      where: { id },
      relations: ["members"],
    });
  }

  async update(updateFamilyInput: UpdateFamilyInput): Promise<Family> {
    const { id, ...updateData } = updateFamilyInput;
    await this.familyRepository.update(id, updateData);
    const family = await this.findOne(id);
    if (!family) {
      throw new Error(`Family with ID ${id} not found`);
    }
    return family;
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.familyRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}

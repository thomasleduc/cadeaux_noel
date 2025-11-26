import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Person, CreatePersonInput, UpdatePersonInput } from "./person.entity";

@Injectable()
export class PersonService {
  constructor(
    @InjectRepository(Person)
    private personRepository: Repository<Person>
  ) {}

  async create(createPersonInput: CreatePersonInput): Promise<Person> {
    const person = this.personRepository.create(createPersonInput);
    return this.personRepository.save(person);
  }

  async findAll(): Promise<Person[]> {
    return this.personRepository.find({
      relations: ["family", "assistant"],
    });
  }

  async findOne(id: string): Promise<Person | null> {
    return this.personRepository.findOne({
      where: { id },
      relations: ["family", "assistant"],
    });
  }

  async update(updatePersonInput: UpdatePersonInput): Promise<Person> {
    const { id, ...updateData } = updatePersonInput;
    await this.personRepository.update(id, updateData);
    const person = await this.findOne(id);
    if (!person) {
      throw new Error(`Person with ID ${id} not found`);
    }
    return person;
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.personRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}


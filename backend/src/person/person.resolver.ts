import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { PersonService } from "./person.service";
import { Person, CreatePersonInput, UpdatePersonInput } from "./person.entity";

@Resolver(() => Person)
export class PersonResolver {
  constructor(private readonly personService: PersonService) {}

  @Mutation(() => Person)
  createPerson(@Args("input") createPersonInput: CreatePersonInput) {
    return this.personService.create(createPersonInput);
  }

  @Query(() => [Person], { name: "persons" })
  findAll() {
    return this.personService.findAll();
  }

  @Query(() => Person, { name: "person" })
  findOne(@Args("id", { type: () => ID }) id: string) {
    return this.personService.findOne(id);
  }

  @Mutation(() => Person)
  updatePerson(@Args("input") updatePersonInput: UpdatePersonInput) {
    return this.personService.update(updatePersonInput);
  }

  @Mutation(() => Boolean)
  async removePerson(@Args("id", { type: () => ID }) id: string) {
    return this.personService.remove(id);
  }
}

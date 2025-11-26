import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { FamilyService } from "./family.service";
import { Family, CreateFamilyInput, UpdateFamilyInput } from "./family.entity";

@Resolver(() => Family)
export class FamilyResolver {
  constructor(private readonly familyService: FamilyService) {}

  @Mutation(() => Family)
  createFamily(@Args("input") createFamilyInput: CreateFamilyInput) {
    return this.familyService.create(createFamilyInput);
  }

  @Query(() => [Family], { name: "families" })
  findAll() {
    return this.familyService.findAll();
  }

  @Query(() => Family, { name: "family" })
  findOne(@Args("id", { type: () => ID }) id: string) {
    return this.familyService.findOne(id);
  }

  @Mutation(() => Family)
  updateFamily(@Args("input") updateFamilyInput: UpdateFamilyInput) {
    return this.familyService.update(updateFamilyInput);
  }

  @Mutation(() => Boolean)
  async removeFamily(@Args("id", { type: () => ID }) id: string) {
    return this.familyService.remove(id);
  }
}


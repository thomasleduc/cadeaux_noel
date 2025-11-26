import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { EventService } from "./event.service";
import { Event, CreateEventInput, UpdateEventInput } from "./event.entity";

@Resolver(() => Event)
export class EventResolver {
  constructor(private readonly eventService: EventService) {}

  @Mutation(() => Event)
  createEvent(@Args("input") createEventInput: CreateEventInput) {
    return this.eventService.create(createEventInput);
  }

  @Query(() => [Event], { name: "events" })
  findAll() {
    return this.eventService.findAll();
  }

  @Query(() => Event, { name: "event" })
  findOne(@Args("id", { type: () => ID }) id: string) {
    return this.eventService.findOne(id);
  }

  @Mutation(() => Event)
  updateEvent(@Args("input") updateEventInput: UpdateEventInput) {
    return this.eventService.update(updateEventInput);
  }

  @Mutation(() => Boolean)
  async removeEvent(@Args("id", { type: () => ID }) id: string) {
    return this.eventService.remove(id);
  }

  @Mutation(() => Event)
  async generateDraw(
    @Args("eventId", { type: () => ID }) eventId: string,
    @Args("isDryRun", { type: () => Boolean, nullable: true, defaultValue: true })
    isDryRun: boolean
  ) {
    return this.eventService.generateDraw(eventId, isDryRun);
  }

  @Mutation(() => Event)
  async confirmDraw(@Args("eventId", { type: () => ID }) eventId: string) {
    return this.eventService.confirmDraw(eventId);
  }

  @Mutation(() => Event)
  addPersonToEvent(
    @Args("eventId", { type: () => ID }) eventId: string,
    @Args("personId", { type: () => ID }) personId: string
  ) {
    return this.eventService.addParticipant(eventId, personId);
  }

  @Mutation(() => Event)
  removePersonFromEvent(
    @Args("eventId", { type: () => ID }) eventId: string,
    @Args("personId", { type: () => ID }) personId: string
  ) {
    return this.eventService.removeParticipant(eventId, personId);
  }
}


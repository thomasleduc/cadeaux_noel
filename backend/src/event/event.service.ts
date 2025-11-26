import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Event, CreateEventInput, UpdateEventInput, EventStatus } from "./event.entity";
import { PersonService } from "../person/person.service";

const EVENT_RELATIONS: string[] = [
  "participants",
  "participants.family",
  "participants.assistant",
];

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    private personService: PersonService
  ) {}

  async create(createEventInput: CreateEventInput): Promise<Event> {
    const event = this.eventRepository.create({
      ...createEventInput,
      status: EventStatus.DRAFT,
      smsTemplate:
        createEventInput.smsTemplate ||
        "Hello {sender}, this is Santa Claus. This year you should give a gift to {receiver}",
      assistantSmsTemplate:
        createEventInput.assistantSmsTemplate ||
        "Hello {assistant}, this is Santa Claus. This year {sender} should give a gift to {receiver}",
    });
    return this.eventRepository.save(event);
  }

  async findAll(): Promise<Event[]> {
    const events = await this.eventRepository.find({
      relations: EVENT_RELATIONS,
    });
    // Migrate old events without status to DRAFT
    for (const event of events) {
      if (!event.status) {
        event.status = EventStatus.DRAFT;
        await this.eventRepository.save(event);
      }
    }
    return events;
  }

  async findOne(id: string): Promise<Event | null> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: EVENT_RELATIONS,
    });
    // Migrate old events without status to DRAFT
    if (event && !event.status) {
      event.status = EventStatus.DRAFT;
      await this.eventRepository.save(event);
    }
    return event;
  }

  async update(updateEventInput: UpdateEventInput): Promise<Event> {
    const { id, ...updateData } = updateEventInput;
    const event = await this.findOne(id);
    if (!event) {
      throw new Error(`Event with ID ${id} not found`);
    }

    // If updating templates or name, reset to draft if not already draft
    if (updateData.smsTemplate || updateData.assistantSmsTemplate || updateData.name) {
      const currentStatus = event.status || EventStatus.DRAFT;
      if (currentStatus !== EventStatus.DRAFT) {
        event.status = EventStatus.DRAFT;
        event.drawResult = null; // Clear draw result when editing
      }
    }

    Object.assign(event, updateData);
    return this.eventRepository.save(event);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.eventRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async addParticipant(eventId: string, personId: string): Promise<Event> {
    const event = await this.findOne(eventId);
    if (!event) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    const person = await this.personService.findOne(personId);
    if (!person) {
      throw new Error(`Person with ID ${personId} not found`);
    }

    event.participants = event.participants || [];
    const alreadyAdded = event.participants.some((participant) => participant.id === person.id);
    if (!alreadyAdded) {
      event.participants.push(person);
      event.drawResult = null;
      // Reset to draft when participants change
      const currentStatus = event.status || EventStatus.DRAFT;
      if (currentStatus !== EventStatus.DRAFT) {
        event.status = EventStatus.DRAFT;
      }
    }

    return this.eventRepository.save(event);
  }

  async removeParticipant(eventId: string, personId: string): Promise<Event> {
    const event = await this.findOne(eventId);
    if (!event) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    const originalLength = event.participants?.length ?? 0;
    event.participants = (event.participants || []).filter((participant) => participant.id !== personId);

    if ((event.participants?.length ?? 0) !== originalLength) {
      event.drawResult = null;
      // Reset to draft when participants change
      const currentStatus = event.status || EventStatus.DRAFT;
      if (currentStatus !== EventStatus.DRAFT) {
        event.status = EventStatus.DRAFT;
      }
    }

    return this.eventRepository.save(event);
  }

  /**
   * Mark event as ready (confirmed for draw)
   */
  async markAsReady(eventId: string): Promise<Event> {
    const event = await this.findOne(eventId);
    if (!event) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    // Handle old events without status
    const currentStatus = event.status || EventStatus.DRAFT;
    if (currentStatus !== EventStatus.DRAFT) {
      throw new Error(`Event must be in DRAFT status to be marked as READY. Current status: ${currentStatus}`);
    }

    if (!event.participants || event.participants.length < 2) {
      throw new Error("Need at least 2 participants to mark event as ready.");
    }

    event.status = EventStatus.READY;
    return this.eventRepository.save(event);
  }

  /**
   * Generate a secret santa draw ensuring people in the same family don't get each other
   */
  async generateDraw(eventId: string): Promise<Event> {
    const event = await this.findOne(eventId);
    if (!event) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    // Handle old events without status
    const currentStatus = event.status || EventStatus.DRAFT;
    if (currentStatus !== EventStatus.READY) {
      throw new Error(`Event must be in READY status to generate a draw. Current status: ${currentStatus}`);
    }

    const persons = event.participants || [];

    if (persons.length < 2) {
      throw new Error("Need at least 2 people to generate a draw");
    }

    // Shuffle array function
    const shuffle = <T>(array: T[]): T[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    // Try to generate a valid draw (max 100 attempts)
    let drawResult: Record<string, string> | null = null;
    let attempts = 0;
    const maxAttempts = 100;

    while (!drawResult && attempts < maxAttempts) {
      attempts++;
      const shuffled = shuffle(persons);
      const tempDraw: Record<string, string> = {};
      let isValid = true;

      for (let i = 0; i < persons.length; i++) {
        const sender = persons[i];
        let receiver = shuffled[i];

        // Can't give to yourself
        if (sender.id === receiver.id) {
          isValid = false;
          break;
        }

        // Can't give to someone in the same family (exclusion rule)
        if (sender.familyId && receiver.familyId && sender.familyId === receiver.familyId) {
          isValid = false;
          break;
        }

        tempDraw[sender.id] = receiver.id;
      }

      if (isValid) {
        drawResult = tempDraw;
      }
    }

    if (!drawResult) {
      throw new Error("Could not generate a valid draw. Try again or check family constraints.");
    }

    // Update event with draw result and set status to DRAWN
    event.drawResult = drawResult;
    event.status = EventStatus.DRAWN;

    return this.eventRepository.save(event);
  }

  /**
   * Mark event as completed (SMS sent)
   */
  async markAsCompleted(eventId: string): Promise<Event> {
    const event = await this.findOne(eventId);
    if (!event) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    // Handle old events without status
    const currentStatus = event.status || EventStatus.DRAFT;
    if (currentStatus !== EventStatus.DRAWN) {
      throw new Error(`Event must be in DRAWN status to be marked as COMPLETED. Current status: ${currentStatus}`);
    }

    if (!event.drawResult) {
      throw new Error("No draw result found. Please generate a draw first.");
    }

    event.status = EventStatus.COMPLETED;
    return this.eventRepository.save(event);
  }
}


import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { ObjectType, Field, ID, InputType, registerEnumType } from "@nestjs/graphql";
import { GraphQLJSONObject } from "graphql-type-json";
import { Person } from "../person/person.entity";

export enum EventStatus {
  DRAFT = "draft",
  READY = "ready",
  DRAWN = "drawn",
  COMPLETED = "completed",
}

registerEnumType(EventStatus, {
  name: "EventStatus",
});

@ObjectType()
@Entity("events")
export class Event {
  @Field(() => ID)
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Field()
  @Column()
  name: string;

  @Field(() => EventStatus, { nullable: true })
  @Column({
    type: "enum",
    enum: EventStatus,
    default: EventStatus.DRAFT,
    nullable: true,
  })
  status: EventStatus | null;

  @Field(() => GraphQLJSONObject, { nullable: true })
  @Column("jsonb", { nullable: true })
  drawResult: Record<string, string> | null; // Map of senderId -> receiverId

  @Field()
  @Column({ type: "text" })
  smsTemplate: string; // Template with {sender} and {receiver}

  @Field()
  @Column({ type: "text" })
  assistantSmsTemplate: string; // Template with {assistant}, {sender}, and {receiver}

  @Field(() => [Person], { nullable: true })
  @ManyToMany(() => Person, (person) => person.events, { cascade: false })
  @JoinTable({
    name: "event_participants",
    joinColumn: { name: "event_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "person_id", referencedColumnName: "id" },
  })
  participants: Person[];

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}

@InputType()
export class CreateEventInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  smsTemplate?: string;

  @Field({ nullable: true })
  assistantSmsTemplate?: string;
}

@InputType()
export class UpdateEventInput {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  smsTemplate?: string;

  @Field({ nullable: true })
  assistantSmsTemplate?: string;

}


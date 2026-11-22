import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from "typeorm";
import { Family } from "../family/family.entity";
import { ObjectType, Field, ID, InputType } from "@nestjs/graphql";
import { Event } from "../event/event.entity";

@ObjectType()
@Entity("persons")
export class Person {
  @Field(() => ID)
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Field()
  @Column()
  firstName: string;

  @Field()
  @Column()
  lastName: string;

  @Field()
  @Column({ unique: true })
  slug: string;

  @Field(() => String, { nullable: true })
  @Column({ type: "varchar", length: 32, nullable: true })
  phoneNumber: string | null;

  @Field(() => ID, { nullable: true })
  @Column({ type: "uuid", nullable: true })
  assistantId: string | null;

  @Field(() => Person, { nullable: true })
  @ManyToOne(() => Person, { nullable: true })
  @JoinColumn({ name: "assistantId" })
  assistant: Person | null;

  @Field(() => ID, { nullable: true })
  @Column({ type: "uuid", nullable: true })
  familyId: string | null;

  @Field(() => Family, { nullable: true })
  @ManyToOne(() => Family, (family) => family.members, { nullable: true })
  @JoinColumn({ name: "familyId" })
  family: Family | null;

  @Field(() => [Event], { nullable: true })
  @ManyToMany(() => Event, (event) => event.participants)
  events?: Event[];

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}

@InputType()
export class CreatePersonInput {
  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field()
  slug: string;

  @Field({ nullable: true })
  phoneNumber?: string;

  @Field(() => ID, { nullable: true })
  assistantId?: string;

  @Field(() => ID, { nullable: true })
  familyId?: string;
}

@InputType()
export class UpdatePersonInput {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field({ nullable: true })
  slug?: string;

  @Field({ nullable: true })
  phoneNumber?: string;

  @Field(() => ID, { nullable: true })
  assistantId?: string;

  @Field(() => ID, { nullable: true })
  familyId?: string;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Person } from "../person/person.entity";
import { ObjectType, Field, ID, InputType } from "@nestjs/graphql";

@ObjectType()
@Entity("families")
export class Family {
  @Field(() => ID)
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Field()
  @Column()
  name: string;

  @Field(() => [Person])
  @OneToMany(() => Person, (person) => person.family)
  members: Person[];

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}

@InputType()
export class CreateFamilyInput {
  @Field()
  name: string;
}

@InputType()
export class UpdateFamilyInput {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  name?: string;
}


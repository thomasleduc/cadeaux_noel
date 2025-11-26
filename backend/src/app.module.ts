import { Module } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { TypeOrmModule } from "@nestjs/typeorm";
import { join } from "path";
import { Person } from "./person/person.entity";
import { Family } from "./family/family.entity";
import { Event } from "./event/event.entity";
import { PersonModule } from "./person/person.module";
import { FamilyModule } from "./family/family.module";
import { EventModule } from "./event/event.module";
import { SmsModule } from "./sms/sms.module";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432", 10),
      username: process.env.DB_USERNAME || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      database: process.env.DB_NAME || "secret_santa",
      entities: [Person, Family, Event],
      synchronize: process.env.NODE_ENV !== "production", // Only in development
      logging: process.env.NODE_ENV === "development",
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), "src/schema.gql"),
      sortSchema: true,
      playground: true,
    }),
    PersonModule,
    FamilyModule,
    EventModule,
    SmsModule,
  ],
})
export class AppModule {}

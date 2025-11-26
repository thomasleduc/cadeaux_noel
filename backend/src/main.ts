import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  const allowedOrigins = (
    process.env.FRONTEND_URLS ||
    process.env.FRONTEND_URL ||
    "http://localhost:3000,http://localhost:3001"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 4000);
  console.log(
    `🚀 Server is running on: http://localhost:${process.env.PORT ?? 4000}`
  );
  console.log(
    `📊 GraphQL Playground: http://localhost:${process.env.PORT ?? 4000}/graphql`
  );
}

void bootstrap();

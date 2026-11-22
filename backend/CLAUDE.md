# Backend (NestJS + GraphQL)

## Layout

One Nest module per domain in `src/`: `person/`, `family/`, `event/`, `sms/`. Each has an `*.entity.ts` (TypeORM entity, also the GraphQL `@ObjectType` and its `@InputType`s), a `*.service.ts` and a `*.resolver.ts`.

- GraphQL is code-first. `src/schema.gql` is generated at startup, so don't edit it by hand.
- `EventService` and `SmsService` depend on each other through `forwardRef`. Keep that when changing their constructors.
- The draw algorithm is `EventService.generateDraw`. It shuffles at random and retries until no one gets themselves or someone from their own family.

## Configuration

- `.env` in `backend/` is loaded by `dotenv` in `main.ts`. It holds `DB_*`, `PORT`, `FRONTEND_URL` and the SMS provider variables.
- TypeORM runs with `synchronize: true` unless `NODE_ENV=production`, so entity changes alter the local DB schema on startup. There are no migrations.

## SMS

- The provider is picked in the `SmsService` constructor, in this order: `SMS_GATEWAY_URL` (an Android phone running an HTTP SMS gateway), then `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN`, then Vonage as the fallback.
- Providers implement `SmsProvider` (`src/sms/sms-provider.interface.ts`) and live in `src/sms/providers/`.
- Templates support `{sender}`, `{receiver}` and `{assistant}` (full name) as well as `{sender.firstName}`, `{receiver.slug}` and similar.
- Phone numbers are validated as E.164 with 11 digits (French `+33…` numbers).
- `src/sms/README.md` covers setting up each provider.

## Commands

```bash
yarn start:dev   # needs PostgreSQL running
yarn build
yarn test        # jest; tests are minimal
npx eslint "src/**/*.ts"   # `yarn lint` auto-fixes and rewrites files
```

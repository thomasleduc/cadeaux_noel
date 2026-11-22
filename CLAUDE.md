# Secret Santa SMS Dashboard

Monorepo for running a family Secret Santa draw and notifying everyone by SMS.

- `backend/`: NestJS + GraphQL (Apollo, code-first) + TypeORM/PostgreSQL. Port 4000. See `backend/CLAUDE.md`.
- `frontend/`: Next.js (App Router) + Apollo Client + Tailwind. Port 3001. See `frontend/CLAUDE.md`.
- `scripts/setup_postgres_mac.sh`: installs and starts PostgreSQL through Homebrew.

Each app has its own `yarn.lock` (Yarn 1). Install with `yarn install:all` from the root.

## Commands

```bash
yarn dev:backend      # nest start --watch
yarn dev:frontend     # next dev
yarn build:backend
yarn build:frontend   # also runs the TypeScript check; must pass before pushing
cd backend && yarn test
```

## Domain

- **Person**: firstName, lastName, slug, phoneNumber. Can have an optional `assistant` (another Person who gets the SMS for them, e.g. a child) and an optional `family`.
- **Family**: people in the same family are never drawn for each other.
- **Event**: e.g. "Noël 2026". Holds participants, the two SMS templates and `drawResult` (JSON map `senderId -> receiverId`).
- Event lifecycle: `DRAFT -> READY -> DRAWN -> COMPLETED`. Editing the name, the templates or the participants resets the event to `DRAFT` and clears the draw.

## Conventions

- The whole repo uses Prettier with double quotes, semicolons, `trailingComma: es5` and width 80 (`.prettierrc` in each app).
- Commit messages use gitmoji shortcodes, e.g. `:sparkles: Resend sms`, `:bug: ...`.
- Never commit `.env` files. They hold the DB and SMS provider credentials.

## Gotchas

- `backend`'s `yarn lint` runs `eslint --fix` and rewrites files. Use `npx eslint "src/**/*.ts"` to lint without changing anything.
- SMS sending costs money and reaches real phones. Test with the dry-run mutation (`dryRunSms`) first, and don't call `sendSms`/`resendEventSms` unless asked to.

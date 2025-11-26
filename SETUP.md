# Setup Instructions

## Quick Start

### 1. Install Dependencies

```bash
# Install all dependencies (root, backend, frontend)
yarn install:all
```

Or manually:

```bash
yarn install
cd backend && yarn install
cd ../frontend && yarn install
```

### 2. Database Setup

Make sure PostgreSQL is running and create the database:

```bash
createdb secret_santa
```

### 3. Configure Environment Variables

**Backend:**

```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
```

Required variables:

- Database credentials (DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME)
- Vonage API credentials (VONAGE_API_KEY, VONAGE_API_SECRET, VONAGE_FROM_NUMBER)

**Frontend:**

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local if needed (default should work)
```

### 4. Start Development Servers

**Terminal 1 - Backend:**

```bash
cd backend
yarn start:dev
```

Backend will run on `http://localhost:4000`
GraphQL Playground: `http://localhost:4000/graphql`

**Terminal 2 - Frontend:**

```bash
cd frontend
yarn dev
```

Frontend will run on `http://localhost:3001`

## Project Structure

```
secret-santa/
├── backend/              # NestJS GraphQL API
│   ├── src/
│   │   ├── person/       # Person management
│   │   ├── family/       # Family management
│   │   ├── event/        # Event management & draw generation
│   │   └── sms/          # SMS sending via Vonage
│   └── .env
├── frontend/             # Next.js frontend
│   ├── app/
│   │   ├── people/       # People management page
│   │   └── ...
│   └── lib/
│       └── apollo-client.ts
└── README.md
```

## Features Implemented

✅ **People Management**

- Add people with firstName, lastName, slug, phoneNumber
- Optional assistant for people without phones
- Optional family assignment

✅ **Family Management**

- Create families
- Family members won't be matched together in draws

✅ **Event Management**

- Create events (e.g., "Christmas 2025")
- Custom SMS templates
- Generate Secret Santa draws with family constraints
- Dry-run mode for testing
- Confirm and send SMS

✅ **SMS Integration**

- Two template types:
  - Regular: `{sender}` and `{receiver}`
  - Assistant: `{assistant}`, `{sender}`, and `{receiver}`
- Vonage (Nexmo) API integration

## Next Steps

1. Add more frontend pages for Families and Events
2. Add edit/delete functionality for people
3. Add visualization for draw results
4. Add error handling and validation
5. Add tests

## Notes

- Database uses `synchronize: true` in development (auto-creates tables)
- In production, set `NODE_ENV=production` and use migrations
- Vonage API requires valid credentials to send SMS
- Phone numbers should be in E.164 format (e.g., +33612345678)

## Quick install on mac

### Automatic script

```bash
# Run from the project root (file already executable)
./scripts/setup_postgres_mac.sh
```

Optional environment variables:

- `POSTGRES_VERSION` (default `16`)
- `DB_NAME` (default `secret_santa`)
- `DB_USER` (default `postgres`)
- `DB_PASSWORD` (default `postgres`)

The script installs PostgreSQL via Homebrew if needed, starts the service, ensures the role/database exist, and reminds you to persist the PATH update.

### Manual steps

1. **Install Homebrew (skip if already done)**

   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install PostgreSQL 16**

   ```bash
   brew install postgresql@16
   ```

3. **Add PostgreSQL to your PATH**

   ```bash
   echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```

   (Use `/usr/local` instead of `/opt/homebrew` on Intel Macs.)

4. **Start PostgreSQL as a background service**

   ```bash
   brew services start postgresql@16
   ```

5. **Create the project database**

   ```bash
   createdb secret_santa
   ```

6. **Verify everything works**

   ```bash
   psql secret_santa -c "\dt"
   ```

   If you see “Did not find any relations.” the database is ready.

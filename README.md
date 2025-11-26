# Secret Santa SMS Dashboard

A full-stack application for managing Secret Santa events with SMS notifications.

## Tech Stack

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS, Apollo Client
- **Backend**: NestJS, TypeScript, Apollo GraphQL, TypeORM
- **Database**: PostgreSQL
- **SMS**: Vonage (formerly Nexmo)

## Prerequisites

- Node.js 18+ and Yarn
- PostgreSQL database
- Vonage account and API credentials

## Setup

### 1. Database Setup

Create a PostgreSQL database:

```bash
createdb secret_santa
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your database and Vonage credentials
yarn install
yarn start:dev
```

The GraphQL playground will be available at `http://localhost:4000/graphql`

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local if needed (default should work)
yarn install
yarn dev
```

The frontend will be available at `http://localhost:3001`

## Environment Variables

### Backend (.env)

- `DB_HOST`: PostgreSQL host (default: localhost)
- `DB_PORT`: PostgreSQL port (default: 5432)
- `DB_USERNAME`: PostgreSQL username (default: postgres)
- `DB_PASSWORD`: PostgreSQL password (default: postgres)
- `DB_NAME`: Database name (default: secret_santa)
- `PORT`: Backend server port (default: 4000)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:3001)
- `VONAGE_API_KEY`: Your Vonage API key
- `VONAGE_API_SECRET`: Your Vonage API secret
- `VONAGE_FROM_NUMBER`: Sender name/number for SMS

### Frontend (.env.local)

- `NEXT_PUBLIC_GRAPHQL_URL`: GraphQL endpoint (default: http://localhost:4000/graphql)

## Features

- **People Management**: Add, edit, and manage people with names, phone numbers, and assistants
- **Family Management**: Create families to ensure family members don't get matched together
- **Event Management**: Create events (e.g., "Christmas 2025") with custom SMS templates
- **Secret Santa Draw**: Generate draws with family constraints
- **Dry Run**: Test draws before sending SMS
- **SMS Sending**: Send SMS notifications via Vonage API

## Project Structure

```
secret-santa/
├── backend/          # NestJS backend
│   ├── src/
│   │   ├── person/   # Person entity, service, resolver
│   │   ├── family/   # Family entity, service, resolver
│   │   ├── event/    # Event entity, service, resolver
│   │   └── sms/      # SMS service and resolver
│   └── .env
├── frontend/         # Next.js frontend
│   ├── app/          # Next.js app directory
│   └── .env.local
└── README.md
```

## Development

- Backend runs on port 4000
- Frontend runs on port 3001
- GraphQL schema is auto-generated in `backend/src/schema.gql`

## License

Private project


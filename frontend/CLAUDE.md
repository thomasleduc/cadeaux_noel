# Frontend (Next.js + Apollo Client)

- App Router. Each page is one large client component (`"use client"`): `app/people`, `app/families`, `app/events`.
- GraphQL documents are declared inline with `gql` at the top of each page. There's no codegen.
- Apollo Client 4: import hooks from `@apollo/client/react`, not from `@apollo/client`.
- The client is in `lib/apollo-client.ts`. Its endpoint comes from `NEXT_PUBLIC_GRAPHQL_URL` (default `http://localhost:4000/graphql`).
- Styling is done with Tailwind CSS v4 utility classes.

## Typing

`yarn build` runs a strict type check. Always give `useQuery`/`useMutation` a result type (`useQuery<{ families: FamilyRow[] }>(...)`), otherwise `data` is typed `{}` and the build fails.

GraphQL enums come back UPPERCASE (`DRAFT`). The UI lowercases them before comparing them with the local `EventStatus` type.

## Commands

```bash
yarn dev     # port 3001
yarn build   # must pass before pushing
yarn lint
```

# Backend Contract Tests

This directory is reserved for Flutter-facing backend contract tests. The helper in `test-app.ts` boots the Nest app with test configuration and a SQLite database URL so contract specs do not depend on shared `prisma/dev.db` data.

## App Bootstrapping

Use `createContractTestApp()` from `test-app.ts` in each contract spec. The helper:

- Sets `NODE_ENV=test` when it is not already set.
- Sets `AUTO_SEED_DEMO_DATA=false` when it is not already set.
- Uses `options.databaseUrl` when the caller provides one.
- Uses the current `DATABASE_URL` only when it is present and does not point to an obvious development database such as `file:./dev.db`, `file:dev.db`, `file:../dev.db`, or `prisma/dev.db`.
- Otherwise sets `DATABASE_URL` to the contract-test SQLite file under this directory.
- Applies the `/api` global prefix, validation pipe, avatar URL interceptor, CORS, and `/uploads` static asset prefix used by API-facing tests.
- Returns the Nest app, `PrismaService`, resolved `databaseUrl`, and a `cleanup()` function.

`AppModule` currently loads `.env` directly, so the helper imports it only after assigning test environment variables. Contract specs that need a specific database should pass `options.databaseUrl` or set `process.env.DATABASE_URL` before calling `createContractTestApp()`. Do not point contract specs at `prisma/dev.db`.

## Data Setup Rules

Each contract spec owns the records it seeds and must clean them up before the spec exits. Do not rely on records from development seed data or from another spec.

Use unique values per spec run for every field with uniqueness or human-facing identity. A timestamp plus a short random suffix is enough. In particular, use unique phone numbers, order numbers, request numbers, invitation codes when applicable, upload filenames, and conversation message content markers.

Seed related records in dependency order:

- Client: create a `ClientUser` with a unique phone and an explicit active status.
- Technician: create a `Technician` with a unique phone and invitation code.
- Binding: create a `ClientTechBinding` for the client and technician; mark only one binding default for that client.
- Address: create `ClientAddress` records owned by the seeded client; set only one default address unless the test is checking default switching.
- Order: create the required `Customer` first, then create `Order` records with a unique `orderNo` and links to the seeded technician, customer, client, and address when needed.
- Conversation: create one `Conversation` for the seeded client and technician, then create `Message` records under that conversation.
- Upload: write uploaded files under the test uploads directory and assert on returned URLs or paths; remove created files during cleanup.

Cleanup should delete records in reverse dependency order: messages, conversations, orders, design requests or custom service requests, addresses, bindings, customers, clients, technicians, and uploaded files. Prefer deleting by the unique values generated for the spec so cleanup does not affect unrelated data.

The current Jest config uses `rootDir: "src"`, so files under `backend/test/contracts` are not picked up by `npm test` yet. Do not change Jest or package configuration as part of the harness task.

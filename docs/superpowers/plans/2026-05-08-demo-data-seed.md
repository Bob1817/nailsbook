# Demo Data Seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an idempotent development demo seed that populates realistic technician, client, booking, revenue, message, and platform-side admin data through both startup auto-seeding and a manual npm command.

**Architecture:** Keep the existing auth fixture service narrow and add a shared demo seed helper used by a thin Nest startup service and a standalone script entrypoint. Seed records are keyed by fixed phones, codes, and document numbers so repeated execution updates or reuses existing data instead of duplicating it.

**Tech Stack:** NestJS, Prisma, Jest, TypeScript

---

### Task 1: Add test coverage for startup gating

**Files:**
- Create: `backend/src/development-demo-seed.service.spec.ts`
- Create: `backend/src/development-demo-seed.service.ts`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run the new spec and verify it fails because the service does not exist**
- [ ] **Step 3: Implement the thin startup service with development-only gating and demo seed toggle**
- [ ] **Step 4: Run the new spec and verify it passes**

### Task 2: Add test coverage for core demo seed orchestration

**Files:**
- Create: `backend/src/demo-data.seed.spec.ts`
- Create: `backend/src/demo-data.seed.ts`

- [ ] **Step 1: Write a failing unit test for stable core entities and idempotent lookups**
- [ ] **Step 2: Run the spec and verify it fails because the helper does not exist**
- [ ] **Step 3: Implement the shared demo seed helper with fixed keys and realistic dataset**
- [ ] **Step 4: Run the spec and verify it passes**

### Task 3: Wire auto/manual entrypoints

**Files:**
- Modify: `backend/src/app.module.ts`
- Create: `backend/src/scripts/seed-demo.ts`
- Modify: `backend/package.json`

- [ ] **Step 1: Register the startup service in the Nest app module**
- [ ] **Step 2: Add a manual `seed:demo` package script backed by the standalone script**
- [ ] **Step 3: Smoke-check the script compiles through Jest/build verification**

### Task 4: Verify

**Files:**
- Test: `backend/src/development-demo-seed.service.spec.ts`
- Test: `backend/src/demo-data.seed.spec.ts`

- [ ] **Step 1: Run the targeted Jest specs**
- [ ] **Step 2: If needed, run a focused build check for backend TypeScript compilation**
- [ ] **Step 3: Report residual risks, especially any runtime-only data-shape assumptions not covered by unit tests**

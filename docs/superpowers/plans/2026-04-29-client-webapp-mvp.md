# Client WebApp MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the client-facing nail booking WebApp MVP and connect it to the existing backend and technician workflow.

**Architecture:** Add a new `client-frontend` React/Vite mobile WebApp, add client-domain modules to the existing NestJS backend, and extend the current booking chain instead of creating a second booking system. Client auth, binding, address, design, and message data stay in new client tables; booking fulfillment continues through the existing `Booking` entity with minimal field extensions.

**Tech Stack:** React, Vite, TypeScript, React Router, Axios, NestJS, Prisma, SQLite, local multipart file upload

---

## File Structure

### New frontend project

- Create: `client-frontend/package.json`
- Create: `client-frontend/tsconfig.json`
- Create: `client-frontend/vite.config.ts`
- Create: `client-frontend/src/main.tsx`
- Create: `client-frontend/src/App.tsx`
- Create: `client-frontend/src/index.css`
- Create: `client-frontend/src/contexts/AuthContext.tsx`
- Create: `client-frontend/src/components/ProtectedRoute.tsx`
- Create: `client-frontend/src/components/TabBar.tsx`
- Create: `client-frontend/src/layouts/MainLayout.tsx`
- Create: `client-frontend/src/pages/InvitePage.tsx`
- Create: `client-frontend/src/pages/LoginPage.tsx`
- Create: `client-frontend/src/pages/HomePage.tsx`
- Create: `client-frontend/src/pages/BookingsPage.tsx`
- Create: `client-frontend/src/pages/CreateBookingPage.tsx`
- Create: `client-frontend/src/pages/BookingDetailPage.tsx`
- Create: `client-frontend/src/pages/DesignsPage.tsx`
- Create: `client-frontend/src/pages/CreateDesignPage.tsx`
- Create: `client-frontend/src/pages/DesignDetailPage.tsx`
- Create: `client-frontend/src/pages/ChatPage.tsx`
- Create: `client-frontend/src/pages/ProfilePage.tsx`
- Create: `client-frontend/src/pages/AddressListPage.tsx`
- Create: `client-frontend/src/pages/AddressEditPage.tsx`
- Create: `client-frontend/src/services/api.ts`
- Create: `client-frontend/src/services/auth.ts`
- Create: `client-frontend/src/services/home.ts`
- Create: `client-frontend/src/services/bookings.ts`
- Create: `client-frontend/src/services/designs.ts`
- Create: `client-frontend/src/services/messages.ts`
- Create: `client-frontend/src/services/addresses.ts`
- Create: `client-frontend/src/services/uploads.ts`

### Backend core

- Modify: `backend/prisma/schema.prisma`
- Create: `backend/src/client-auth/*`
- Create: `backend/src/client-home/*`
- Create: `backend/src/client-bookings/*`
- Create: `backend/src/client-designs/*`
- Create: `backend/src/client-messages/*`
- Create: `backend/src/client-addresses/*`
- Create: `backend/src/client-upload/*`
- Modify: `backend/src/app.module.ts`
- Modify: `backend/src/main.ts`
- Modify: `backend/src/bookings/bookings.service.ts`

### Verification targets

- Test/Build: `backend`
- Test/Build: `client-frontend`
- Regression build: `technician-frontend`
- Regression build: `admin-frontend`

### Task 1: Extend Prisma schema for the client domain

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_client_webapp_mvp/*`

- [ ] **Step 1: Add client-domain models and booking extensions**

Add Prisma models for:

```prisma
model ClientUser {
  id        Int      @id @default(autoincrement())
  nickname  String?
  phone     String   @unique
  avatarUrl String?
  status    String   @default("active")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ClientTechBinding {
  id         Int      @id @default(autoincrement())
  clientId   Int      @unique
  techId     Int
  inviteCode String?
  bindSource String
  createdAt  DateTime @default(now())
}
```

Also add the remaining tables from the spec:

- `ClientAddress`
- `NailWork`
- `ClientDesignRequest`
- `Conversation`
- `Message`

Extend `Booking` with the client-facing fields:

```prisma
clientUserId    Int?
addressId       Int?
designRequestId Int?
serviceType     String?
remark          String?
quotePrice      Float?
depositAmount   Float?   @default(0)
depositStatus   String?  @default("pending")
source          String?  @default("technician")
```

- [ ] **Step 2: Run Prisma format and create migration**

Run:

```bash
cd /Users/shibo/Documents/Codex/nailBook/backend
npx prisma format
npx prisma migrate dev --name client_webapp_mvp
```

Expected:

- schema formats successfully
- a new migration is generated
- Prisma client regenerates without schema errors

- [ ] **Step 3: Verify the new schema compiles through backend build**

Run:

```bash
cd /Users/shibo/Documents/Codex/nailBook/backend
npm run build
```

Expected:

- Nest build completes
- no Prisma type errors from the new fields

### Task 2: Add client authentication, binding, and shared guards

**Files:**
- Create: `backend/src/client-auth/client-auth.module.ts`
- Create: `backend/src/client-auth/client-auth.controller.ts`
- Create: `backend/src/client-auth/client-auth.service.ts`
- Create: `backend/src/client-auth/client-jwt.strategy.ts`
- Create: `backend/src/client-auth/client-jwt-auth.guard.ts`
- Create: `backend/src/client-auth/dto/register-by-invite.dto.ts`
- Create: `backend/src/client-auth/dto/client-login.dto.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Add DTOs for login and invite registration**

Define request DTOs with the actual MVP contract:

```ts
export class RegisterByInviteDto {
  phone: string;
  code: string;
  techId: number;
  inviteCode: string;
}

export class ClientLoginDto {
  phone: string;
  code: string;
}
```

Rules:

- `code` accepts the fixed MVP value
- invalid payloads fail through `ValidationPipe`

- [ ] **Step 2: Implement register, login, and me endpoints**

Implement:

```ts
POST /api/client/auth/register-by-invite
POST /api/client/auth/login
GET /api/client/auth/me
```

Service behavior:

- validate technician exists and is active
- validate invite code against `Technician.invitationCode`
- create `ClientUser` by phone if absent
- create `ClientTechBinding` if absent
- if the client is already bound to another technician, return a clear error
- sign a JWT with `{ sub, phone, userType: 'client' }`

- [ ] **Step 3: Register JWT strategy and route protection**

Mirror the existing technician auth structure:

```ts
Authorization: Bearer <client_token>
```

Use the new guard on all later `/api/client/*` protected routes.

- [ ] **Step 4: Verify auth endpoints locally**

Run:

```bash
cd /Users/shibo/Documents/Codex/nailBook/backend
npm run build
```

Then start the server:

```bash
npm run start:dev
```

Expected:

- server boots
- no module wiring errors
- auth routes are registered under `/api/client/auth`

### Task 3: Implement client home, address, upload, and design APIs

**Files:**
- Create: `backend/src/client-home/*`
- Create: `backend/src/client-addresses/*`
- Create: `backend/src/client-upload/*`
- Create: `backend/src/client-designs/*`
- Modify: `backend/src/main.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Implement home and works read APIs**

Implement:

```ts
GET /api/client/home
GET /api/client/works
GET /api/client/works/:id
```

Behavior:

- read the current client's binding
- return the bound technician profile
- return visible `NailWork` items for that technician
- return latest booking summary when available

- [ ] **Step 2: Implement address CRUD and default-address switching**

Implement:

```ts
GET /api/client/addresses
POST /api/client/addresses
PATCH /api/client/addresses/:id
DELETE /api/client/addresses/:id
POST /api/client/addresses/:id/default
```

Behavior:

- all address ownership is scoped to the current `clientUserId`
- setting one default address clears the previous default

- [ ] **Step 3: Implement local image upload**

Serve local uploads and add an image endpoint:

```ts
POST /api/client/uploads/image
```

Behavior:

- accept multipart file upload
- write to `backend/uploads`
- return a URL that the frontends can display

- [ ] **Step 4: Implement design creation and history**

Implement:

```ts
POST /api/client/designs
GET /api/client/designs
GET /api/client/designs/:id
```

Behavior:

- create `ClientDesignRequest` records for the bound technician
- persist uploaded image URLs as JSON/string data consistent with the chosen schema
- initialize status as `pending_quote`

- [ ] **Step 5: Verify endpoints with backend build**

Run:

```bash
cd /Users/shibo/Documents/Codex/nailBook/backend
npm run build
```

Expected:

- file upload module compiles
- no missing provider or import errors

### Task 4: Implement client booking and message APIs with technician compatibility

**Files:**
- Create: `backend/src/client-bookings/*`
- Create: `backend/src/client-messages/*`
- Modify: `backend/src/bookings/bookings.service.ts`
- Modify: technician-facing read services only if needed after compile failures or missing fields

- [ ] **Step 1: Implement client booking creation and read APIs**

Implement:

```ts
POST /api/client/bookings
GET /api/client/bookings
GET /api/client/bookings/:id
```

Creation behavior:

- enforce current binding
- validate address belongs to current client
- optionally create or reuse a `Customer` record for the technician/client pair
- create a `Quote`
- create a `Booking` using the extended fields
- set `source = 'client_webapp'`

- [ ] **Step 2: Add a consistent booking status mapper**

Expose client-facing states through service formatting rather than raw DB values:

```ts
pending_quote
quoted
pending_deposit
deposit_paid
confirmed
in_service
completed
cancelled
```

The mapper should translate from current booking/quote/deposit fields into the client response shape.

- [ ] **Step 3: Implement single-conversation messaging**

Implement:

```ts
GET /api/client/messages?conversation_id=1
POST /api/client/messages
```

Behavior:

- one conversation per `clientId + techId`
- allow `text`, `image`, `system`, `quote`, `booking`
- ensure the conversation belongs to the current client

- [ ] **Step 4: Verify technician compatibility**

Run:

```bash
cd /Users/shibo/Documents/Codex/nailBook/backend
npm run build
```

Expected:

- no compile breakage in existing booking services
- technician booking reads still type-check with the extended schema

### Task 5: Scaffold the client frontend shell and authentication flow

**Files:**
- Create: `client-frontend/package.json`
- Create: `client-frontend/tsconfig.json`
- Create: `client-frontend/vite.config.ts`
- Create: `client-frontend/src/main.tsx`
- Create: `client-frontend/src/App.tsx`
- Create: `client-frontend/src/index.css`
- Create: `client-frontend/src/contexts/AuthContext.tsx`
- Create: `client-frontend/src/components/ProtectedRoute.tsx`
- Create: `client-frontend/src/components/TabBar.tsx`
- Create: `client-frontend/src/layouts/MainLayout.tsx`
- Create: `client-frontend/src/services/api.ts`
- Create: `client-frontend/src/services/auth.ts`
- Create: `client-frontend/src/pages/InvitePage.tsx`
- Create: `client-frontend/src/pages/LoginPage.tsx`

- [ ] **Step 1: Scaffold the Vite app matching existing repo conventions**

Reuse the structure of `technician-frontend`:

```ts
baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/client'
```

Store the token under a client-specific key such as:

```ts
localStorage.setItem('client_token', token)
```

- [ ] **Step 2: Add auth context and protected routing**

Implement routes:

```tsx
/invite
/login
/home
/bookings
/designs
/chat
/profile
```

Protected routes must redirect unauthenticated users to `/invite` or `/login` depending on whether invite params are present.

- [ ] **Step 3: Build the invite/login screens from `frontedDesign/login.png`**

Behavior:

- parse `tech_id` and `invite_code`
- show the selected technician summary when possible
- submit fixed-code login or invite registration
- persist auth state and redirect to `/home`

- [ ] **Step 4: Verify frontend shell builds**

Run:

```bash
cd /Users/shibo/Documents/Codex/nailBook/client-frontend
npm install
npm run build
```

Expected:

- Vite build succeeds
- router and auth context type-check

### Task 6: Build the client MVP pages and connect all APIs

**Files:**
- Create: `client-frontend/src/pages/HomePage.tsx`
- Create: `client-frontend/src/pages/BookingsPage.tsx`
- Create: `client-frontend/src/pages/CreateBookingPage.tsx`
- Create: `client-frontend/src/pages/BookingDetailPage.tsx`
- Create: `client-frontend/src/pages/DesignsPage.tsx`
- Create: `client-frontend/src/pages/CreateDesignPage.tsx`
- Create: `client-frontend/src/pages/DesignDetailPage.tsx`
- Create: `client-frontend/src/pages/ChatPage.tsx`
- Create: `client-frontend/src/pages/ProfilePage.tsx`
- Create: `client-frontend/src/pages/AddressListPage.tsx`
- Create: `client-frontend/src/pages/AddressEditPage.tsx`
- Create: `client-frontend/src/services/home.ts`
- Create: `client-frontend/src/services/bookings.ts`
- Create: `client-frontend/src/services/designs.ts`
- Create: `client-frontend/src/services/messages.ts`
- Create: `client-frontend/src/services/addresses.ts`
- Create: `client-frontend/src/services/uploads.ts`

- [ ] **Step 1: Build the home page and bottom navigation**

Match `frontedDesign/index.png` with:

- technician card
- work cards
- recent booking summary
- quick-entry actions

Tabs should cover:

- `首页`
- `预约`
- `消息`
- `我的`

Design history can be entered from home or booking-related CTA instead of forcing a fifth bottom tab.

- [ ] **Step 2: Build address management pages**

Match `frontedDesign/manage.png` style for list/form patterns:

- list all addresses
- create/edit/delete address
- set default address

- [ ] **Step 3: Build booking list, create, and detail pages**

Match `frontedDesign/journey.png` for schedule/order card rhythm:

- select address
- pick service date/time
- fill service type and remark
- submit booking
- show status, quote, deposit, and address in detail/list

- [ ] **Step 4: Build design upload and history pages**

Behavior:

- upload multiple images through the local upload API
- submit description
- display design status history and quote state

- [ ] **Step 5: Build single-thread chat page with polling**

Match `frontedDesign/message.png`:

- render text/image/system messages
- poll on an interval
- send text and image messages

- [ ] **Step 6: Build profile page and personal hub**

Match `frontedDesign/me.png` and `frontedDesign/client.png`:

- show avatar, nickname, phone
- link to address management
- link to bookings
- support logout

- [ ] **Step 7: Run full verification**

Run:

```bash
cd /Users/shibo/Documents/Codex/nailBook/backend
npm run build
cd /Users/shibo/Documents/Codex/nailBook/client-frontend
npm run build
cd /Users/shibo/Documents/Codex/nailBook/technician-frontend
npm run build
cd /Users/shibo/Documents/Codex/nailBook/admin-frontend
npm run build
```

Expected:

- all four builds pass
- the client MVP routes render with API-backed data
- no existing frontend build regresses

## Self-Review

### Spec coverage

- Invite binding: covered in Tasks 2 and 5
- Home and works: covered in Tasks 3 and 6
- Booking flow: covered in Tasks 4 and 6
- Design flow: covered in Tasks 3 and 6
- Messaging: covered in Tasks 4 and 6
- Address management: covered in Tasks 3 and 6
- Existing-system compatibility: covered in Tasks 1 and 4

### Placeholder scan

- No `TBD`, `TODO`, or “similar to previous task” placeholders remain.
- Each task names exact files or file groups and concrete verification commands.

### Type consistency

- Client identity is consistently named `ClientUser`
- Binding entity is consistently named `ClientTechBinding`
- Booking source is consistently named `client_webapp`
- Client auth routes consistently live under `/api/client/auth`


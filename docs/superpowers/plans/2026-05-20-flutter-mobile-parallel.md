# Flutter Mobile Parallel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the existing React WebApps usable while adding Flutter mobile apps for the client side and technician side.

**Architecture:** The existing NestJS backend remains the source of truth. React WebApps continue to use the current REST and Socket.IO APIs. Flutter is added as a parallel mobile client with shared core modules for API access, authentication, token storage, upload, realtime messaging, routing, and design system components.

**Tech Stack:** Flutter 3.x, Dart, NestJS, Prisma, JWT, Socket.IO, existing REST APIs, secure local token storage, image picker/upload, deep links, push notification integration in later phases.

---

## Assumptions

- Existing React apps stay deployable and are not rewritten during the Flutter work.
- Backend API compatibility must be preserved for both React and Flutter.
- Flutter implementation starts as one app with two role areas: client and technician. If App Store distribution later requires separate apps, the module boundaries should still support extraction.
- Admin frontend remains React only.
- Online payment is out of MVP scope because the current PRD says deposits are recorded offline.
- Push notifications, maps, and deep links are product-critical for a high-quality native app, but they should be added after the REST and chat foundations are stable.

## Success Criteria

- React `client-frontend` and `technician-frontend` still build and work against the same backend.
- Flutter client user can register/login, bind technician, view works, create booking/design request, view order status, manage addresses, and chat.
- Flutter technician user can login, view dashboard/schedule/orders/customers, quote/confirm/complete orders, manage works/services, and chat.
- REST API response contracts are documented and covered by narrow backend contract tests for Flutter-critical flows.
- Socket.IO chat works on Flutter with reconnect, message send/receive, read receipt, typing, and fallback refresh.
- Token storage and logout behavior are mobile-safe.
- Deep link invitation flow works for installed app and web fallback.
- Existing React behavior has no intentional regression.

## File And Module Map

### Existing Code To Preserve

- `client-frontend/`: existing React client WebApp; only modify when an API compatibility issue requires a shared contract fix.
- `technician-frontend/`: existing React technician WebApp; only modify when an API compatibility issue requires a shared contract fix.
- `admin-frontend/`: unchanged.
- `backend/src/client-auth/`: client login, register, invite binding.
- `backend/src/technician-auth/`: technician login/profile.
- `backend/src/orders/`: client and technician order flows.
- `backend/src/client-designs/`: client design requests.
- `backend/src/custom-service-requests/`: custom booking/design quote flow.
- `backend/src/client-home/`: client home and works browsing.
- `backend/src/technician-works/`: technician works management.
- `backend/src/client-addresses/`: client address management.
- `backend/src/client-messages/`, `backend/src/technician-messages/`, `backend/src/chat/`: messages and realtime events.
- `backend/src/client-upload/`, `backend/src/technician-upload/`: image upload.
- `backend/prisma/schema.prisma`: current data model.

### New Flutter App Structure

- Create: `mobile-flutter/`
- Create: `mobile-flutter/lib/main.dart`
- Create: `mobile-flutter/lib/app/app.dart`
- Create: `mobile-flutter/lib/app/router.dart`
- Create: `mobile-flutter/lib/core/api/api_client.dart`
- Create: `mobile-flutter/lib/core/api/api_error.dart`
- Create: `mobile-flutter/lib/core/auth/auth_session.dart`
- Create: `mobile-flutter/lib/core/auth/token_store.dart`
- Create: `mobile-flutter/lib/core/socket/chat_socket.dart`
- Create: `mobile-flutter/lib/core/upload/upload_service.dart`
- Create: `mobile-flutter/lib/core/theme/app_theme.dart`
- Create: `mobile-flutter/lib/core/widgets/`
- Create: `mobile-flutter/lib/features/client/`
- Create: `mobile-flutter/lib/features/technician/`
- Create: `mobile-flutter/test/`

### Backend Contract Test Additions

- Create: `backend/test/contracts/client-auth.contract-spec.ts`
- Create: `backend/test/contracts/client-order.contract-spec.ts`
- Create: `backend/test/contracts/technician-order.contract-spec.ts`
- Create: `backend/test/contracts/chat.contract-spec.ts`
- Create: `backend/test/contracts/upload.contract-spec.ts`

---

## Phase 0: Project Guardrails

### Task 0.1: Freeze Compatibility Rules

**Files:**
- Create: `docs/flutter/compatibility-rules.md`

- [x] Define the compatibility rule: no breaking changes to existing `/api/client/*`, `/api/technician/*`, and Socket.IO event names without updating both React and Flutter.
- [x] List all critical current API prefixes:
  - `/api/client/auth`
  - `/api/client/home`
  - `/api/client/works`
  - `/api/client/orders`
  - `/api/client/designs`
  - `/api/client/custom-service-requests`
  - `/api/client/addresses`
  - `/api/client/messages`
  - `/api/client/uploads`
  - `/api/technician/auth`
  - `/api/technician/orders`
  - `/api/technician/customers`
  - `/api/technician/messages`
  - `/api/technician/works`
  - `/api/technician/services`
  - `/api/technician/uploads`
- [x] Verify React builds before Flutter work starts:
  - Run: `cd client-frontend && npm run build`
  - Run: `cd technician-frontend && npm run build`
  - Expected: both builds pass.
- [x] Commit:
  - `git add docs/flutter/compatibility-rules.md`
  - `git commit -m "docs: add flutter compatibility rules"`

### Task 0.2: Produce API Inventory

**Files:**
- Create: `docs/flutter/api-inventory.md`

- [x] Extract client service calls from `client-frontend/src/services/*.ts`.
- [x] Extract technician service calls from `technician-frontend/src/services/*.ts`.
- [x] Group endpoints by feature and mark each as:
  - Required for Flutter MVP
  - Required after MVP
  - React-only
- [x] Include Socket.IO event names:
  - `message:send`
  - `message:sent`
  - `message:new`
  - `message:read`
  - `message:read:ack`
  - `typing:start`
  - `typing:stop`
  - `presence:sync`
  - `presence:online`
  - `presence:offline`
- [x] Verify inventory against backend controllers:
  - Run: `rg "@Controller|@Get|@Post|@Patch|@Delete|@Put" backend/src`
  - Expected: every Flutter MVP endpoint has a backend controller route.
- [x] Commit:
  - `git add docs/flutter/api-inventory.md`
  - `git commit -m "docs: inventory flutter api surface"`

---

## Phase 1: Backend Contract Stabilization

### Task 1.1: Add Contract Test Harness

**Files:**
- Create: `backend/test/contracts/README.md`
- Create: `backend/test/contracts/test-app.ts`

- [x] Add a small contract-test helper that boots the Nest app with test database configuration.
- [x] Define test data setup rules for client, technician, binding, address, order, conversation, and upload.
- [x] Run:
  - `cd backend && npm test -- --runInBand`
  - Expected: existing tests pass.
- [x] Commit:
  - `git add backend/test/contracts`
  - `git commit -m "test: add backend contract test harness"`

### Task 1.2: Cover Client Auth And Binding Contracts

**Files:**
- Create: `backend/test/contracts/client-auth.contract-spec.ts`
- Reference: `backend/src/client-auth/client-auth.controller.ts`
- Reference: `client-frontend/src/services/auth.ts`

- [x] Test invite-code lookup returns technician identity and status fields needed by Flutter.
- [x] Test register-by-invite returns access token, client profile, default technician, and technician list.
- [x] Test login returns the same shape as register where possible.
- [x] Test `/auth/me` returns client, bound technicians, and default technician.
- [ ] Run:
  - `cd backend && npm test -- client-auth.contract-spec --runInBand`
  - Expected: contract tests pass.
- [x] Commit:
  - `git add backend/test/contracts/client-auth.contract-spec.ts`
  - `git commit -m "test: cover client auth contracts"`

### Task 1.3: Cover Client Booking And Design Contracts

**Files:**
- Create: `backend/test/contracts/client-order.contract-spec.ts`
- Reference: `backend/src/orders/client-orders.controller.ts`
- Reference: `backend/src/client-designs/client-designs.controller.ts`
- Reference: `backend/src/custom-service-requests/client-custom-service-requests.controller.ts`

- [x] Test address list/create/default selection.
- [x] Test works list/detail payload used by booking and design flows.
- [x] Test order create, list, detail, quote accept, quote reject, and status update.
- [x] Test design create/list/detail and create-order-from-design.
- [x] Test custom service request create/list/detail/accept/reject/cancel.
- [ ] Run:
  - `cd backend && npm test -- client-order.contract-spec --runInBand`
  - Expected: contract tests pass.
- [x] Commit:
  - `git add backend/test/contracts/client-order.contract-spec.ts`
  - `git commit -m "test: cover client booking contracts"`

### Task 1.4: Cover Technician Operation Contracts

**Files:**
- Create: `backend/test/contracts/technician-order.contract-spec.ts`
- Reference: `backend/src/orders/technician-orders.controller.ts`
- Reference: `backend/src/customers/technician-customers.controller.ts`
- Reference: `backend/src/technician-works/technician-works.controller.ts`
- Reference: `backend/src/technician-services/technician-services.controller.ts`

- [x] Test technician login and `/auth/me`.
- [x] Test dashboard-critical order list, trip list, detail.
- [x] Test review/quote, confirm, complete, cancel.
- [x] Test customer list/detail/tags.
- [x] Test work create/update/delete/visibility/pin/feature.
- [x] Test service create/update/delete/toggle.
- [ ] Run:
  - `cd backend && npm test -- technician-order.contract-spec --runInBand`
  - Expected: contract tests pass.
- [x] Commit:
  - `git add backend/test/contracts/technician-order.contract-spec.ts`
  - `git commit -m "test: cover technician mobile contracts"`

### Task 1.5: Cover Chat And Upload Contracts

**Files:**
- Create: `backend/test/contracts/chat.contract-spec.ts`
- Create: `backend/test/contracts/upload.contract-spec.ts`
- Reference: `backend/src/chat/chat.gateway.ts`
- Reference: `backend/src/client-upload/client-upload.controller.ts`
- Reference: `backend/src/technician-upload/technician-upload.controller.ts`

- [x] Test client and technician can list conversations.
- [x] Test REST message send and read endpoints.
- [x] Test Socket.IO authentication with client token and technician token.
- [x] Test `message:send` emits `message:new` to the other side.
- [x] Test upload returns a URL consumable by Flutter image widgets.
- [ ] Run:
  - `cd backend && npm test -- chat.contract-spec upload.contract-spec --runInBand`
  - Expected: contract tests pass.
- [x] Commit:
  - `git add backend/test/contracts/chat.contract-spec.ts backend/test/contracts/upload.contract-spec.ts`
  - `git commit -m "test: cover chat and upload contracts"`

---

## Phase 2: Flutter Foundation

### Task 2.1: Scaffold Flutter App

**Files:**
- Create: `mobile-flutter/`
- Create: `mobile-flutter/README.md`

- [ ] Run:
  - `flutter create mobile-flutter`
- [ ] Set app name to NailBook mobile.
- [ ] Add dependencies:
  - HTTP client
  - secure token storage
  - router
  - state management
  - socket.io client
  - image picker
  - cached network image
  - intl/date formatting
- [ ] Add README with local backend URL setup.
- [ ] Verify:
  - `cd mobile-flutter && flutter test`
  - `cd mobile-flutter && flutter analyze`
  - Expected: both pass.
- [ ] Commit:
  - `git add mobile-flutter`
  - `git commit -m "feat: scaffold flutter mobile app"`

### Task 2.2: Build Core API Client

**Files:**
- Create: `mobile-flutter/lib/core/api/api_client.dart`
- Create: `mobile-flutter/lib/core/api/api_error.dart`
- Create: `mobile-flutter/test/core/api/api_client_test.dart`

- [ ] Write tests for base URL, bearer token injection, JSON response handling, timeout, and 401 session expiration callback.
- [ ] Implement API client with explicit role base paths:
  - client: `/api/client`
  - technician: `/api/technician`
- [ ] Verify:
  - `cd mobile-flutter && flutter test test/core/api/api_client_test.dart`
  - Expected: pass.
- [ ] Commit:
  - `git add mobile-flutter/lib/core/api mobile-flutter/test/core/api`
  - `git commit -m "feat: add flutter api client"`

### Task 2.3: Build Auth Session And Token Store

**Files:**
- Create: `mobile-flutter/lib/core/auth/auth_session.dart`
- Create: `mobile-flutter/lib/core/auth/token_store.dart`
- Create: `mobile-flutter/test/core/auth/auth_session_test.dart`

- [ ] Write tests for storing client token, storing technician token, clearing tokens, restoring session, and switching role.
- [ ] Implement secure storage wrapper.
- [ ] Implement session state with roles:
  - unauthenticated
  - client
  - technician
- [ ] Verify:
  - `cd mobile-flutter && flutter test test/core/auth/auth_session_test.dart`
  - Expected: pass.
- [ ] Commit:
  - `git add mobile-flutter/lib/core/auth mobile-flutter/test/core/auth`
  - `git commit -m "feat: add flutter auth session"`

### Task 2.4: Build Routing Shell

**Files:**
- Create: `mobile-flutter/lib/app/app.dart`
- Create: `mobile-flutter/lib/app/router.dart`
- Create: `mobile-flutter/lib/core/theme/app_theme.dart`
- Create: `mobile-flutter/lib/features/client/client_shell.dart`
- Create: `mobile-flutter/lib/features/technician/technician_shell.dart`

- [ ] Add app-level routes:
  - `/`
  - `/role-select`
  - `/client/login`
  - `/client/home`
  - `/technician/login`
  - `/technician/home`
- [ ] Add mobile-first theme following the existing product direction: touch targets at least 44px, safe-area aware bottom navigation, clear pressed/focus states.
- [ ] Verify:
  - `cd mobile-flutter && flutter analyze`
  - Expected: pass.
- [ ] Commit:
  - `git add mobile-flutter/lib/app mobile-flutter/lib/core/theme mobile-flutter/lib/features`
  - `git commit -m "feat: add flutter app shell"`

---

## Phase 3: Client Flutter MVP

### Task 3.1: Client Login, Register, Invite Binding

**Files:**
- Create: `mobile-flutter/lib/features/client/auth/`
- Reference: `client-frontend/src/services/auth.ts`
- Reference: `backend/src/client-auth/client-auth.controller.ts`

- [ ] Implement invite link parameter parsing for `invite_code` and `tech_id`.
- [ ] Implement request login code, request register code, register by invite, login, `/auth/me`, bind technician, set default technician.
- [ ] Add screens for invite landing, phone login, code entry, and first-time name completion.
- [ ] Verify manually against local backend:
  - New user via invite can register and bind technician.
  - Existing user can login.
  - User without nickname is routed to completion screen.
- [ ] Commit:
  - `git add mobile-flutter/lib/features/client/auth`
  - `git commit -m "feat: add flutter client auth"`

### Task 3.2: Client Home And Works

**Files:**
- Create: `mobile-flutter/lib/features/client/home/`
- Create: `mobile-flutter/lib/features/client/works/`
- Reference: `client-frontend/src/services/home.ts`
- Reference: `client-frontend/src/services/works.ts`

- [ ] Implement client home data loading from `/home`.
- [ ] Implement works list and work detail.
- [ ] Implement like, favorite, comments list, and comment create if backend contracts pass.
- [ ] Verify:
  - Works render images from backend upload/static URLs.
  - Empty states render without layout breaks.
  - Tap targets are at least 44px.
- [ ] Commit:
  - `git add mobile-flutter/lib/features/client/home mobile-flutter/lib/features/client/works`
  - `git commit -m "feat: add flutter client home and works"`

### Task 3.3: Client Address Management

**Files:**
- Create: `mobile-flutter/lib/features/client/addresses/`
- Reference: `client-frontend/src/services/address.ts`

- [ ] Implement address list, create, edit, delete, and set default.
- [ ] Validate required fields before submit:
  - contact name
  - contact phone
  - city/district/detail address
- [ ] Verify:
  - User with no address is guided to create address before booking.
  - Default address is selected by booking flow.
- [ ] Commit:
  - `git add mobile-flutter/lib/features/client/addresses`
  - `git commit -m "feat: add flutter client addresses"`

### Task 3.4: Client Booking And Orders

**Files:**
- Create: `mobile-flutter/lib/features/client/orders/`
- Reference: `client-frontend/src/services/order.ts`
- Reference: `client-frontend/src/pages/CreateOrder.tsx`

- [ ] Implement order list with status filters.
- [ ] Implement create order with technician selection, service type, address/shop address, date, time, remarks.
- [ ] Implement order detail with quote state and status timeline.
- [ ] Implement accept quote, reject quote, and cancel/update where supported.
- [ ] Verify:
  - Booking requires bound technician.
  - Booking requires valid address for home service.
  - Quoted order can be accepted.
  - React WebApp still shows Flutter-created order.
- [ ] Commit:
  - `git add mobile-flutter/lib/features/client/orders`
  - `git commit -m "feat: add flutter client orders"`

### Task 3.5: Client Design Requests

**Files:**
- Create: `mobile-flutter/lib/features/client/designs/`
- Reference: `client-frontend/src/services/design.ts`
- Reference: `client-frontend/src/services/upload.ts`

- [ ] Implement image picker and upload.
- [ ] Implement create design request with multiple images and description.
- [ ] Implement design list/detail.
- [ ] Implement accept/reject quote and create order from design if backend supports current route.
- [ ] Verify:
  - Uploaded image appears in React WebApp and Flutter.
  - Design quote created by technician appears in Flutter client.
- [ ] Commit:
  - `git add mobile-flutter/lib/features/client/designs`
  - `git commit -m "feat: add flutter client designs"`

---

## Phase 4: Technician Flutter MVP

### Task 4.1: Technician Login And Profile

**Files:**
- Create: `mobile-flutter/lib/features/technician/auth/`
- Create: `mobile-flutter/lib/features/technician/profile/`
- Reference: `technician-frontend/src/services/auth.ts`

- [ ] Implement request code, login, `/auth/me`, status update, profile update, service type update.
- [ ] Implement technician profile screen and basic settings.
- [ ] Verify:
  - Login stores technician token separately from client token.
  - Logout clears only the active role token.
- [ ] Commit:
  - `git add mobile-flutter/lib/features/technician/auth mobile-flutter/lib/features/technician/profile`
  - `git commit -m "feat: add flutter technician auth"`

### Task 4.2: Technician Dashboard And Schedule

**Files:**
- Create: `mobile-flutter/lib/features/technician/home/`
- Create: `mobile-flutter/lib/features/technician/schedule/`
- Reference: `technician-frontend/src/pages/HomePage.tsx`
- Reference: `technician-frontend/src/pages/SchedulePage.tsx`
- Reference: `technician-frontend/src/services/orders.ts`

- [ ] Implement home summary from orders/trips and profile data.
- [ ] Implement today schedule and week schedule.
- [ ] Implement order conflict display using backend-provided or locally calculated time overlap.
- [ ] Verify:
  - Today trips match React technician WebApp.
  - Schedule renders correctly on small phones.
- [ ] Commit:
  - `git add mobile-flutter/lib/features/technician/home mobile-flutter/lib/features/technician/schedule`
  - `git commit -m "feat: add flutter technician dashboard"`

### Task 4.3: Technician Orders And Quoting

**Files:**
- Create: `mobile-flutter/lib/features/technician/orders/`
- Reference: `technician-frontend/src/services/orders.ts`

- [ ] Implement order list with filters.
- [ ] Implement order detail.
- [ ] Implement review/quote, confirm, complete, cancel, and edit where supported.
- [ ] Verify:
  - Client-created booking appears in technician Flutter.
  - Technician quote appears in client React and client Flutter.
  - Complete order updates revenue-related backend state if current backend does this.
- [ ] Commit:
  - `git add mobile-flutter/lib/features/technician/orders`
  - `git commit -m "feat: add flutter technician orders"`

### Task 4.4: Technician Customers

**Files:**
- Create: `mobile-flutter/lib/features/technician/customers/`
- Reference: `technician-frontend/src/services/customers.ts`

- [ ] Implement customer list with search/filter.
- [ ] Implement customer detail with history.
- [ ] Implement tag update.
- [ ] Verify:
  - Customer created by binding/order appears under correct technician.
  - Tags persist and render in React WebApp.
- [ ] Commit:
  - `git add mobile-flutter/lib/features/technician/customers`
  - `git commit -m "feat: add flutter technician customers"`

### Task 4.5: Technician Works And Services

**Files:**
- Create: `mobile-flutter/lib/features/technician/works/`
- Create: `mobile-flutter/lib/features/technician/services/`
- Reference: `technician-frontend/src/services/works.ts`
- Reference: `technician-frontend/src/services/services.ts`

- [ ] Implement works list, create, edit, delete, visible toggle, pinned toggle, featured toggle.
- [ ] Implement service list, create, edit, delete, enable toggle.
- [ ] Verify:
  - Work uploaded in Flutter appears in client works list.
  - Service changes affect booking options where current backend supports it.
- [ ] Commit:
  - `git add mobile-flutter/lib/features/technician/works mobile-flutter/lib/features/technician/services`
  - `git commit -m "feat: add flutter technician works and services"`

---

## Phase 5: Shared Mobile Chat

### Task 5.1: Flutter Socket.IO Client

**Files:**
- Create: `mobile-flutter/lib/core/socket/chat_socket.dart`
- Create: `mobile-flutter/test/core/socket/chat_socket_test.dart`
- Reference: `backend/src/chat/chat.gateway.ts`
- Reference: `client-frontend/src/services/socket.ts`
- Reference: `technician-frontend/src/services/socket.ts`

- [ ] Implement socket connection with token auth.
- [ ] Implement reconnect behavior.
- [ ] Implement event stream for message, read receipt, typing, and presence.
- [ ] Verify against local backend with two app sessions:
  - Client sends message.
  - Technician receives `message:new`.
  - Technician sends read receipt.
  - Client receives `message:read`.
- [ ] Commit:
  - `git add mobile-flutter/lib/core/socket mobile-flutter/test/core/socket`
  - `git commit -m "feat: add flutter chat socket"`

### Task 5.2: Client And Technician Chat UI

**Files:**
- Create: `mobile-flutter/lib/features/shared/chat/`
- Wire into:
  - `mobile-flutter/lib/features/client/`
  - `mobile-flutter/lib/features/technician/`

- [ ] Implement conversation list.
- [ ] Implement chat detail with text send, image send, realtime receive, read receipt, typing state, and fallback refresh.
- [ ] Verify:
  - React client can chat with Flutter technician.
  - Flutter client can chat with React technician.
  - Flutter client can chat with Flutter technician.
- [ ] Commit:
  - `git add mobile-flutter/lib/features/shared/chat`
  - `git commit -m "feat: add flutter shared chat"`

---

## Phase 6: Native Mobile Capabilities

### Task 6.1: Deep Link Invitation Flow

**Files:**
- Create: `docs/flutter/deep-linking.md`
- Modify: Flutter Android/iOS app link configuration files under `mobile-flutter/android/` and `mobile-flutter/ios/`
- Potential backend/static hosting change: association files for Universal Links/App Links.

- [ ] Define canonical invite URL format:
  - `https://<domain>/invite?invite_code=<code>`
  - optional: `tech_id=<id>`
- [ ] Configure Android App Links.
- [ ] Configure iOS Universal Links.
- [ ] Preserve web fallback to React `/invite`.
- [ ] Verify:
  - App installed: invite opens Flutter invite flow.
  - App not installed: invite opens React WebApp invite flow.
- [ ] Commit:
  - `git add docs/flutter/deep-linking.md mobile-flutter/android mobile-flutter/ios`
  - `git commit -m "feat: add mobile invite deep links"`

### Task 6.2: Push Notification Foundation

**Files:**
- Create: `docs/flutter/push-notifications.md`
- Create or modify backend notification module after provider choice.
- Create Flutter notification service under `mobile-flutter/lib/core/notifications/`

- [ ] Choose push provider:
  - FCM/APNs for global distribution.
  - Add China vendor push later only if distribution requires it.
- [ ] Add device token registration endpoint.
- [ ] Store device token by role and user id.
- [ ] Send push for:
  - new message
  - quote created
  - booking confirmed
  - order reminder
- [ ] Verify:
  - Foreground notification handled in app.
  - Background notification opens correct screen.
- [ ] Commit:
  - `git add docs/flutter/push-notifications.md backend/src mobile-flutter/lib/core/notifications`
  - `git commit -m "feat: add mobile push notification foundation"`

### Task 6.3: Map And Navigation Integration

**Files:**
- Create: `docs/flutter/maps.md`
- Create: `mobile-flutter/lib/core/maps/`
- Wire into client address and technician schedule/order detail.

- [ ] Choose provider per target market:
  - China: AMap.
  - Outside China: Google Maps.
- [ ] Add location permission flow.
- [ ] Add address coordinate display where backend has lat/lng.
- [ ] Add external navigation launch for technician trips.
- [ ] Verify:
  - Permission denial does not block non-map order flows.
  - Navigation button opens installed map app.
- [ ] Commit:
  - `git add docs/flutter/maps.md mobile-flutter/lib/core/maps`
  - `git commit -m "feat: add mobile map navigation"`

---

## Phase 7: QA, Release, And Coexistence

### Task 7.1: Cross-Client Regression Matrix

**Files:**
- Create: `docs/flutter/regression-matrix.md`

- [ ] Define test matrix:
  - React client ↔ React technician
  - React client ↔ Flutter technician
  - Flutter client ↔ React technician
  - Flutter client ↔ Flutter technician
- [ ] Cover flows:
  - invite/register/bind
  - login/logout
  - create booking
  - quote/accept/confirm/complete
  - design upload/quote/order
  - chat text/image/read/typing
  - works upload/browse/comment
  - address create/default
- [ ] Execute matrix on local/staging backend.
- [ ] Commit:
  - `git add docs/flutter/regression-matrix.md`
  - `git commit -m "docs: add flutter coexistence regression matrix"`

### Task 7.2: CI Checks

**Files:**
- Modify or create CI workflow if present.
- Create: `docs/flutter/ci.md`

- [ ] Add backend contract tests to CI.
- [ ] Add React client build.
- [ ] Add React technician build.
- [ ] Add Flutter analyze.
- [ ] Add Flutter tests.
- [ ] Verify locally:
  - `cd backend && npm test -- --runInBand`
  - `cd client-frontend && npm run build`
  - `cd technician-frontend && npm run build`
  - `cd mobile-flutter && flutter analyze`
  - `cd mobile-flutter && flutter test`
- [ ] Commit:
  - `git add docs/flutter/ci.md`
  - `git commit -m "ci: add flutter and compatibility checks"`

### Task 7.3: Staged Release

**Files:**
- Create: `docs/flutter/release-plan.md`

- [ ] Define release gates:
  - Alpha: internal install, local/staging backend.
  - Beta: selected technicians and clients.
  - Production: public distribution.
- [ ] Define rollback plan:
  - React WebApps remain available.
  - Disable mobile-only features with backend feature flags if needed.
  - Keep invite links web-compatible.
- [ ] Define monitoring:
  - login failures
  - API error rate by client type
  - socket disconnect rate
  - upload failures
  - push delivery failures
- [ ] Commit:
  - `git add docs/flutter/release-plan.md`
  - `git commit -m "docs: add flutter staged release plan"`

---

## Recommended Milestones

### Milestone 1: Compatibility Baseline

- Complete Phase 0 and Phase 1.
- Duration: 3-5 working days.
- Exit criteria: React builds pass, contract tests cover Flutter-critical endpoints.

### Milestone 2: Flutter Foundation

- Complete Phase 2.
- Duration: 3-5 working days.
- Exit criteria: Flutter app boots, role routing works, API/auth core tests pass.

### Milestone 3: Client MVP

- Complete Phase 3.
- Duration: 2-3 weeks.
- Exit criteria: client can complete invite → booking/design → quote acceptance → chat loop.

### Milestone 4: Technician MVP

- Complete Phase 4.
- Duration: 2-3 weeks.
- Exit criteria: technician can process client-created orders and manage core operating data.

### Milestone 5: Realtime And Native Mobile Quality

- Complete Phase 5 and priority parts of Phase 6.
- Duration: 2-3 weeks.
- Exit criteria: chat, upload, deep links, and minimum native experience are stable.

### Milestone 6: Coexistence Release

- Complete Phase 7.
- Duration: 1-2 weeks.
- Exit criteria: React and Flutter clients pass regression matrix on staging.

## Risk Register

- **Backend contract drift:** mitigate with contract tests before Flutter feature work.
- **Socket.IO mobile lifecycle issues:** mitigate with reconnect and REST fallback refresh.
- **Invite links breaking React fallback:** mitigate with explicit deep-link tests for installed and not-installed states.
- **Image URL incompatibility:** mitigate with upload contract tests and cached image rendering checks.
- **Token confusion between roles:** mitigate with separate role token keys in secure storage.
- **Scope creep from native features:** defer push/maps until core MVP flows work.

## First Execution Recommendation

Start with Phase 0 and Phase 1. Do not scaffold Flutter first. The highest-leverage first step is locking the backend contract so React WebApps remain stable while Flutter development begins.

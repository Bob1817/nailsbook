# Technician MVP Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the nail technician WebApp MVP loop by adding the missing orders page and replacing the major page-level business mocks with data loaded from the existing admin backend APIs.

**Architecture:** Keep the current React + Vite app structure, add thin service modules for technician-facing booking and customer reads/actions, then refactor the existing pages to consume those services with page-local state. Reuse the completed admin backend through `/api/admin` endpoints only, and keep unsupported capabilities such as messages and maps as static MVP placeholders.

**Tech Stack:** React 19, TypeScript, React Router, Axios, Tailwind CSS, Vite

---

### Task 1: Add technician-facing data models and service wrappers

**Files:**
- Create: `technician-frontend/src/services/bookings.ts`
- Create: `technician-frontend/src/services/customers.ts`
- Create: `technician-frontend/src/services/technicianData.ts`
- Modify: `technician-frontend/src/services/auth.ts`

- [ ] Define booking, customer, and dashboard helper types and API wrappers.
- [ ] Keep auth wired to `/auth/login` and `/auth/me`, with the login payload mapped from the existing phone/password UI to the backend `username/password` shape.
- [ ] Keep the existing local fallback only where the backend path is absent, and remove page-level business mocks where service data exists.

Verify:
- Imports resolve cleanly in TypeScript.

### Task 2: Add the missing orders page and route integration

**Files:**
- Create: `technician-frontend/src/pages/OrdersPage.tsx`
- Modify: `technician-frontend/src/App.tsx`
- Modify: `technician-frontend/src/components/TabBar.tsx`

- [ ] Add a mobile-first orders page that shows booking list cards, status chips, customer/address/time details, and an inline detail panel.
- [ ] Wire `/orders` into the protected route tree.
- [ ] Update the bottom tab bar to expose the orders entry while preserving the visual style and 44px touch targets.

Verify:
- Visiting `/orders` renders inside `MainLayout`.

### Task 3: Refactor dashboard and schedule to use real booking data

**Files:**
- Modify: `technician-frontend/src/pages/HomePage.tsx`
- Modify: `technician-frontend/src/pages/SchedulePage.tsx`
- Modify: `technician-frontend/src/services/technicianData.ts`

- [ ] Replace hard-coded dashboard cards with derived values from loaded bookings.
- [ ] Keep conflict detection in the schedule page, but run it against loaded bookings and limit status actions to those supported by the current backend.
- [ ] Keep map and route planning as placeholder UI only; do not add SDK integration.

Verify:
- Dashboard and schedule render without page-level mock arrays.

### Task 4: Refactor customers to use real list/detail data

**Files:**
- Modify: `technician-frontend/src/pages/CustomersPage.tsx`

- [ ] Load customer list from the backend with search support.
- [ ] Load customer detail on selection and map backend fields into the existing mobile detail presentation.
- [ ] Preserve the current visual hierarchy and avoid adding create/edit flows not defined in the MVP scope.

Verify:
- Customer list and detail work with loaded data and no page-local fixture list.

### Task 5: Verify the MVP closure changes

**Files:**
- Modify as needed: touched files above only

- [ ] Run `npm run lint` in `technician-frontend` and fix issues in the changed scope.
- [ ] Run `npm run build` in `technician-frontend` and fix any type/build issues in the changed scope.
- [ ] Summarize any intentional MVP gaps that remain because the current backend does not expose technician-specific APIs for them.

Verify:
- `npm run lint`
- `npm run build`

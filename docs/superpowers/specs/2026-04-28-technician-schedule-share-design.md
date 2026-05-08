# Technician Schedule And Share Design

## Context

The technician WebApp currently exposes six bottom tabs: `首页 / 行程 / 客户 / 订单 / 消息 / 我`.

Two product problems need to be addressed:

1. `行程` and `订单` are split even though they represent the same booking lifecycle for technicians. The only extra requirement for `行程` is showing appointment time and service address.
2. The technician needs a prominent way to share her nail business card with clients so clients can view the profile and book through it.

This design keeps the change front-end only for the technician WebApp and reuses the existing booking data model and booking status transitions.

## Goals

- Reduce bottom navigation from six items to five by merging `订单` into `行程`.
- Make `行程` the single booking operations center for technicians.
- Add a top-level `分享我的美甲名片` action in `我的`.
- Support two sharing outcomes in one flow:
  - share a profile link when the browser supports system share
  - display a screenshot-friendly profile card inside the WebApp

## Non-Goals

- No backend booking model changes.
- No new bottom tab for sharing.
- No image export pipeline for the profile card.
- No WeChat SDK, QR code generation, or platform-specific deep integration in this iteration.
- No technician profile editing flow beyond showing currently available data.

## Assumptions

- Existing booking data already contains the fields needed to unify `订单` and `行程`: customer, service, status, price, appointment time, and address.
- Existing technician auth data reliably provides `id`, `name`, `phone`, `avatar`, and `status`.
- `city` and `serviceArea` may exist upstream, but are not guaranteed in current technician front-end state. The UI must degrade gracefully when they are absent.
- Keeping `/orders` as a compatibility route that redirects to `/schedule` is preferable to removing it outright.

## User Experience

### 1. Bottom Navigation

The bottom tab bar becomes:

- `首页`
- `行程`
- `客户`
- `消息`
- `我`

`订单` is removed from the visible bottom navigation.

### 2. Unified Schedule Page

The `行程` page becomes the single place where technicians view and operate on bookings.

The page keeps one data source but offers two viewing modes:

- `按日期`
- `按状态`

#### 按日期

This view keeps the current schedule-first behavior:

- date chips for today and the next few days
- list of bookings for the selected date
- summary metrics for the selected day
- booking cards showing time, address, service, status, and amount
- detail panel with booking actions

#### 按状态

This view absorbs the current order-first behavior:

- filters: `全部 / 待确认 / 已确认 / 已完成 / 已取消`
- cards still represent the same bookings
- each card must show order semantics and schedule semantics together:
  - customer
  - booking number
  - service
  - status
  - appointment time
  - service address
  - amount

#### Shared Detail Panel

There is only one detail panel for the selected booking, regardless of the active viewing mode.

The detail panel should include:

- customer name
- customer phone
- service name
- booking status
- appointment time
- service address
- amount
- note when present
- current allowed status actions

This removes the conceptual split between a “schedule detail” and an “order detail”.

### 3. My Page Share Entry

`我的` gets a prominent primary action near the top of the page, placed below the technician header and above the summary cards.

The primary entry:

- button label: `分享我的美甲名片`
- helper text: `发给客户，查看主页并直接预约`

The button opens a mobile-first share sheet or full-screen panel rather than a separate deep navigation flow.

### 4. Share Panel

The share panel contains two blocks.

#### Link Sharing Block

Actions:

- `立即分享`
- `复制链接`

Behavior:

- if `navigator.share` is available, `立即分享` invokes system share with title, text, and link
- if `navigator.share` is unavailable or fails, the UI falls back to copying the link
- `复制链接` always copies the generated profile URL when clipboard support exists

#### Screenshot-Friendly Profile Card

The panel also shows a large profile card suitable for direct screenshotting.

The card contains:

- avatar
- technician name
- active status
- phone number
- service city / service area when available
- fallback service descriptor when area data is missing
- short static service introduction copy
- booking call-to-action text

The card is for display and screenshot only in this iteration. It is not exported as an image file.

## Data And Routing

### Booking Data

No schema change is required. The unified schedule page continues using the existing booking records and status transition methods.

### Technician Profile Data

The share card uses only currently available technician auth data plus optional mapped fields when present.

If `city` or `serviceArea` is already returned by the auth API, the front-end may preserve them in the technician type. If those fields are missing, the card should still render correctly.

### Share Link

The first iteration generates a profile link from front-end configuration plus technician identity.

Expected behavior:

- use a configured public base URL when available
- otherwise derive a reasonable fallback URL for local/front-end environments
- append technician identity in a stable way for future public profile support

This keeps the sharing flow functional without requiring the public profile page to be fully built in the same change.

### Route Compatibility

- `/schedule` remains the canonical route
- `/orders` becomes a compatibility redirect to `/schedule`

This avoids breaking any existing entry points that still navigate to orders.

## Implementation Shape

### Files Expected To Change

- `technician-frontend/src/components/TabBar.tsx`
- `technician-frontend/src/App.tsx`
- `technician-frontend/src/pages/SchedulePage.tsx`
- `technician-frontend/src/pages/MePage.tsx`
- `technician-frontend/src/services/auth.ts`
- `technician-frontend/src/contexts/authTypes.ts` when technician fields need to expand

### Preferred Change Strategy

Keep changes surgical:

- remove the visible `订单` tab
- redirect the legacy `orders` route
- merge the `订单` view capabilities into the existing `行程` page instead of creating a third page
- implement share UI inside `我的` without introducing a new bottom-level route unless a local component split becomes necessary

## Verification Criteria

### Navigation

- bottom navigation renders five tabs instead of six
- `订单` is no longer visible in the tab bar
- navigating to `/orders` lands on `/schedule`

### Unified Schedule

- technicians can switch between `按日期` and `按状态`
- `按日期` still shows daily scheduling information and status actions
- `按状态` shows booking data with appointment time and address included
- the booking detail panel shows customer, time, address, amount, and status actions in both viewing modes

### Share Business Card

- `我的` shows the `分享我的美甲名片` primary action near the top
- tapping the action opens the share panel
- the share panel can invoke system share when supported
- the share panel can copy the profile link
- the share panel always displays a screenshot-friendly profile card

### Mobile Constraints

- all new interactive controls keep touch-safe sizing at or above 44px
- the new share panel and schedule controls remain usable in the technician WebApp mobile viewport

## Risks And Mitigations

### Risk: Unified page becomes cluttered

Mitigation:

- keep only two top-level viewing modes
- reuse a single detail panel
- avoid adding new booking concepts beyond what already exists

### Risk: Technician profile fields are incomplete

Mitigation:

- render card with required fields only
- treat city and service area as optional
- use fixed fallback copy instead of blocking the feature

### Risk: Browser share and clipboard APIs vary

Mitigation:

- prefer capability detection
- always keep a visible fallback path in the UI

## Scope Check

This is a single front-end feature package rather than multiple independent subsystems:

- schedule and order merge are one coherent booking-management change
- sharing the profile card is a focused `我的` page enhancement

These can be implemented together in one plan while still being split into small TDD tasks.

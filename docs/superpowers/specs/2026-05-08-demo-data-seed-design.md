# Demo Data Seed Design

## Goal

Provide realistic, persistent demo data for NailBook so product demos do not start from empty states. The seed must cover both the core technician-client workflow and platform-side admin views.

## Scope

This seed will create and maintain:

- 1 primary technician demo account with realistic profile, service configuration, subscription, works, conversations, quotes, bookings, revenues, and linked customers
- 5 client accounts bound to that technician, each with customer records and addresses
- Platform-side sample data including additional technicians, subscription states, and artist applications in `pending`, `approved`, and `rejected`

This seed will not create speculative product behavior outside existing schema and read models.

## Constraints

- Idempotent: repeated execution must reuse fixed phones, codes, and document numbers instead of growing data indefinitely
- Dual entrypoints:
  - automatic execution during backend startup in development
  - manual execution via an explicit npm script
- Keep existing `DevelopmentAuthSeedService` focused on minimal login fixtures
- Touch only backend seed wiring and tests required for this feature

## Approach

### Seed boundaries

Split development data into two layers:

- `DevelopmentAuthSeedService`: continue to ensure minimal login fixtures
- new demo data seed helper/service: ensure richer, presentation-grade data

Both the startup service and manual CLI script will call the same shared helper so data shape stays consistent.

### Core data model

Use fixed natural keys for idempotency:

- subscription plans by `code`
- technicians and clients by `phone`
- bindings by `(clientId, techId)`
- customers by `(technicianId, clientUserId)`
- quotes by `quoteNo`
- bookings by `bookingNo`
- revenues by `revenueNo`
- conversations by `(clientId, techId)`
- artist applications by `phone`

For entities without unique business keys in schema, use stable lookup fields before create:

- works by `(techId, title)`
- addresses by `(clientId, detailAddress)`
- design requests by `(clientId, techId, title)`
- messages/comments by a stable tuple of conversation/work/content/type

### Demo narrative

The primary technician will look active and real:

- enabled for home and shop service
- populated service items and social accounts
- multiple recent and historical bookings
- completed revenues, pending confirmations, cancelled appointments
- message history with clients
- visible featured works with likes, favorites, and comments

The five clients will cover mixed scenarios:

- repeat customer with completed bookings
- upcoming confirmed booking
- pending quote / pending booking flow
- cancelled appointment history
- design request and conversation-heavy user

Platform-side data will support admin demos:

- additional active/inactive technicians
- mixed subscription plan coverage
- several artist applications across review states

## Verification

Success is verified when:

1. running the manual demo seed command twice leaves stable counts for fixed demo entities
2. development startup triggers the demo seed only in development and can be disabled by config
3. dashboard, technician, client, booking, revenue, subscription, and artist-application views have non-empty realistic data

## Risks

- Overloading startup with too much logic: mitigated by putting the real seed logic in a shared helper and keeping the Nest service thin
- Demo data drifting from UI expectations: mitigated by reading current backend services and seeding only statuses/fields already consumed by those services

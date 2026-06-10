# NailBook Mobile Flutter — Design System Guide

## Current Design Direction

The app is migrating to a **warm dark editorial aesthetic** ("Nailtastic Studio" style):
warm near-black canvas, earthy caramel/bronze accent, cream floating cards, serif
display titles (iOS built-in `Songti SC`), and an image-first masonry feed.

This **replaces** the previous Apple-inspired light Liquid Glass direction (light
`#f5f5f7` canvas + rose `#c4627a`). The migration is in progress — see status below.

### New Design Tokens — `lib/core/theme/editorial_tokens.dart` (class `ET`)

New screens MUST use `ET`. Core palette:

| Role | Token | Value |
|------|-------|-------|
| Canvas (warm near-black) | `ET.bg` | `#16120E` |
| Card surface | `ET.surface` | `#2A241E` |
| Cream floating card / active chip | `ET.cream` | `#EDE5D8` |
| Primary text (warm white) | `ET.ink` | `#F3ECE1` |
| Secondary text | `ET.inkSecondary` | `#B7AC9B` |
| Accent (caramel/bronze) | `ET.accent` | `#C9A57C` |
| Hairline | `ET.hairline` | `white @ 12%` |

### Design Principles

- **Image-first masonry** — nail photography dominates; UI chrome recedes into warm black
- **Warm dark foundation** — `ET.bg` canvas, `ET.surface` cards, `ET.ink` text
- **Earthy caramel accent** — `ET.accent` for active/highlight states (no rose, no pink)
- **Cream for emphasis** — active chips & primary actions use `ET.cream` with `ET.onCream` text
- **Editorial serif titles** — `ET.display` / `ET.displaySmall` (Songti SC); body stays sans
- **Capsule geometry** — `ET.rChip` (999) for chips/pills/primary actions
- **Restrained depth** — surface contrast + soft dark shadows (`ET.shadowCard`)

### Migration Status

- ✅ `editorial_tokens.dart` (ET) defined — the new source of truth
- ✅ Sample screen: client 发现页 `lib/features/client/discover/client_discover_screen.dart`
- ⏳ Remaining screens still on legacy `DT` (light) — migrate screen-by-screen.
  Until a screen is migrated it renders in the old light style; that is expected.

### Forbidden Patterns

- No Material Design `AppBar` with default styling
- No standard `BottomNavigationBar` (use custom tab bar)
- No pink/rose gradients for UI chrome; accents come from `ET.accent` only
- No light `#f5f5f7` canvas on migrated screens (use `ET.bg`)
- No heavy glow effects
- No `border-radius: 8px` on primary buttons (use capsule/999px)

## Build & Run

```bash
cd mobile-flutter
flutter pub get
flutter run
```

## Project Structure

```
lib/
├── app/              # App entry, router, role select
├── core/
│   ├── theme/        # design_tokens.dart, app_theme.dart
│   ├── widgets/      # Shared components (nb_widgets.dart, nb_shared_components.dart)
│   ├── api/          # API client
│   ├── auth/         # Auth session, token store
│   └── ...
├── features/
│   ├── client/       # Customer screens (home, discover, works, profile, auth, etc.)
│   ├── technician/   # Technician screens (home, schedule, orders, etc.)
│   └── shared/       # Shared features (chat, booking)
```

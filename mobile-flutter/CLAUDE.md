# NailBook Mobile Flutter — Design System Guide

## Current Design Direction

The app is being redesigned to follow an **Apple-inspired aesthetic with iOS 26 Liquid Glass** principles.

### Design Reference Files (MUST READ before UI changes)

- **UI Prototype**: `../frontedDesign/nailbook-app.html` — Interactive HTML prototype (5 core screens)
- **Design Tokens**: `../frontedDesign/nailbook-tokens.html` — Visual token specification
- **Implementation Guide**: `../frontedDesign/CLAUDE_CODE_GUIDE.md` — Step-by-step Flutter implementation plan

### Design Principles

- **Image-first editorial layout** — images occupy 70-80% of screen space
- **Neutral foundation** — `#f5f5f7` background, `#ffffff` surface, `#1d1d1f` text
- **Warm rose accent** — `#c4627a` (from nail artwork, not brand identity)
- **Capsule geometry** — `border-radius: 999` for all primary actions
- **Glass materials** — `BackdropFilter` blur for navigation, overlays, info panels
- **Restrained depth** — surface contrast over heavy shadows
- **SF Pro typography** — Display for titles, Text for body, three-weight system (400/500/600)

### Key Token Changes (from old design)

| Token | Old Value | New Value |
|-------|-----------|-----------|
| primary | #FF6B8A | #C4627A |
| bg | #F8F9FC | #F5F5F7 |
| textPrimary | #1F2230 | #1D1D1F |
| textSecondary | #6A6A6A | #6E6E73 |
| border | #E5E7EB | #D2D2D7 |

### Forbidden Patterns

- No Material Design `AppBar` with default styling
- No standard `BottomNavigationBar` (use custom glass tab bar)
- No pink gradients (`#FF6B8A`, `#E91E63`) for UI chrome
- No heavy shadows or glow effects
- No `border-radius: 8px` on primary buttons (use capsule/999px)
- No accent color on metadata tags (use `DT.muted`)

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

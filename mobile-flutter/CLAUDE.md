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

全端已切换为暖调深色编辑风（client + technician + shared）。

- ✅ `editorial_tokens.dart` (ET) — new source of truth
- ✅ `DT` 核心颜色/渐变令牌已**指向 ET 值**（`design_tokens.dart` 中 `bg/surface/
  textPrimary/primary/border/...` = ET 别名），所有 DT-based 屏自动深色
- ✅ `app_theme.dart` 改为 `Brightness.dark`；按钮/输入/snackBar 深色化
- ✅ `GlassAppBar` 默认 `dark: true`；`GlassBottomSurface` 深色玻璃
- ✅ 客户端各屏直接用 ET；技师端/共享/订单流经令牌翻转 + 硬编码白卡清扫
- ⏳ 收尾：个别硬编码浅色 hex / 白色前景文字在 accent 按钮上的对比度微调。
  新代码请用 `ET`；勿再引入浅色 `Colors.white` 卡片背景或浅色 hex。

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

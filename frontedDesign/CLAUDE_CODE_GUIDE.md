> 颜色规范已于 2026-08-27 更新：以项目根目录 `design-system/nailbook/COLOR-STANDARD.md` 和 `colors.json` 为准。下文历史配色示例不再适用于新开发；非颜色规则继续有效。

# NailBook UI Redesign — Claude Code Implementation Guide

## Context

You are redesigning the NailBook Flutter mobile app (`/Users/shibo/Documents/Codex/nailBook/mobile-flutter/`) to match a premium Apple-inspired design with iOS 26 Liquid Glass aesthetics.

## Design Reference Files

**Before writing any Flutter code, read these two HTML files carefully.** They are the visual contract:

1. **UI Prototype**: `frontedDesign/nailbook-app.html` — Interactive high-fidelity prototype showing 5 core screens (Home, Discover, Work Detail, Profile, Login) inside an iPhone frame. Open it in a browser to see the exact layout, spacing, colors, typography, and glass effects.

2. **Design Tokens**: `frontedDesign/nailbook-tokens.html` — Complete visual specification of all design tokens: colors, typography scale, spacing, radius, shadows, glass materials, component specimens, and dark mode palette.

## Design Philosophy

This is an **image-first editorial** app, NOT a dashboard or tool. Key rules:

- Images occupy 70-80% of visible screen space
- Text is supporting information, not the primary content
- Cards feel like content showcases, not data containers
- The interface is neutral; visual drama comes from nail art photography
- iOS 26 Liquid Glass: translucent surfaces with backdrop blur for navigation and overlays
- Apple typography: SF Pro Display for titles (tight negative tracking), SF Pro Text for body
- Capsule geometry (`border-radius: 999`) for all primary actions
- Restrained depth: surface contrast over heavy shadows

## Step-by-Step Implementation Plan

### Step 1: Rewrite Design Tokens

**File**: `lib/core/theme/design_tokens.dart`

Replace the current pink-heavy palette with the new neutral seed system:

```dart
// New seed colors (from tokens spec)
static const Color primary = Color(0xFFC4627A);      // Warm Rose (was #FF6B8A)
static const Color bg = Color(0xFFF5F5F7);            // Apple Pale Gray (was #F8F9FC)
static const Color surface = Color(0xFFFFFFFF);
static const Color fg = Color(0xFF1D1D1F);            // Near-Black Ink (was #1F2230)
static const Color muted = Color(0xFF6E6E73);         // Apple Secondary (was #6A6A6A)
static const Color border = Color(0xFFD2D2D7);        // Apple Soft Border
static const Color borderStrong = Color(0xFF86868B);

// Glass material tokens
static const double glassBlurLight = 12.0;
static const double glassBlurStandard = 20.0;
static const double glassBlurHeavy = 40.0;
static const double glassSaturation = 1.8;
static const Color glassLight = Color(0x80FFFFFF);    // 50% white
static const Color glassStandard = Color(0xB8FFFFFF); // 72% white
static const Color glassHeavy = Color(0xE0FFFFFF);    // 88% white

// Keep existing spacing scale (it's already good)
// Keep existing radius scale (add 14px for inputs, 100px alias for capsules)
static const double rInput = 14;
static const double rCapsule = 999;
```

Remove or reduce: `primaryGradient`, `heroGradient`, `profileGradient`, `shadowPrimary`, `shadowButton`, `shadowButtonLg`. These pink gradients are replaced by neutral surfaces and glass effects.

### Step 2: Rewrite App Theme

**File**: `lib/core/theme/app_theme.dart`

- Replace `Color(0xFFE91E63)` with `DT.primary` (the new warm rose)
- Change `scaffoldBackgroundColor` to `DT.bg` (#F5F5F7)
- Remove heavy card shadows, use subtle shadows or borders
- Button theme: use capsule geometry (stadium shape) for elevated buttons
- Input decoration: `borderRadius: 14`, subtle borders

### Step 3: Create Glass Widget

Create a new reusable glass container widget:

**New file**: `lib/core/widgets/glass_container.dart`

```dart
import 'dart:ui';
import 'package:flutter/material.dart';

class GlassContainer extends StatelessWidget {
  final Widget child;
  final double blur;
  final double opacity;
  final double borderRadius;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;

  const GlassContainer({
    super.key,
    required this.child,
    this.blur = 20,
    this.opacity = 0.72,
    this.borderRadius = 20,
    this.padding,
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
          child: Container(
            padding: padding,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(opacity),
              borderRadius: BorderRadius.circular(borderRadius),
              border: Border.all(
                color: Colors.white.withOpacity(0.4),
                width: 0.5,
              ),
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}
```

### Step 4: Replace Bottom Navigation with Glass Tab Bar

**File**: `lib/features/client/home/client_home_screen.dart`

Replace the standard `BottomNavigationBar` with a custom floating glass tab bar:

- Use `GlassContainer` with `blur: 40, opacity: 0.88, borderRadius: 28`
- Position it with `Positioned` at the bottom, floating above content
- Use minimal SVG icons (from `cupertino_icons` or custom SVG)
- Active state: filled icon + label in `DT.primary`
- Inactive state: outlined icon + label in `DT.muted`
- Active indicator: small 4px dot below the icon

Reference the prototype's `.tab-bar` CSS for exact styling.

### Step 5: Redesign Home Screen

**File**: `lib/features/client/home/client_home_screen.dart` (the `_ClientHomeTabPage`)

Current structure (Card-based ListView) → New structure:

1. **Hero Section** (full-bleed, 440pt height)
   - Use `CachedNetworkImage` with a large nail art photo
   - Gradient overlay at bottom (transparent → 60% black)
   - Minimal overlay text: tag pill (glass), title, subtitle
   - Parallax: use `CustomScrollView` with `SliverAppBar` for scroll-driven parallax

2. **Trending Carousel** (horizontal scroll)
   - Cards: 240pt wide, 320pt tall, 20px radius
   - Full image with gradient overlay at bottom
   - Title + meta text in white on the gradient
   - Snap scrolling with `ScrollPhysics`

3. **AI Curated Collections** (2-column grid)
   - Cards: 180pt tall, 18px radius
   - Image + glass label overlay

4. **Personalized Picks** (editorial cards)
   - White card, 16px radius, subtle border
   - 88pt square thumbnail on left
   - Title + description + tag pills on right
   - Tags use `DT.muted` color, not accent

### Step 6: Redesign Discover Screen

**File**: `lib/features/client/discover/client_discover_screen.dart`

- **Header**: Large title (32px, w600, -0.03em tracking), subtitle in muted
- **Search bar**: Glass capsule (`GlassContainer` with `borderRadius: 999`)
- **Category pills**: Active = `DT.fg` filled, Inactive = white with subtle border
- **Masonry grid**: Keep the two-column layout but increase card sizes
  - Minimum card height: 190pt (was flexible)
  - 18px radius (was 20px)
  - Cleaner overlays: author pill (glass) at top-left, like count (glass) at top-right
  - Remove heavy gradient overlay (the current one has 3 stops)

### Step 7: Redesign Work Detail Screen

**File**: `lib/features/client/works/client_work_detail_screen.dart`

- **Gallery**: Keep PageView but make it 480pt tall (edge-to-edge)
- **Back button**: Glass circle at top-left
- **Info panel**: Replace the white container with a glass bottom sheet
  - `GlassContainer` with `blur: 40, opacity: 0.88, borderRadius: 28`
  - Drag handle at top
  - Title, description, tags as glass pills
  - Technician card (glass row)
  - Comments stream
- **Comment bar**: Glass container at bottom

### Step 8: Redesign Profile Screen

**File**: `lib/features/client/profile/client_profile_screen.dart`

- **Header**: Replace pink gradient with dark sophisticated gradient (`#1d1d1f` → `#48484a`)
- **Avatar**: Keep circular but use subtle border (3px white 20%)
- **Technician cards**: White cards, 16px radius, subtle border
- **Menu sections**: Group in white cards with 16px radius
  - Menu icons: 32px rounded squares with gradient backgrounds
  - Labels: 15px regular weight
  - Chevron: subtle `DT.border` color
- **Logout**: Full-width capsule button, red text

### Step 9: Redesign Login Screen

**File**: `lib/features/client/auth/client_login_screen.dart`

- **Brand**: Centered logo with subtle shadow
- **Inputs**: 52pt height, 14px radius, subtle border, focus state uses `DT.primary`
- **Primary CTA**: Capsule button (999px radius) with gradient
- **Agreement**: Circle checkbox with `DT.primary` when checked
- Remove: gradient decorations, heavy shadows

### Step 10: Update Shared Components

**Files**: `lib/core/widgets/nb_shared_components.dart` and `lib/core/widgets/nb_widgets.dart`

- `NBCard`: Reduce shadow to Level 1, add subtle border option
- `NBGlassContainer`: Add BackdropFilter support
- `NBSectionHeader`: Reduce title to 22px w600
- `NBPillBadge`: Use capsule geometry, muted colors for metadata
- `NBGradientCard`: Replace pink gradients with neutral or image-led designs
- Remove excessive gradient usage throughout

## Important Rules

1. **Keep all business logic intact** — API calls, state management, navigation, auth — only change UI/visual code
2. **Keep `go_router` routes unchanged** — no routing modifications
3. **Keep `Provider` state management unchanged**
4. **Use `CachedNetworkImage` for all images** — it's already in pubspec.yaml
5. **Test on iPhone 15 Pro simulator** (393x852) after each screen
6. **Match the prototype exactly** — open `nailbook-app.html` in browser as visual reference
7. **One screen at a time** — complete one screen fully before moving to the next

## Verification

After each screen, verify:
- No Material Design remnants (no `AppBar` with default styling, no standard `BottomNavigationBar`)
- Typography matches the token spec (sizes, weights, tracking)
- Colors match the neutral seed system
- Glass effects render correctly on device
- Touch targets are minimum 44px
- No hardcoded pink `#E91E63` or `#FF6B8A` remains

## File Priority Order

1. `design_tokens.dart` (foundation)
2. `app_theme.dart` (theme layer)
3. `glass_container.dart` (new component)
4. `client_home_screen.dart` (most visible screen)
5. `client_discover_screen.dart` (core browsing experience)
6. `client_work_detail_screen.dart` (immersive detail)
7. `client_profile_screen.dart` (settings/account)
8. `client_login_screen.dart` (first impression)
9. `nb_shared_components.dart` (shared widget updates)
10. `nb_widgets.dart` (remaining component updates)

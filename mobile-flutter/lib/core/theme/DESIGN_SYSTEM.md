# NailArt Studio Design System

A comprehensive, Airbnb-inspired design system for consistent UI across the app.

## Table of Contents

- [Colors](#colors)
- [Typography](#typography)
- [Spacing](#spacing)
- [Radius](#radius)
- [Shadows](#shadows)
- [Usage](#usage)

---

## Colors

### Primary (Brand)
Used for main CTAs, active states, and brand identity.

```dart
DT.primary        // #FF6B8A - Main brand color
DT.primaryDark    // #E00B41 - Dark variant
DT.primaryLight   // #FF88A0 - Light variant
DT.primaryPale    // #FFB0BE - Pale variant
DT.primarySoft    // #FFF0F5 - Soft background
```

### Secondary
Used for secondary actions and neutral elements.

```dart
DT.secondary      // #6B7280
DT.secondaryDark  // #4B5563
DT.secondaryLight // #9CA3AF
DT.secondarySoft  // #F3F4F6
```

### Success
Used for positive states, confirmations, and active indicators.

```dart
DT.success        // #31B46C - Main success color
DT.successDark    // #059669 - Dark variant
DT.successLight   // #6EE7B7 - Light variant
DT.successSoft    // #EEF9F1 - Soft background
DT.successBg      // #F0FDF4 - Background
DT.successBorder  // #BBF7D0 - Border
DT.successText    // #059669 - Text
```

### Warning
Used for caution states and attention-needed indicators.

```dart
DT.warning        // #FFA500 - Main warning color
DT.warningDark    // #D97706 - Dark variant
DT.warningLight   // #FCD34D - Light variant
DT.warningSoft    // #FFF1E5 - Soft background
DT.warningBg      // #FFF7ED - Background
DT.warningBorder  // #FEF3C7 - Border
DT.warningText    // #D97706 - Text
```

### Error
Used for error states, destructive actions, and critical alerts.

```dart
DT.error          // #FF4962 - Main error color
DT.errorDark      // #DC2626 - Dark variant
DT.errorLight     // #FCA5A5 - Light variant
DT.errorSoft      // #FEF2F2 - Soft background
DT.errorBg        // #FEF2F2 - Background
DT.errorBorder    // #FECACA - Border
DT.errorText      // #DC2626 - Text
```

### Info
Used for informational states and neutral highlights.

```dart
DT.info           // #428BFF - Main info color
DT.infoDark       // #2563EB - Dark variant
DT.infoLight      // #93C5FD - Light variant
DT.infoSoft       // #EDF3FF - Soft background
DT.infoBg         // #EFF6FF - Background
DT.infoBorder     // #BFDBFE - Border
DT.infoText       // #2563EB - Text
```

### Text Colors
Semantic text color hierarchy.

```dart
DT.textPrimary     // #1F2230 - Main text (headings, body)
DT.textSecondary   // #6A6A6A - Secondary text (labels, descriptions)
DT.textTertiary    // #8D8590 - Tertiary text (hints, placeholders)
DT.textMuted       // #929292 - Muted text (disabled, timestamps)
DT.textQuaternary  // #C9BEC6 - Quaternary text (very subtle)
DT.textWhite       // White    - Text on dark/colored backgrounds
DT.textDisabled    // #D1D5DB - Disabled text
```

### Surface Colors
Background and surface colors for containers.

```dart
DT.bg              // #F8F9FC - Main background
DT.bgWarm          // #FFF9F8 - Warm background
DT.bgPink          // #FFFDFD - Pink tint background
DT.surface         // White    - Card/sheet surfaces
DT.surfaceAlt      // #F7F7F7 - Alternate surface
DT.surfaceDisabled // #F9FAFB - Disabled surface
```

### Border Colors
Border and divider colors.

```dart
DT.border          // #E5E7EB - Standard border
DT.borderLight     // #F2E6EC - Light border
DT.borderPrimary   // #F2D5DE - Primary-tinted border
DT.primaryBorder   // #FFD9E6 - Strong primary border
DT.hairline        // #E2E8F0 - Hairline borders
DT.divider         // #F2F0F3 - Divider lines
```

---

## Typography

### Display Styles
Large, prominent text for hero sections and splash screens.

```dart
DT.displayLarge   // 34px, w700, -0.5 letter spacing, 1.2 height
DT.displayMedium  // 28px, w700, -0.5 letter spacing, 1.2 height
DT.displaySmall   // 24px, w600, -0.3 letter spacing, 1.3 height
```

**Usage:**
```dart
Text('Welcome', style: DT.displayLarge)
Text('Section Title', style: DT.displaySmall.copyWith(color: DT.primary))
```

### Title Styles
Section headers and card titles.

```dart
DT.titleLarge     // 20px, w600, -0.2 letter spacing, 1.4 height
DT.titleMedium    // 17px, w600, 1.4 height
DT.titleSmall     // 15px, w600, 1.4 height
```

**Usage:**
```dart
Text('Next Order', style: DT.titleMedium)
Text('Card Title', style: DT.titleSmall)
```

### Body Styles
Main content text.

```dart
DT.bodyLarge      // 16px, w400, 1.5 height
DT.bodyMedium     // 14px, w400, 1.5 height
DT.bodySmall      // 13px, w400, 1.5 height, secondary color
```

**Usage:**
```dart
Text('Main content paragraph', style: DT.bodyLarge)
Text('Description text', style: DT.bodyMedium)
Text('Secondary info', style: DT.bodySmall)
```

### Caption Styles
Small labels, timestamps, and helper text.

```dart
DT.captionLarge   // 12px, w400, 1.4 height, tertiary color
DT.captionMedium  // 11px, w400, 1.4 height, muted color
DT.captionSmall   // 10px, w400, 1.4 height, muted color
```

**Usage:**
```dart
Text('2 hours ago', style: DT.captionLarge)
Text('Optional label', style: DT.captionMedium)
Text('Badge text', style: DT.captionSmall.copyWith(fontWeight: FontWeight.w600))
```

---

## Spacing

Consistent spacing scale based on 4px grid.

```dart
DT.space4   // 4px  - Tight spacing (icon gaps, inline elements)
DT.space8   // 8px  - Small spacing (list item padding, compact gaps)
DT.space12  // 12px - Medium spacing (form field gaps, card padding)
DT.space16  // 16px - Standard spacing (section gaps, standard padding)
DT.space24  // 24px - Large spacing (section separators, major gaps)
DT.space32  // 32px - Extra large spacing (page padding, hero sections)
```

### Legacy Aliases (for backward compatibility)
```dart
DT.xs   = DT.space4
DT.sm   = DT.space8
DT.md   = DT.space12
DT.lg   = DT.space16
DT.xl   = 20
DT.xxl  = DT.space24
DT.xxxl = DT.space32
```

### Padding Helpers
Pre-built EdgeInsets for common patterns.

```dart
// All sides
DT.padding4    // EdgeInsets.all(4)
DT.padding8    // EdgeInsets.all(8)
DT.padding12   // EdgeInsets.all(12)
DT.padding16   // EdgeInsets.all(16)
DT.padding24   // EdgeInsets.all(24)
DT.padding32   // EdgeInsets.all(32)

// Horizontal
DT.paddingHorizontal4   // EdgeInsets.symmetric(horizontal: 4)
DT.paddingHorizontal8   // EdgeInsets.symmetric(horizontal: 8)
DT.paddingHorizontal12  // EdgeInsets.symmetric(horizontal: 12)
DT.paddingHorizontal16  // EdgeInsets.symmetric(horizontal: 16)
DT.paddingHorizontal24  // EdgeInsets.symmetric(horizontal: 24)

// Vertical
DT.paddingVertical4     // EdgeInsets.symmetric(vertical: 4)
DT.paddingVertical8     // EdgeInsets.symmetric(vertical: 8)
DT.paddingVertical12    // EdgeInsets.symmetric(vertical: 12)
DT.paddingVertical16    // EdgeInsets.symmetric(vertical: 16)
DT.paddingVertical24    // EdgeInsets.symmetric(vertical: 24)
```

---

## Radius

Border radius scale for consistent rounding.

```dart
DT.radius8   // 8px  - Small radius (chips, tags, small buttons)
DT.radius12  // 12px - Medium radius (inputs, standard buttons)
DT.radius16  // 16px - Large radius (cards, modals)
DT.radius24  // 24px - Extra large radius (hero cards, bottom sheets)
```

### Legacy Aliases
```dart
DT.rSm   = DT.radius8
DT.rMd   = DT.radius12
DT.rLg   = DT.radius16
DT.rXl   = 20
DT.rXxl  = DT.radius24
DT.rCard = 28
DT.rHero = 32
DT.rFull = 999 (fully rounded)
```

### BorderRadius Helpers
Pre-built BorderRadius instances.

```dart
DT.borderRadius8     // BorderRadius.circular(8)
DT.borderRadius12    // BorderRadius.circular(12)
DT.borderRadius16    // BorderRadius.circular(16)
DT.borderRadius24    // BorderRadius.circular(24)
DT.borderRadiusCard  // BorderRadius.circular(28)
DT.borderRadiusFull  // BorderRadius.circular(999)
```

---

## Shadows

Elevation shadows for depth and hierarchy.

```dart
DT.shadowSm           // Subtle shadow for small elements
DT.shadowMd           // Medium shadow for cards
DT.shadowLg           // Large shadow for elevated elements
DT.shadowPrimary      // Primary-colored shadow for CTAs
DT.shadowCard         // Card-specific shadow
DT.shadowHero         // Hero section shadow
DT.shadowHeroSm       // Small hero shadow
DT.shadowButton       // Button shadow
DT.shadowButtonLg     // Large button shadow
DT.shadowButtonOutline // Outline button shadow
DT.shadowTile         // Tile shadow
DT.shadowTileLg       // Large tile shadow
```

**Usage:**
```dart
Container(
  decoration: BoxDecoration(
    color: Colors.white,
    borderRadius: DT.borderRadiusCard,
    boxShadow: DT.shadowCard,
  ),
  child: ...
)
```

---

## Usage

### Basic Usage

```dart
import '../core/theme/design_tokens.dart';

// Colors
Container(
  color: DT.primary,
  child: Text('Hello', style: TextStyle(color: DT.textWhite)),
)

// Spacing
Padding(
  padding: const EdgeInsets.all(DT.space16),
  child: Column(
    children: [
      Text('Title', style: DT.titleMedium),
      const SizedBox(height: DT.space8),
      Text('Body', style: DT.bodyMedium),
    ],
  ),
)

// Radius
Container(
  decoration: BoxDecoration(
    borderRadius: DT.borderRadius12,
    color: DT.surface,
  ),
)

// Shadows
Container(
  decoration: BoxDecoration(
    borderRadius: DT.borderRadiusCard,
    boxShadow: DT.shadowCard,
    color: Colors.white,
  ),
)
```

### Theme Access

The app theme is configured in `AppTheme.light` and automatically applies design tokens to Material components.

```dart
// Access theme
final theme = Theme.of(context);

// Use theme colors
Container(color: theme.colorScheme.primary)

// Use theme text styles
Text('Title', style: theme.textTheme.titleLarge)
```

### Custom Styling

For custom styling beyond the theme, use DT tokens directly:

```dart
Container(
  padding: DT.padding16,
  decoration: BoxDecoration(
    color: DT.surface,
    borderRadius: DT.borderRadiusCard,
    boxShadow: DT.shadowCard,
    border: Border.all(color: DT.border),
  ),
  child: Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text('Card Title', style: DT.titleMedium),
      const SizedBox(height: DT.space8),
      Text('Card description', style: DT.bodySmall),
      const SizedBox(height: DT.space16),
      Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: DT.space12,
              vertical: DT.space4,
            ),
            decoration: BoxDecoration(
              color: DT.successSoft,
              borderRadius: DT.borderRadius8,
            ),
            child: Text('Active', style: DT.captionMedium.copyWith(
              color: DT.successText,
              fontWeight: FontWeight.w600,
            )),
          ),
        ],
      ),
    ],
  ),
)
```

---

## Best Practices

1. **Always use DT tokens** instead of hardcoded values
2. **Use semantic color names** (e.g., `DT.textPrimary` not `DT.textSecondary` for main text)
3. **Use spacing tokens** consistently (4, 8, 12, 16, 24, 32)
4. **Use radius tokens** for consistent rounding
5. **Use text styles** for typography, customize with `.copyWith()` when needed
6. **Use shadow helpers** for depth effects
7. **Use padding helpers** for common spacing patterns

---

## Files

- `design_tokens.dart` - All design tokens (colors, typography, spacing, radius, shadows)
- `app_theme.dart` - Material Theme configuration using tokens
- `DESIGN_SYSTEM.md` - This documentation

---

*Last updated: 2026/05/30*

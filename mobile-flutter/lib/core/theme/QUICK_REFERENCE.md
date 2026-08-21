# Design System Quick Reference

## Colors

### Primary & Secondary
```dart
DT.primary         // #FF6B8A
DT.primaryDark     // #E00B41
DT.primarySoft     // #FFF0F5

DT.secondary       // #6B7280
DT.secondarySoft   // #F3F4F6
```

### Status Colors
```dart
// Success
DT.success         // #31B46C
DT.successSoft     // #EEF9F1
DT.successText     // #059669

// Warning
DT.warning         // #FFA500
DT.warningSoft     // #FFF1E5
DT.warningText     // #D97706

// Error
DT.error           // #FF4962
DT.errorSoft       // #FEF2F2
DT.errorText       // #DC2626

// Info
DT.info            // #428BFF
DT.infoSoft        // #EDF3FF
DT.infoText        // #2563EB
```

### Text Colors
```dart
DT.textPrimary     // #1F2230 - Main text
DT.textSecondary   // #6A6A6A - Secondary
DT.textTertiary    // #8D8590 - Hints
DT.textMuted       // #929292 - Disabled
```

### Surfaces
```dart
DT.bg              // #F8F9FC - Background
DT.surface         // White - Cards
DT.surfaceAlt      // #F7F7F7 - Alternate
DT.surfaceDisabled // #F9FAFB - Disabled
```

### Borders
```dart
DT.border          // #E5E7EB
DT.borderLight     // #F2E6EC
DT.divider         // #F2F0F3
```

---

## Typography

### Display (Hero sections)
```dart
DT.displayLarge    // 34px w700
DT.displayMedium   // 28px w700
DT.displaySmall    // 24px w600
```

### Titles (Section headers)
```dart
DT.titleLarge      // 20px w600
DT.titleMedium     // 17px w600
DT.titleSmall      // 15px w600
```

### Body (Content)
```dart
DT.bodyLarge       // 16px w400
DT.bodyMedium      // 14px w400
DT.bodySmall       // 13px w400 (secondary color)
```

### Captions (Labels)
```dart
DT.captionLarge    // 12px w400 (tertiary color)
DT.captionMedium   // 11px w400 (muted color)
DT.captionSmall    // 10px w400 (muted color)
```

---

## Spacing

```dart
DT.space4   // 4px
DT.space8   // 8px
DT.space12  // 12px
DT.space16  // 16px
DT.space24  // 24px
DT.space32  // 32px
```

### Padding Helpers
```dart
DT.padding16            // all(16)
DT.paddingHorizontal16  // horizontal(16)
DT.paddingVertical16    // vertical(16)
```

---

## Radius

```dart
DT.radius8   // 8px  (chips, tags)
DT.radius12  // 12px (inputs, buttons)
DT.radius16  // 16px (cards)
DT.radius24  // 24px (large cards)
```

### Helpers
```dart
DT.borderRadius8
DT.borderRadius12
DT.borderRadius16
DT.borderRadius24
DT.borderRadiusCard   // 28px
DT.borderRadiusFull   // 999px
```

---

## Shadows

```dart
DT.shadowSm      // Subtle
DT.shadowMd      // Medium
DT.shadowCard    // Cards
DT.shadowButton  // Buttons
```

---

## Common Patterns

### Card
```dart
Container(
  padding: DT.padding16,
  decoration: BoxDecoration(
    color: DT.surface,
    borderRadius: DT.borderRadiusCard,
    boxShadow: DT.shadowCard,
  ),
  child: Column(
    children: [
      Text('Title', style: DT.titleMedium),
      SizedBox(height: DT.space8),
      Text('Body', style: DT.bodyMedium),
    ],
  ),
)
```

### Badge
```dart
Container(
  padding: EdgeInsets.symmetric(
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
)
```

### Button
```dart
Container(
  height: 44,
  decoration: BoxDecoration(
    gradient: DT.primaryGradient,
    borderRadius: DT.borderRadius12,
    boxShadow: DT.shadowButton,
  ),
  child: Center(
    child: Text('Submit', style: DT.titleSmall.copyWith(color: Colors.white)),
  ),
)
```

### Input
```dart
TextField(
  decoration: InputDecoration(
    hintText: 'Enter text',
    hintStyle: DT.bodyMedium.copyWith(color: DT.textMuted),
    filled: true,
    fillColor: DT.surfaceDisabled,
    border: OutlineInputBorder(
      borderRadius: DT.borderRadius12,
      borderSide: BorderSide(color: DT.border),
    ),
    contentPadding: DT.padding16,
  ),
)
```

---

*Quick reference for NailArt Studio Design System*

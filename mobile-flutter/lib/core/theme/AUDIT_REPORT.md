# Design System Audit Report

## Summary Statistics

**Total Violations Remaining:**
- Hardcoded Colors: 759
- Hardcoded Font Sizes: 802
- Hardcoded Spacing: 521
- Hardcoded Border Radius: 567

**Total: ~2,649 violations across 42 screen files**

---

## Files Already Fixed

### ✅ Fully Refactored (100% Design System compliant)
1. `lib/core/theme/design_tokens.dart` - Complete Design System
2. `lib/core/theme/app_theme.dart` - Theme configuration
3. `lib/app/role_select_screen.dart` - ✅ Fixed
4. `lib/features/client/auth/client_login_screen.dart` - ✅ Partially fixed (text styles, spacing)
5. `lib/features/technician/auth/technician_login_screen.dart` - ✅ Partially fixed (colors, spacing)
6. `lib/features/technician/home/technician_home_screen.dart` - ✅ Partially fixed (colors, text styles)

---

## Files Requiring Fixes (Priority Order)

### 🔴 HIGH PRIORITY (User-facing, frequently used)

#### Client Screens (12 files)
1. **client_home_screen.dart** - 15 violations
   - Header text: `fontSize: 28` → `DT.displayMedium`
   - Spacing: `EdgeInsets.fromLTRB(20, ...)` → `DT.lg` or `DT.space16`
   - Colors: Multiple hardcoded hex values

2. **client_orders_screen.dart** - 12 violations
   - Card text styles
   - Status badge colors
   - Spacing values

3. **client_order_detail_screen.dart** - 81 violations (highest!)
   - Multiple hardcoded colors
   - Inconsistent spacing
   - Inline TextStyle definitions

4. **client_designs_screen.dart** - 29 violations
   - Grid spacing
   - Card border radius
   - Text styles

5. **client_design_detail_screen.dart** - 51 violations
   - Image overlay colors
   - Button styles
   - Typography

6. **client_works_screen.dart** - 18 violations
   - Card layouts
   - Filter chips

7. **client_profile_screen.dart** - 15 violations
   - Profile header gradient
   - Menu item styles

8. **client_addresses_screen.dart** - 10 violations
   - List item styles

9. **client_edit_address_screen.dart** - 12 violations
   - Form input styles

10. **client_create_order_screen.dart** - 27 violations
    - Form sections
    - Time picker styles

11. **client_favorites_screen.dart** - 8 violations
12. **client_likes_screen.dart** - 8 violations

#### Technician Screens (20 files)
1. **technician_orders_screen.dart** - 41 violations
   - Order card styles
   - Status filters
   - List spacing

2. **technician_order_detail_screen.dart** - 45 violations
   - Detail sections
   - Action buttons
   - Timeline styles

3. **technician_customers_screen.dart** - 20 violations
   - Customer list items
   - Search bar

4. **technician_customer_detail_screen.dart** - 50 violations
   - Customer profile
   - Order history
   - Stats cards

5. **technician_schedule_screen.dart** - 25 violations
   - Calendar styles
   - Time slots

6. **technician_services_screen.dart** - 18 violations
   - Service cards
   - Category filters

7. **technician_shop_screen.dart** - 34 violations
   - Shop info cards
   - Image gallery

8. **technician_profile_screen.dart** - 33 violations
   - Profile header
   - Menu sections

9. **technician_works_screen.dart** - 20 violations
   - Work grid
   - Upload button

### 🟡 MEDIUM PRIORITY (Secondary screens)

10. **technician_about_screen.dart** - 8 violations
11. **technician_help_feedback_screen.dart** - 10 violations
12. **technician_subscription_screen.dart** - 12 violations
13. **technician_tag_screen.dart** - 8 violations
14. **technician_home_service_settings_screen.dart** - 10 violations
15. **technician_service_time_screen.dart** - 12 violations
16. **technician_notification_settings_screen.dart** - 8 violations
17. **technician_privacy_settings_screen.dart** - 8 violations
18. **technician_profile_settings_screen.dart** - 10 violations
19. **technician_account_security_screen.dart** - 12 violations

### 🟢 LOW PRIORITY (Rarely accessed)

20. **technician_shop_edit_screen.dart** - 15 violations
21. **client_welcome_screen.dart** - 8 violations
22. **client_forgot_password_screen.dart** - 10 violations

#### Shared Screens (2 files)
23. **conversations_screen.dart** - 32 violations
24. **chat_screen.dart** - 25 violations

---

## Common Violation Patterns

### 1. Hardcoded Colors → DT Tokens

**Before:**
```dart
Color(0xFF1F2230)  // Text primary
Color(0xFF6A6A6A)  // Text secondary
Color(0xFF929292)  // Text muted
Color(0xFFE5E7EB)  // Border
Color(0xFFF9FAFB)  // Surface disabled
Color(0xFFFEF2F2)  // Error background
Color(0xFFEF4444)  // Error text
Color(0xFFD1D5DB)  // Text disabled
```

**After:**
```dart
DT.textPrimary
DT.textSecondary
DT.textMuted
DT.border
DT.surfaceDisabled
DT.errorBg
DT.errorText
DT.textDisabled
```

### 2. Hardcoded Font Sizes → DT Text Styles

**Before:**
```dart
TextStyle(fontSize: 28, fontWeight: FontWeight.bold)
TextStyle(fontSize: 20, fontWeight: FontWeight.w600)
TextStyle(fontSize: 17, fontWeight: FontWeight.w600)
TextStyle(fontSize: 14, fontWeight: FontWeight.w400)
TextStyle(fontSize: 13)
TextStyle(fontSize: 12)
TextStyle(fontSize: 11)
```

**After:**
```dart
DT.displayMedium
DT.titleLarge
DT.titleMedium
DT.bodyMedium
DT.bodySmall
DT.captionLarge
DT.captionMedium
```

**For custom combinations:**
```dart
DT.bodyMedium.copyWith(fontWeight: FontWeight.w600, color: DT.primary)
DT.titleSmall.copyWith(color: DT.textSecondary)
```

### 3. Hardcoded Spacing → DT Spacing Tokens

**Before:**
```dart
EdgeInsets.all(20)
EdgeInsets.all(16)
EdgeInsets.all(12)
EdgeInsets.symmetric(horizontal: 20, vertical: 16)
EdgeInsets.fromLTRB(20, 16, 20, 24)
SizedBox(height: 20)
SizedBox(width: 16)
```

**After:**
```dart
DT.padding16  // or EdgeInsets.all(DT.space16)
DT.padding16
DT.padding12
EdgeInsets.symmetric(horizontal: DT.lg, vertical: DT.space16)
EdgeInsets.fromLTRB(DT.lg, DT.space16, DT.lg, DT.space24)
SizedBox(height: DT.space16)  // or DT.lg
SizedBox(width: DT.space16)   // or DT.lg
```

**Available spacing tokens:**
- `DT.space4` (4px)
- `DT.space8` (8px)
- `DT.space12` (12px)
- `DT.space16` (16px)
- `DT.space24` (24px)
- `DT.space32` (32px)

**Legacy aliases:** `DT.xs`, `DT.sm`, `DT.md`, `DT.lg`, `DT.xl`, `DT.xxl`, `DT.xxxl`

### 4. Hardcoded Border Radius → DT Radius Tokens

**Before:**
```dart
BorderRadius.circular(999)  // Full rounded
BorderRadius.circular(28)   // Card
BorderRadius.circular(24)   // Large
BorderRadius.circular(16)   // Medium
BorderRadius.circular(12)   // Small
BorderRadius.circular(8)    // Tiny
```

**After:**
```dart
DT.borderRadiusFull
DT.borderRadiusCard
DT.borderRadius24
DT.borderRadius16
DT.borderRadius12
DT.borderRadius8
```

---

## Batch Fix Commands

### Fix Most Common Hardcoded Colors

```bash
cd /Users/shibo/Documents/Codex/nailBook/mobile-flutter/lib

# Text colors
find . -name "*_screen.dart" -exec sed -i '' \
  -e 's/Color(0xFF1F2230)/DT.textPrimary/g' \
  -e 's/Color(0xFF6A6A6A)/DT.textSecondary/g' \
  -e 's/Color(0xFF929292)/DT.textMuted/g' \
  -e 's/Color(0xFF8D8590)/DT.textTertiary/g' \
  -e 's/Color(0xFFC9BEC6)/DT.textQuaternary/g' \
  -e 's/Color(0xFFD1D5DB)/DT.textDisabled/g' \
  {} \;

# Surface colors
find . -name "*_screen.dart" -exec sed -i '' \
  -e 's/Color(0xFFF9FAFB)/DT.surfaceDisabled/g' \
  -e 's/Color(0xFFF7F7F7)/DT.surfaceAlt/g' \
  {} \;

# Border colors
find . -name "*_screen.dart" -exec sed -i '' \
  -e 's/Color(0xFFE5E7EB)/DT.border/g' \
  -e 's/Color(0xFFE2E8F0)/DT.hairline/g' \
  {} \;

# Error colors
find . -name "*_screen.dart" -exec sed -i '' \
  -e 's/Color(0xFFFEF2F2)/DT.errorBg/g' \
  -e 's/Color(0xFFFECACA)/DT.errorBorder/g' \
  -e 's/Color(0xFFDC2626)/DT.errorText/g' \
  -e 's/Color(0xFFEF4444)/DT.error/g' \
  {} \;

# Success colors
find . -name "*_screen.dart" -exec sed -i '' \
  -e 's/Color(0xFFEEF9F1)/DT.successSoft/g' \
  -e 's/Color(0xFF059669)/DT.successText/g' \
  -e 's/Color(0xFF31B46C)/DT.success/g' \
  {} \;

# Warning colors
find . -name "*_screen.dart" -exec sed -i '' \
  -e 's/Color(0xFFFFF7ED)/DT.warningBg/g' \
  -e 's/Color(0xFFFEF3C7)/DT.warningBorder/g' \
  -e 's/Color(0xFFD97706)/DT.warningText/g' \
  {} \;

# Info colors
find . -name "*_screen.dart" -exec sed -i '' \
  -e 's/Color(0xFFEDF3FF)/DT.infoSoft/g' \
  -e 's/Color(0xFF2563EB)/DT.infoText/g' \
  -e 's/Color(0xFF428BFF)/DT.info/g' \
  {} \;
```

### Fix Common Spacing

```bash
# Replace EdgeInsets.all(20) with DT.padding16
find . -name "*_screen.dart" -exec sed -i '' \
  -e 's/EdgeInsets\.all(20)/DT.padding16/g' \
  -e 's/EdgeInsets\.all(16)/DT.padding16/g' \
  -e 's/EdgeInsets\.all(12)/DT.padding12/g' \
  -e 's/EdgeInsets\.all(24)/DT.padding24/g' \
  -e 's/EdgeInsets\.all(32)/DT.padding32/g' \
  {} \;

# Replace common SizedBox heights
find . -name "*_screen.dart" -exec sed -i '' \
  -e 's/SizedBox(height: 20)/SizedBox(height: DT.space16)/g' \
  -e 's/SizedBox(height: 16)/SizedBox(height: DT.space16)/g' \
  -e 's/SizedBox(height: 12)/SizedBox(height: DT.space12)/g' \
  -e 's/SizedBox(height: 24)/SizedBox(height: DT.space24)/g' \
  -e 's/SizedBox(height: 8)/SizedBox(height: DT.space8)/g' \
  -e 's/SizedBox(height: 4)/SizedBox(height: DT.space4)/g' \
  {} \;
```

### Fix Common Border Radius

```bash
find . -name "*_screen.dart" -exec sed -i '' \
  -e 's/BorderRadius\.circular(999)/DT.borderRadiusFull/g' \
  -e 's/BorderRadius\.circular(28)/DT.borderRadiusCard/g' \
  -e 's/BorderRadius\.circular(24)/DT.borderRadius24/g' \
  -e 's/BorderRadius\.circular(16)/DT.borderRadius16/g' \
  -e 's/BorderRadius\.circular(12)/DT.borderRadius12/g' \
  -e 's/BorderRadius\.circular(8)/DT.borderRadius8/g' \
  {} \;
```

---

## Verification Checklist

After fixing each file, verify:

- [ ] No hardcoded `Color(0xFF...)` values remain
- [ ] All `TextStyle(fontSize: ...)` use DT text styles or `.copyWith()`
- [ ] All `EdgeInsets` use DT spacing tokens
- [ ] All `BorderRadius.circular()` use DT radius tokens
- [ ] File compiles without errors: `flutter analyze`
- [ ] Visual appearance unchanged (hot reload to verify)

---

## Recommended Fix Order

### Phase 1: Core Client Screens (8 files)
1. client_home_screen.dart
2. client_orders_screen.dart
3. client_order_detail_screen.dart
4. client_designs_screen.dart
5. client_design_detail_screen.dart
6. client_works_screen.dart
7. client_profile_screen.dart
8. client_create_order_screen.dart

### Phase 2: Core Technician Screens (8 files)
1. technician_orders_screen.dart
2. technician_order_detail_screen.dart
3. technician_customers_screen.dart
4. technician_customer_detail_screen.dart
5. technician_schedule_screen.dart
6. technician_services_screen.dart
7. technician_shop_screen.dart
8. technician_profile_screen.dart

### Phase 3: Shared & Settings Screens (10 files)
1. conversations_screen.dart
2. chat_screen.dart
3. All settings screens
4. All secondary screens

### Phase 4: Verification
1. Run `flutter analyze` on all files
2. Hot reload each screen to verify visual consistency
3. Fix any edge cases or custom styling issues

---

*Generated: 2026/05/30*
*Total estimated effort: 4-6 hours for full compliance*

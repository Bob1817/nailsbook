# Technician Missing Pages — Flutter Alignment

## Context
The webapp technician-frontend has 9 pages that don't exist in the Flutter mobile app. This spec covers building all 9, following existing Flutter patterns (design tokens, go_router, ApiClient, Provider).

## Scope
All 9 pages, grouped by complexity:

**Static content (no API):** AboutPage, HelpFeedbackPage
**Toggle settings (localStorage-equivalent, SharedPreferences):** NotificationSettingsPage, PrivacySettingsPage
**Forms (API-backed):** ProfileSettingsPage, AccountSecurityPage, ServiceTimePage, TagManagementPage, ShopEditPage

---

## Shared Patterns

### Page Shell
Every new page follows the existing sub-page pattern:
- `Scaffold(backgroundColor: DT.bgWarm)`
- AppBar with back button and title
- `SingleChildScrollView` body with `padding: EdgeInsets.all(20)`
- White rounded cards (`borderRadius: 24`, `DT.shadowSm`) for grouping

### Router
Add routes to `router.dart` under the technician section. No query params — use path params or constructor args.

### Navigation
Add entries to `_buildSettingsCard` in `technician_profile_screen.dart`.

---

## Pages

### 1. AboutPage — `/technician/about`
**File:** `features/technician/about/technician_about_screen.dart`
- App icon: 80x80 rounded square with hero gradient + nail emoji
- App name "美甲师 Studio", version "1.0.0"
- Description paragraph (centered, muted text)
- Accordion: "用户协议" + "隐私政策" (expandable text blocks)
- Copyright footer "2026 美甲师 Studio · 保留所有权利"
- No API

### 2. HelpFeedbackPage — `/technician/help-feedback`
**File:** `features/technician/help_feedback/technician_help_feedback_screen.dart`
- FAQ section: 5 accordion items (single-expand), same questions as webapp
- Contact support section: phone row (400-800-1234, launches `tel:`) + WeChat row (nailbook-service, copies to clipboard with SnackBar)
- Footer: "客服工作时间：每日 9:00 - 21:00"
- No API

### 3. NotificationSettingsPage — `/technician/notification-settings`
**File:** `features/technician/settings/technician_notification_settings_screen.dart`
- 5 toggle switches, persisted via SharedPreferences:
  - `newOrder` 新预约提醒 (default true)
  - `quoteConfirm` 报价与确认提醒 (default true)
  - `tripReminder` 行程提醒 (default true)
  - `clientMessage` 客户消息 (default true)
  - `marketing` 营销与活动通知 (default false)
- Disclaimer: "消息推送能力上线后将按此设置生效"
- Pref key: `tech_notification_prefs`

### 4. PrivacySettingsPage — `/technician/privacy-settings`
**File:** `features/technician/settings/technician_privacy_settings_screen.dart`
- 4 toggle switches, persisted via SharedPreferences:
  - `showPhoneToClient` 向客户展示手机号 (default true)
  - `showOnlineStatus` 展示在线状态 (default true)
  - `worksVisibleDefault` 新作品默认公开 (default true)
  - `allowComments` 允许客户评论作品 (default true)
- Disclaimer text
- Pref key: `tech_privacy_prefs`

### 5. ProfileSettingsPage — `/technician/profile-settings`
**File:** `features/technician/settings/technician_profile_settings_screen.dart`
- Card 1 "基本信息":
  - Avatar (80x80 circle) with "更换头像" button → upload via `POST /technician/uploads/image`
  - Name input (required)
  - Phone input (disabled, read-only)
  - City input (optional)
  - Service area input (optional)
- Card 2 "社交媒体账号":
  - 5 inputs: 微博, 小红书, 抖音, 快手, 微信 (each with prefix hint)
- Fixed bottom save bar → `PATCH /technician/auth/profile`
- Pre-fill from profile on mount

### 6. AccountSecurityPage — `/technician/account-security`
**File:** `features/technician/settings/technician_account_security_screen.dart`
- Card 1 "账号信息": masked phone number display
- Card 2 "修改密码": current/new/confirm password fields
  - Validation: new >= 8 chars, contains letter + number, confirm matches
  - Submit → `PATCH /technician/auth/password`
- Clear fields on success, show SnackBar

### 7. ServiceTimePage — `/technician/service-time` (route exists, screen exists)
**Verify:** `technician_service_time_screen.dart` already exists. Confirm it matches webapp functionality. If aligned, skip.

### 8. TagManagementPage — `/technician/tags` (route exists, screen exists)
**Verify:** `technician_tag_screen.dart` already exists. Confirm it matches webapp functionality. If aligned, skip.

### 9. ShopEditPage — `/technician/shop/edit`
**File:** `features/technician/shop/technician_shop_edit_screen.dart`
- Accept optional `index` param for edit mode
- Sections: shop status toggle, name, address (province/city/district + detail), phone, business hours (7 weekday rows with open/close toggles + time pickers)
- Save → `PATCH /technician/auth/service-type` (sends full shopAddresses array)

---

## Files to Create
| # | File |
|---|---|
| 1 | `lib/features/technician/about/technician_about_screen.dart` |
| 2 | `lib/features/technician/help_feedback/technician_help_feedback_screen.dart` |
| 3 | `lib/features/technician/settings/technician_notification_settings_screen.dart` |
| 4 | `lib/features/technician/settings/technician_privacy_settings_screen.dart` |
| 5 | `lib/features/technician/settings/technician_profile_settings_screen.dart` |
| 6 | `lib/features/technician/settings/technician_account_security_screen.dart` |
| 7 | `lib/features/technician/shop/technician_shop_edit_screen.dart` |

## Files to Modify
| File | Change |
|---|---|
| `lib/app/router.dart` | Add 7 new routes |
| `lib/features/technician/profile/technician_profile_screen.dart` | Expand `_buildSettingsCard` with new entries |

## Verification
- Hot-reload after each page, verify layout
- Test form submissions (profile settings, password change)
- Test toggles persist across app restart (SharedPreferences)
- Test accordion expand/collapse
- Test phone call launch and clipboard copy

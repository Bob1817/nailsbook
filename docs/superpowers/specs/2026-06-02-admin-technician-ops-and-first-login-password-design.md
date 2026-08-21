# Admin Technician Operations & First-Login Password

## Overview

Three related improvements to the technician account lifecycle:

1. **Immediate activation**: Admin-created technician accounts are active immediately (no activation code flow required)
2. **Admin operations**: New Delete, Disable, and Reset Password actions in the admin technician management list
3. **First-login password change**: After admin creation or password reset, technicians must set a new password on their next login

---

## 1. Database Schema Changes

### File: `backend/prisma/schema.prisma`

**Technician model** — add field:

```prisma
model Technician {
  // ... existing fields ...
  mustChangePassword  Boolean   @default(false)
  status              String    @default("active")   // changed from "inactive"
  // ...
}
```

**Status values** (all three are valid):
- `active` — account is usable (new default for admin-created accounts)
- `suspended` — login blocked (admin "disable" action)
- `deleted` — soft-deleted, login blocked, visible in admin list with "deleted" tag
- `inactive` — legacy status, kept for existing accounts, no longer created

**`mustChangePassword` field**:
- `true` → set when admin creates account or resets password
- `false` → set when technician successfully sets a new password
- Login is allowed when `true`, but the technician is directed to set a new password before entering the app

**Migration**: Add the column with `@default(false)` so existing rows are unaffected. Existing `inactive` accounts remain as-is.

---

## 2. Backend API Changes

### 2.1 Admin Create Technician (modified)

**Endpoint**: `POST /api/admin/technicians`

Changes:
- `status` set to `"active"` (was `"inactive"`)
- `passwordHash` set to `bcrypt('123456', 10)` (unchanged)
- `mustChangePassword` set to `true`

### 2.2 Admin Reset Password (modified)

**Endpoint**: `POST /api/admin/technicians/:id/reset-password`

Changes:
- After resetting password hash, set `mustChangePassword = true`
- Increment `tokenVersion` (existing behavior)
- Still returns a temporary password for admin reference

### 2.3 Admin Delete Technician (new)

**Endpoint**: `DELETE /api/admin/technicians/:id`

- Permission: `technician.delete` (new — add to `backend/scripts/seed.ts` as `technician:delete`)
- Sets `status = "deleted"`
- Does NOT delete related data (orders, customers, revenue preserved)
- Returns the updated technician record

### 2.4 Admin Disable Technician (new)

**Endpoint**: `PATCH /api/admin/technicians/:id/disable`

- Permission: `technician.disable` (existing)
- Sets `status = "suspended"`
- Returns the updated technician record

### 2.5 Technician Login (modified)

**Endpoint**: `POST /api/technician/auth/login`

Changes to response:
- Add `mustChangePassword: boolean` to response body
- **Status checks happen BEFORE password validation** (at the same point where `inactive` is currently checked):
  - `deleted` → HTTP 403, error: "账号已被删除" (no JWT issued)
  - `suspended` → HTTP 403, error: "账号已被禁用" (no JWT issued)
  - `inactive` → HTTP 403 (existing behavior, no JWT issued)
- Only `active` accounts proceed to password validation
- `mustChangePassword` is included in the success response (JWT is issued either way)

Response shape:
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "technician": { ... },
  "mustChangePassword": true
}
```

### 2.6 Technician Set Password (new)

**Endpoint**: `POST /api/technician/auth/set-password`

- Guard: `TechnicianJwt` (requires valid JWT)
- Body: `{ "newPassword": "string" }`
- Validates password strength: 8+ chars, at least one letter, at least one digit
- Hashes new password, increments `tokenVersion`
- Sets `mustChangePassword = false`
- Returns new JWT pair (accessToken + refreshToken)

### 2.7 Admin Generate Invite Key (deprecated for new accounts)

**Endpoint**: `POST /api/admin/technicians/:id/invite-key`

Keep the endpoint for backward compatibility with existing `inactive` accounts. No new accounts will use this flow.

---

## 3. Admin Frontend Changes

### File: `admin-frontend/src/pages/Technicians.tsx`

**Technician list table** — new action buttons per row:

| Button | Visible when | Action | Confirmation dialog |
|--------|-------------|--------|---------------------|
| Delete | Always | `DELETE /admin/technicians/:id` | "确认删除该美甲师账号？删除后该账号将无法登录，但历史数据将被保留。" |
| Disable | `status === 'active'` | `PATCH /admin/technicians/:id/disable` | "确认禁用该美甲师账号？禁用后该账号将无法登录。" |
| Enable | `status === 'suspended'` | `PATCH /admin/technicians/:id/status` (active) | (no confirmation, existing behavior) |
| Reset Password | `status !== 'deleted'` | `POST /admin/technicians/:id/reset-password` | "确认重置该美甲师的登录密码？重置后该美甲师需要在下次登录时重新设置密码。" |

**Status column** — add `deleted` tag styling (gray/muted color)

**Create modal** — remove activation key section; account is created immediately active

**Edit modal**:
- Remove "Generate Activation Key" section (no longer needed for new accounts)
- Keep "Reset Login Password" button
- Hide edit/status actions for `deleted` accounts

### File: `admin-frontend/src/services/technician.ts`

Add methods:
```ts
deleteTechnician(id: number): Promise<void>
disableTechnician(id: number): Promise<Technician>
```

---

## 4. Technician Frontend Changes

### Login Flow

```
Phone entry (check-phone API)
    │
    ├── exists=false → Register (kept for backward compatibility)
    │
    └── exists=true → Password entry
            │
            ├── Login attempt:
            │   ├── status=deleted → Error: "账号已被删除" (no JWT)
            │   ├── status=suspended → Error: "账号已被禁用" (no JWT)
            │   ├── status=inactive → Error: "账号未激活" (no JWT, existing)
            │   └── status=active → Login succeeds (JWT issued)
            │
            └── Login success response includes mustChangePassword flag:
                ├── false → Enter app (normal flow)
                └── true → Set Password screen
                        │
                        ├── New password + confirm password
                        ├── Submit → POST /technician/auth/set-password
                        └── Success → Enter app
```

### New Component: `SetPasswordPage.tsx`

**File**: `technician-frontend/src/pages/SetPasswordPage.tsx`

- Route: `/set-password` (protected, requires JWT)
- Fields: new password, confirm password
- Validation: 8+ chars, letters + digits, passwords match
- On success: stores new JWT, navigates to home
- Cannot be skipped — no back button or navigation away
- Message: "请设置您的登录密码" (Please set your login password)

### Auth Service Changes

**File**: `technician-frontend/src/services/auth.ts`

- `login()` return type: add `mustChangePassword: boolean`
- New method: `setPassword(newPassword: string)` → POST `/technician/auth/set-password`
- Login handler: check `mustChangePassword` after login → navigate to `/set-password` if true

### Route Changes

**File**: `technician-frontend/src/App.tsx`

- Add `/set-password` route pointing to `SetPasswordPage`
- Protected route (requires JWT)

---

## 5. Edge Cases

| Scenario | Expected behavior |
|----------|-------------------|
| Admin deletes already-deleted technician | No-op, return current state |
| Admin disables already-suspended technician | No-op, return current state |
| Admin resets password for deleted technician | Error: cannot reset password for deleted account |
| Technician logs in with `mustChangePassword=true` but closes app before setting password | Next login still shows set-password screen |
| Existing `inactive` accounts | Still require invite key activation (backward compatible) |
| Admin creates technician with a phone that belongs to existing `deleted` account | Should reject (phone uniqueness still enforced) |
| Admin creates technician with a phone that belongs to existing `suspended` account | Should reject (phone uniqueness) |

---

## 6. Files Changed Summary

| Area | File | Change |
|------|------|--------|
| Schema | `backend/prisma/schema.prisma` | Add `mustChangePassword` field |
| Migration | `backend/prisma/migrations/` | Auto-generated migration |
| Backend | `backend/src/technicians/technicians.service.ts` | Modify create, add delete/disable |
| Backend | `backend/src/technicians/technicians.controller.ts` | Add delete/disable endpoints |
| Backend | `backend/src/technician-auth/technician-auth.service.ts` | Modify login response, add set-password |
| Backend | `backend/src/technician-auth/technician-auth.controller.ts` | Add set-password endpoint |
| Backend | `backend/scripts/seed.ts` | Add `technician:delete` permission |
| Admin UI | `admin-frontend/src/pages/Technicians.tsx` | Add delete/disable/reset buttons, update create modal |
| Admin UI | `admin-frontend/src/services/technician.ts` | Add delete/disable API methods |
| Tech UI | `technician-frontend/src/pages/SetPasswordPage.tsx` | New page |
| Tech UI | `technician-frontend/src/pages/Login.tsx` | Handle mustChangePassword redirect |
| Tech UI | `technician-frontend/src/services/auth.ts` | Add setPassword method, update login response type |
| Tech UI | `technician-frontend/src/App.tsx` | Add /set-password route |

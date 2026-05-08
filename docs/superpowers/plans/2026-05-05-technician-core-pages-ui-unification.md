# Technician Core Pages UI Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the technician app’s five core pages so the home page keeps an emotional branded hero while schedule, customers, messages, and me become restrained information pages with consistent cards, typography, spacing, and touch-friendly controls.

**Architecture:** First tighten the shared visual primitives already used by the technician app, then refit the page shells in dependency order: home/me relationship, schedule density, and finally customers/messages list treatment. Keep business logic intact; this is a UI-only refactor over existing data and routes. Verification focuses on build safety and local visual checks at mobile widths.

**Tech Stack:** React, TypeScript, Tailwind CSS, existing technician frontend base components (`AppPage`, `Card`, `Button`, `Tag`), Vite

---

## File Map

- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/components/base/Card.tsx`
  - Normalize reusable card surface variants for restrained information pages.
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/components/base/Button.tsx`
  - Tighten primary/secondary/outline button weights so page actions feel consistent.
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/components/layout/AppPage.tsx`
  - Standardize info-page title area, subtitle spacing, and content width rhythm.
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/components/TabBar.tsx`
  - Ensure the calmer info-page visual language still matches bottom navigation.
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/HomePage.tsx`
  - Preserve emotional hero but refine hierarchy, overlap, and module card consistency.
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/MePage.tsx`
  - Keep a softer personal control-center feel while reducing duplication with home.
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/SchedulePage.tsx`
  - Unify stats, date chips, map/list controls, and timeline density into restrained cards.
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/CustomersPage.tsx`
  - Rebuild search/filter/list spacing and customer cards around the shared information-page language.
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/MessagesPage.tsx`
  - Rebuild title, chips, search, and message/reminder cards with cleaner hierarchy.

---

### Task 1: Tighten Shared UI Primitives

**Files:**
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/components/base/Card.tsx`
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/components/base/Button.tsx`
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/components/layout/AppPage.tsx`
- Test: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/SchedulePage.tsx`

- [ ] **Step 1: Inspect current primitive APIs before editing**

Run:

```bash
sed -n '1,220p' /Users/shibo/Documents/Codex/nailBook/technician-frontend/src/components/base/Card.tsx
sed -n '1,260p' /Users/shibo/Documents/Codex/nailBook/technician-frontend/src/components/base/Button.tsx
sed -n '1,220p' /Users/shibo/Documents/Codex/nailBook/technician-frontend/src/components/layout/AppPage.tsx
```

Expected: confirm current prop signatures so page changes stay source-compatible.

- [ ] **Step 2: Add restrained information-card defaults**

Update `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/components/base/Card.tsx` to keep the same API but make the default surface lighter and more consistent:

```tsx
const baseClassName =
  'rounded-card bg-card shadow-[0_10px_30px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.04]';
```

If the file already uses `clsx`/`cn`, keep that pattern and only change the base visual tokens.

- [ ] **Step 3: Normalize button weights without changing call sites**

Update `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/components/base/Button.tsx` so variants stay the same but align visually:

```tsx
const variants = {
  primary:
    'h-12 rounded-button bg-primary px-lg text-title-sm font-semibold text-white shadow-[0_10px_24px_rgba(255,90,102,0.18)] active:bg-primary-hover',
  secondary:
    'h-11 rounded-button bg-primary-light px-lg text-body font-medium text-primary',
  outline:
    'h-11 rounded-button border border-border bg-white px-lg text-body font-medium text-text-secondary',
};
```

Do not add new variants in this task.

- [ ] **Step 4: Make AppPage the canonical info-page shell**

Update `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/components/layout/AppPage.tsx` so the default shell is calmer and more regular:

```tsx
<main className="min-h-full bg-page px-lg pb-24 pt-xl font-sans text-text-primary">
  <header className="mb-lg flex items-start justify-between gap-3">
    <div className="min-w-0">
      <h1 className="text-title-lg font-semibold leading-title text-text-primary">{title}</h1>
      {subtitle ? (
        <p className="mt-xs text-body text-text-secondary">{subtitle}</p>
      ) : null}
    </div>
    {actions ? <div className="flex shrink-0 items-center gap-sm">{actions}</div> : null}
  </header>
  <div className="space-y-lg">{children}</div>
</main>
```

Keep support for custom `className` and existing action slot behavior.

- [ ] **Step 5: Run a narrow build check**

Run:

```bash
cd /Users/shibo/Documents/Codex/nailBook/technician-frontend && npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add /Users/shibo/Documents/Codex/nailBook/technician-frontend/src/components/base/Card.tsx \
        /Users/shibo/Documents/Codex/nailBook/technician-frontend/src/components/base/Button.tsx \
        /Users/shibo/Documents/Codex/nailBook/technician-frontend/src/components/layout/AppPage.tsx
git commit -m "refactor: unify technician info page primitives"
```

### Task 2: Refine Home and Me Relationship

**Files:**
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/HomePage.tsx`
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/MePage.tsx`
- Test: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/HomePage.tsx`

- [ ] **Step 1: Snapshot current hero/overlap structure**

Run:

```bash
sed -n '1,260p' /Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/HomePage.tsx
sed -n '1,320p' /Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/MePage.tsx
```

Expected: confirm the existing negative-margin overlap and top-card structure.

- [ ] **Step 2: Make HomePage the only strongly emotional page**

In `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/HomePage.tsx`, keep the gradient hero but simplify the content hierarchy:

```tsx
<div className="relative overflow-hidden bg-[linear-gradient(135deg,#ff6b84_0%,#ff7da7_52%,#ffb78f_100%)] px-5 pt-12 pb-24">
  {/* identity row */}
  {/* concise status switch + share action */}
  {/* single white/12 earnings summary card */}
</div>

<div className="px-5">
  <div className="relative z-10 -mt-16 mb-4 rounded-[24px] bg-white p-4 shadow-[0_16px_34px_rgba(29,35,53,0.08)]">
    {/* 3-column summary */}
  </div>
</div>
```

The “今日行程” and “快捷操作” modules should use the same restrained white-card language as the info pages below.

- [ ] **Step 3: Make MePage a softer control center, not a second home page**

In `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/MePage.tsx`, keep the gradient but reduce its weight:

```tsx
<div className="relative overflow-hidden bg-[linear-gradient(135deg,#ff7a90_0%,#ff92b0_58%,#ffbf9d_100%)] px-5 pt-12 pb-20">
  {/* avatar + name + lighter status chips */}
</div>

<div className="px-5">
  <div className="relative z-10 -mt-14 mb-4 rounded-[24px] bg-white p-4 shadow-[0_14px_30px_rgba(29,35,53,0.08)]">
    {/* 3-column metrics */}
  </div>
</div>
```

Below the overlap card, convert “收入统计 / 行程与订单 / 常用工具 / 邀请码分享 / 设置” into consistent white modules with the same title spacing and icon plate treatment.

- [ ] **Step 4: Verify no overlap遮挡 returns**

Run:

```bash
cd /Users/shibo/Documents/Codex/nailBook/technician-frontend && npm run build
```

Expected: PASS.

Then visually verify in browser:
- Home hero does not cover the summary card text
- Me hero does not feel heavier than Home

- [ ] **Step 5: Commit**

```bash
git add /Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/HomePage.tsx \
        /Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/MePage.tsx
git commit -m "refactor: rebalance technician home and profile pages"
```

### Task 3: Rebuild Schedule Page into a Restrained Information Layout

**Files:**
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/SchedulePage.tsx`
- Test: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/SchedulePage.tsx`

- [ ] **Step 1: Preserve existing data logic, isolate visual sections**

Before editing, confirm the visual sections already present:

```bash
sed -n '1,420p' /Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/SchedulePage.tsx
```

Expected sections:
- date strip
- summary card
- map/list card
- route tip card
- timeline card
- deposit reminder card

- [ ] **Step 2: Normalize the top information density**

In `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/SchedulePage.tsx`, keep the same sections but align them visually:

```tsx
<Card className="px-sm py-sm">
  {/* tighter date chips, 44px min touch, lighter selected state */}
</Card>

<Card className="border border-[#f8d9d6] px-lg py-lg">
  {/* 4 stats with consistent number/unit typography */}
</Card>
```

Rules:
- primary number sizes must match across all four columns
- units use one smaller tier
- captions use the same `text-caption text-text-secondary`

- [ ] **Step 3: Reduce map visual noise and strengthen controls**

Keep the map/list toggle and route CTA, but update the container so controls read first:

```tsx
<Card className="overflow-hidden p-0">
  <div className="relative h-[420px] rounded-card bg-[#f7fafc]">
    {/* softer grid/background */}
    {/* top controls row */}
    {/* marker cards */}
    {/* route planning floating action */}
  </div>
</Card>
```

Do not replace the current mock/AMap logic in this task.

- [ ] **Step 4: Tighten timeline card hierarchy**

Keep the current data and actions, but make each appointment card prioritize:

```tsx
time -> customer name -> service tag -> address -> amount/deposit -> actions
```

Use smaller secondary copy, lighter borders, and avoid visual competition between avatar, tags, and action buttons.

- [ ] **Step 5: Run build and mobile visual verification**

Run:

```bash
cd /Users/shibo/Documents/Codex/nailBook/technician-frontend && npm run build
```

Expected: PASS.

Visual checks at mobile width:
- no horizontal scrolling
- no date-chip overflow
- no marker card content bleeding
- timeline cards remain readable at small widths

- [ ] **Step 6: Commit**

```bash
git add /Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/SchedulePage.tsx
git commit -m "refactor: unify technician schedule page layout"
```

### Task 4: Unify Customers and Messages as Matching Information Pages

**Files:**
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/CustomersPage.tsx`
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/MessagesPage.tsx`
- Test: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/CustomersPage.tsx`

- [ ] **Step 1: Standardize top title/search/filter rhythm**

For both customer and message pages, refit the top block into:

```tsx
<AppPage ...>
  <Card className="p-3.5">
    {/* search or search + filter chips */}
  </Card>
</AppPage>
```

Do not use emotional gradients on either page.

- [ ] **Step 2: Convert customer list cards into stable relationship cards**

In `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/CustomersPage.tsx`, each customer item should visually read as:

```tsx
avatar | name + tags
recent service / spend / frequency
light action entry
```

The selected-state and detail view should keep the current behavior but move to calmer white-card surfaces with lighter accent tags.

- [ ] **Step 3: Convert message list cards into one shared card language**

In `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/MessagesPage.tsx`, chat and reminder rows should share the same base shell:

```tsx
avatar/icon | title + type badge
preview text
time + action label + unread dot
```

Differences between chat/system/pending/service should be expressed by:
- badge text
- accent color
- unread count

Not by completely different card structures.

- [ ] **Step 4: Remove redundant top chrome**

Clean up header-right clutter on messages and customers so only primary actions remain. Keep `+` on messages if still needed; remove decorative duplicates.

- [ ] **Step 5: Run build and visually compare both pages side by side**

Run:

```bash
cd /Users/shibo/Documents/Codex/nailBook/technician-frontend && npm run build
```

Expected: PASS.

Visual check:
- Customers and Messages should read as sibling pages in the same system
- Search, chips, list cards, and action affordances should feel matched

- [ ] **Step 6: Commit**

```bash
git add /Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/CustomersPage.tsx \
        /Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/MessagesPage.tsx
git commit -m "refactor: unify technician customer and message pages"
```

### Task 5: Final Navigation and Cross-Page Visual QA

**Files:**
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/components/TabBar.tsx`
- Test: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/HomePage.tsx`

- [ ] **Step 1: Refit TabBar to the calmer system**

Update `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/components/TabBar.tsx` so it supports the now-cleaner page system:

```tsx
<nav className="fixed bottom-0 left-0 right-0 border-t border-white/60 bg-white/88 backdrop-blur-xl">
  {/* active item: light pink emphasis, inactive: grey-blue */}
</nav>
```

Keep routes and unread behavior unchanged.

- [ ] **Step 2: Run the final build**

Run:

```bash
cd /Users/shibo/Documents/Codex/nailBook/technician-frontend && npm run build
```

Expected: PASS.

- [ ] **Step 3: Run browser QA for all five pages**

Open and visually check:

```text
/          首页
/schedule  行程
/customers 客户
/messages  消息
/me        我
```

Checklist:
- 首页仍是情绪化入口
- 其余四页都是克制信息页
- no horizontal scrolling
- top cards and overlap cards do not cover content
- card radius/shadow/button/tag language feels consistent

- [ ] **Step 4: Commit**

```bash
git add /Users/shibo/Documents/Codex/nailBook/technician-frontend/src/components/TabBar.tsx
git commit -m "refactor: finalize technician core page visual system"
```

## Self-Review

### Spec coverage

- Home retains emotional hero: covered by Task 2
- Schedule becomes restrained information page: covered by Task 3
- Customers/messages unified as sibling information pages: covered by Task 4
- Me softens into a control center, not second home: covered by Task 2
- Shared card/button/title consistency: covered by Task 1 and Task 5
- Mobile-width safety and no horizontal scroll: covered by Tasks 3, 4, and 5 visual QA

No spec gaps found.

### Placeholder scan

- No `TODO`/`TBD`
- Each task names exact files and exact commands
- Each code-changing step includes concrete code or structure to apply

### Type consistency

- Paths, components, and route names match the current technician frontend structure
- No new APIs or prop names introduced that conflict with the spec scope


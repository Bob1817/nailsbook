# Technician Schedule And Share Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the technician WebApp `订单` tab into `行程`, keep `/orders` compatible via redirect, and add a top-level share business card flow in `我的`.

**Architecture:** Reuse the existing booking model and route structure, making `行程` the single booking operations page with two viewing modes: date-first and status-first. Add a local share panel in `我的` that uses browser capability detection for share/copy actions and renders a screenshot-friendly profile card from current technician data.

**Tech Stack:** React, React Router, TypeScript, Vite, Tailwind utility classes, Vitest, Testing Library

---

## File Map

- Modify: `technician-frontend/src/components/TabBar.tsx`
- Modify: `technician-frontend/src/App.tsx`
- Modify: `technician-frontend/src/pages/SchedulePage.tsx`
- Modify: `technician-frontend/src/pages/MePage.tsx`
- Modify: `technician-frontend/src/services/auth.ts`
- Modify: `technician-frontend/src/contexts/authTypes.ts` if technician profile fields need expansion
- Create: `technician-frontend/src/pages/__tests__/App.routes.test.tsx`
- Create: `technician-frontend/src/pages/__tests__/SchedulePage.test.tsx`
- Create: `technician-frontend/src/pages/__tests__/MePage.test.tsx`

### Task 1: Lock Navigation And Route Compatibility

**Files:**
- Create: `technician-frontend/src/pages/__tests__/App.routes.test.tsx`
- Modify: `technician-frontend/src/components/TabBar.tsx`
- Modify: `technician-frontend/src/App.tsx`

- [ ] **Step 1: Write the failing route and tab bar test**

```tsx
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import App from '../../App';

describe('technician navigation', () => {
  it('does not render an orders tab in the bottom navigation', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.queryByRole('link', { name: /订单/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /行程/i })).toBeInTheDocument();
  });

  it('redirects /orders to /schedule', async () => {
    render(
      <MemoryRouter initialEntries={['/orders']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: '行程' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd technician-frontend && npm test -- src/pages/__tests__/App.routes.test.tsx`

Expected: FAIL because the bottom navigation still contains `订单` and `/orders` still renders the old orders page.

- [ ] **Step 3: Write the minimal navigation and redirect implementation**

```tsx
// technician-frontend/src/components/TabBar.tsx
const tabs: TabItem[] = [
  { path: '/', label: '首页', icon: homeIcon, activeIcon: homeActiveIcon },
  { path: '/schedule', label: '行程', icon: scheduleIcon, activeIcon: scheduleActiveIcon },
  { path: '/customers', label: '客户', icon: customersIcon, activeIcon: customersActiveIcon },
  { path: '/messages', label: '消息', icon: messagesIcon, activeIcon: messagesActiveIcon },
  { path: '/me', label: '我', icon: meIcon, activeIcon: meActiveIcon },
];
```

```tsx
// technician-frontend/src/App.tsx
import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';

// inside protected routes
<Route path="/schedule" element={<SchedulePage />} />
<Route path="/orders" element={<Navigate to="/schedule" replace />} />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd technician-frontend && npm test -- src/pages/__tests__/App.routes.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add technician-frontend/src/components/TabBar.tsx technician-frontend/src/App.tsx technician-frontend/src/pages/__tests__/App.routes.test.tsx
git commit -m "feat: merge technician orders entry into schedule"
```

### Task 2: Unify Schedule Into Date And Status Views

**Files:**
- Create: `technician-frontend/src/pages/__tests__/SchedulePage.test.tsx`
- Modify: `technician-frontend/src/pages/SchedulePage.tsx`

- [ ] **Step 1: Write the failing schedule behavior tests**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SchedulePage } from '../SchedulePage';

describe('SchedulePage', () => {
  it('switches between date and status views', async () => {
    render(<SchedulePage />);

    await userEvent.click(screen.getByRole('button', { name: '按状态' }));
    expect(screen.getByRole('button', { name: '全部' })).toBeInTheDocument();
    expect(screen.getByText(/BK2026/)).toBeInTheDocument();
  });

  it('shows time, address, amount, and customer detail in the shared detail panel', async () => {
    render(<SchedulePage />);

    expect(screen.getByText('预约时间')).toBeInTheDocument();
    expect(screen.getByText('服务地址')).toBeInTheDocument();
    expect(screen.getByText('订单金额')).toBeInTheDocument();
    expect(screen.getByText(/1380013/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd technician-frontend && npm test -- src/pages/__tests__/SchedulePage.test.tsx`

Expected: FAIL because there is no `按状态` mode and the current detail panel does not show the unified order detail fields.

- [ ] **Step 3: Write the minimal unified schedule implementation**

```tsx
// technician-frontend/src/pages/SchedulePage.tsx
const scheduleModes = [
  { value: 'date', label: '按日期' },
  { value: 'status', label: '按状态' },
] as const;

const orderTabs: Array<{ label: string; value: 'all' | BookingStatus }> = [
  { label: '全部', value: 'all' },
  { label: '待确认', value: 'pending_confirm' },
  { label: '已确认', value: 'confirmed' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
];

const [activeMode, setActiveMode] = useState<'date' | 'status'>('date');
const [activeStatus, setActiveStatus] = useState<'all' | BookingStatus>('all');

const filteredBookings = bookings.filter((booking) => activeStatus === 'all' || booking.status === activeStatus);
const visibleBookings =
  activeMode === 'date'
    ? bookings
        .filter((booking) => isSameDay(booking.startTime, activeDate))
        .sort((left, right) => left.startTime.localeCompare(right.startTime))
    : filteredBookings;
```

```tsx
// inside the render body
<div className="border-b border-gray-100 bg-white px-5 py-3">
  <div className="flex gap-2">
    {scheduleModes.map((mode) => (
      <button
        key={mode.value}
        onClick={() => setActiveMode(mode.value)}
        className={activeMode === mode.value ? activeClassName : inactiveClassName}
      >
        {mode.label}
      </button>
    ))}
  </div>
</div>

{activeMode === 'date' ? (
  <DateScheduleSection />
) : (
  <StatusScheduleSection />
)}
```

```tsx
// shared detail panel additions
<p className="mt-1 text-sm text-gray-500">{selectedBooking.customerPhone || '未填写联系电话'}</p>
<p className="mt-1 font-medium text-gray-900">{formatTimeRange(selectedBooking.startTime, selectedBooking.endTime)}</p>
<p className="mt-2">{selectedBooking.address}</p>
{selectedBooking.note ? <p className="mt-3 text-sm text-gray-600">{selectedBooking.note}</p> : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd technician-frontend && npm test -- src/pages/__tests__/SchedulePage.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add technician-frontend/src/pages/SchedulePage.tsx technician-frontend/src/pages/__tests__/SchedulePage.test.tsx
git commit -m "feat: unify technician schedule and order views"
```

### Task 3: Add Share Business Card Entry To My Page

**Files:**
- Create: `technician-frontend/src/pages/__tests__/MePage.test.tsx`
- Modify: `technician-frontend/src/pages/MePage.tsx`
- Modify: `technician-frontend/src/services/auth.ts`
- Modify: `technician-frontend/src/contexts/authTypes.ts`

- [ ] **Step 1: Write the failing share entry and panel tests**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MePage } from '../MePage';

describe('MePage sharing', () => {
  it('renders a primary share business card action near the top', () => {
    render(<MePage />);

    expect(screen.getByRole('button', { name: '分享我的美甲名片' })).toBeInTheDocument();
  });

  it('opens the share panel with link actions and a profile card', async () => {
    render(<MePage />);

    await userEvent.click(screen.getByRole('button', { name: '分享我的美甲名片' }));

    expect(screen.getByRole('button', { name: '立即分享' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '复制链接' })).toBeInTheDocument();
    expect(screen.getByText(/查看主页并直接预约/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd technician-frontend && npm test -- src/pages/__tests__/MePage.test.tsx`

Expected: FAIL because the current page has no share entry or share panel.

- [ ] **Step 3: Write the minimal share business card implementation**

```ts
// technician-frontend/src/contexts/authTypes.ts
export interface Technician {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  status: string;
  city?: string;
  serviceArea?: string;
}
```

```ts
// technician-frontend/src/services/auth.ts
technician: {
  id: response.data.technician.id,
  name: response.data.technician.name,
  email: `${response.data.technician.phone}@nailbook.local`,
  phone: response.data.technician.phone,
  avatar: response.data.technician.avatarUrl,
  status: response.data.technician.status,
  city: response.data.technician.city,
  serviceArea: response.data.technician.serviceArea,
}
```

```tsx
// technician-frontend/src/pages/MePage.tsx
const [showShareSheet, setShowShareSheet] = useState(false);

const shareUrl = `${window.location.origin}/technicians/${technician?.id ?? ''}`;
const shareTitle = `美甲师 ${technician?.name ?? ''} 的名片`;
const shareText = '发给客户，查看主页并直接预约';

async function handleShare() {
  if (navigator.share) {
    try {
      await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
      return;
    } catch {
      // fall through to copy
    }
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(shareUrl);
  }
}

async function handleCopyLink() {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(shareUrl);
  }
}
```

```tsx
// inside MePage render
<div className="-mt-4 px-5">
  <button
    onClick={() => setShowShareSheet(true)}
    className="mb-4 flex w-full items-center justify-between rounded-2xl bg-gray-900 px-4 py-4 text-left text-white min-h-[56px]"
  >
    <div>
      <p className="text-base font-semibold">分享我的美甲名片</p>
      <p className="mt-1 text-sm text-white/70">发给客户，查看主页并直接预约</p>
    </div>
    <span className="rounded-full bg-white/10 px-3 py-1 text-sm">去分享</span>
  </button>
</div>

{showShareSheet ? (
  <div className="fixed inset-0 z-50 bg-black/40 px-4 pb-4 pt-20">
    <div className="mx-auto w-full max-w-md rounded-[28px] bg-white p-5">
      <button onClick={() => setShowShareSheet(false)} className="min-h-[44px]">关闭</button>
      <button onClick={() => void handleShare()} className="min-h-[44px]">立即分享</button>
      <button onClick={() => void handleCopyLink()} className="min-h-[44px]">复制链接</button>
      <div className="rounded-3xl bg-gradient-to-br from-pink-500 to-rose-400 p-5 text-white">
        <p className="text-sm text-white/80">发给客户，查看主页并直接预约</p>
        <p className="mt-4 text-xl font-bold">美甲师·{technician?.name || '小美'}</p>
        <p className="mt-2 text-sm">{technician?.phone || '未绑定手机号'}</p>
        <p className="mt-2 text-sm">{technician?.serviceArea || technician?.city || '提供上门美甲服务'}</p>
      </div>
    </div>
  </div>
) : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd technician-frontend && npm test -- src/pages/__tests__/MePage.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add technician-frontend/src/pages/MePage.tsx technician-frontend/src/services/auth.ts technician-frontend/src/contexts/authTypes.ts technician-frontend/src/pages/__tests__/MePage.test.tsx
git commit -m "feat: add technician share business card flow"
```

### Task 4: Run Focused Verification And Final Build Check

**Files:**
- Test: `technician-frontend/src/pages/__tests__/App.routes.test.tsx`
- Test: `technician-frontend/src/pages/__tests__/SchedulePage.test.tsx`
- Test: `technician-frontend/src/pages/__tests__/MePage.test.tsx`

- [ ] **Step 1: Run the focused page and route test suite**

Run: `cd technician-frontend && npm test -- src/pages/__tests__/App.routes.test.tsx src/pages/__tests__/SchedulePage.test.tsx src/pages/__tests__/MePage.test.tsx`

Expected: PASS

- [ ] **Step 2: Run the technician front-end build**

Run: `cd technician-frontend && npm run build`

Expected: build completes successfully with no route or type errors from the merged schedule flow or share card changes

- [ ] **Step 3: Commit**

```bash
git add technician-frontend
git commit -m "test: verify technician schedule merge and share flow"
```

## Self-Review

- Spec coverage:
  - bottom navigation reduction is covered by Task 1
  - `/orders` compatibility redirect is covered by Task 1
  - unified `行程` date/status views are covered by Task 2
  - top-level share business card action is covered by Task 3
  - system share, copy link, and screenshot-friendly profile card are covered by Task 3
  - mobile-safe verification is covered by the implementation snippets and Task 4 build verification
- Placeholder scan:
  - no `TODO`, `TBD`, or vague “handle appropriately” steps remain
- Type consistency:
  - technician profile field additions are consistent between `auth.ts`, `authTypes.ts`, and `MePage.tsx`
  - booking filters use the existing `BookingStatus` values from the current codebase

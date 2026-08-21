# WebApp 预约入口收敛与表单精简 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把「美甲师已确定」的预约入口（聊天、预约同款、已绑定名片）统一到一个底部弹层组件，并原地精简「从零预约」完整表单，同时消除日历/占用逻辑的重复实现。

**Architecture:** 抽取共用 hook `useTechnicianAvailability` 作为日历/占用逻辑的单一来源；把现有 `ChatBookingSheet` 泛化为可复用的 `BookingSheet`（支持 `prefill` 预填与 `mode` 行为分流）；各已知美甲师入口改为打开 `BookingSheet`，取不到完整 `Technician` 时回退到现有 `/orders/create` 跳转；`CreateOrder.tsx` 复用 hook 并做单师折叠 + 自定义服务并列化。

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind v4 + dayjs。项目无测试框架，验证用 `npm run build`（tsc -b + vite build）+ `npm run lint` + 手动冒烟。

**Scope:** 仅 `client-frontend/`。不动 `client-wxapp`、`mobile-flutter`、后端 API。所有命令在 `client-frontend/` 目录执行。

---

## 文件结构

| 文件 | 职责 | 动作 |
|------|------|------|
| `src/hooks/useTechnicianAvailability.ts` | 日历可用性 + 时段占用逻辑的单一来源 | **新建** |
| `src/components/BookingSheet.tsx` | 通用预约底部弹层（由 `ChatBookingSheet` 泛化） | **由 ChatBookingSheet 重命名+扩展** |
| `src/pages/ChatDetail.tsx` | 场景 2：引用 `BookingSheet`，`mode="chat"` | 修改 import + 调用 |
| `src/pages/CreateOrder.tsx` | 场景 1：复用 hook + 单师折叠 + 自定义服务并列 | 修改 |
| `src/pages/DesignDetail.tsx` | 场景 3：预约同款打开 `BookingSheet`（预填+回退） | 修改 |
| `src/components/ArtistCardModal.tsx` | 已绑定名片预约打开 `BookingSheet` | 修改 |

执行顺序：Task 1（hook）→ Task 2（BookingSheet + ChatDetail 回归）→ Task 3（CreateOrder）→ Task 4（DesignDetail）→ Task 5（ArtistCardModal）。每个 Task 自成可编译、可提交的单元。

---

## Task 1: 抽取 `useTechnicianAvailability` hook

**Files:**
- Create: `src/hooks/useTechnicianAvailability.ts`

逻辑等价迁移自 `src/pages/CreateOrder.tsx` 现有的 `scheduleRange`(148-153)、`isDateAvailable`(196-213)、`slotStatuses`(177-194) 与 `blockedSlots` 拉取(274-278)。本任务只新增文件，不改调用方，确保可独立编译。

- [ ] **Step 1: 创建 hook 文件**

创建 `src/hooks/useTechnicianAvailability.ts`，完整内容：

```ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Technician } from '../services/auth';
import { orderService } from '../services/order';

export const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30',
];

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

export interface SlotStatus {
  time: string;
  occupied: boolean;
}

interface SlotStatusOptions {
  /** 到店美甲：传入当天店铺营业时段；closed=true 当天歇业返回空数组 */
  shopHours?: { start: string; end: string; closed?: boolean } | null;
}

/**
 * 美甲师可预约性的单一来源：日历日期是否可约 + 每个时段是否被占用。
 * 逻辑与 CreateOrder / ChatBookingSheet 原内联实现等价。
 */
export function useTechnicianAvailability(technician: Technician | null) {
  const [blockedSlots, setBlockedSlots] = useState<{ startTime: string; endTime: string }[]>([]);

  useEffect(() => {
    let active = true;
    if (!technician) {
      setBlockedSlots([]);
      return;
    }
    orderService
      .getBlockedSlots(technician.id)
      .then((list) => active && setBlockedSlots(list))
      .catch(() => active && setBlockedSlots([]));
    return () => {
      active = false;
    };
  }, [technician]);

  const scheduleRange = useMemo(() => {
    const sched = technician?.serviceSchedule;
    if (!sched || !Array.isArray(sched.schemes)) return null;
    const active = sched.schemes.find((s) => s.id === sched.activeSchemeId);
    return active ? { start: active.startTime, end: active.endTime } : null;
  }, [technician]);

  const isDateAvailable = useCallback(
    (dateStr: string) => {
      const sched = technician?.serviceSchedule;
      if (!sched) return true;
      const weekday = new Date(`${dateStr}T00:00:00`).getDay();
      const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][weekday];
      if (Array.isArray(sched.schemes)) {
        if (sched.restDays?.includes(dateStr)) return false;
        const active = sched.schemes.find((s) => s.id === sched.activeSchemeId);
        if (!active) return false;
        return active.days.includes(dayKey);
      }
      if (sched.selectedDates && sched.selectedDates.length > 0)
        return sched.selectedDates.includes(dateStr);
      return sched.days?.[dayKey]?.enabled ?? true;
    },
    [technician],
  );

  const getSlotStatuses = useCallback(
    (dateStr: string, opts?: SlotStatusOptions): SlotStatus[] => {
      let base = TIME_SLOTS;
      if (opts?.shopHours) {
        if (opts.shopHours.closed) return [];
        const s = timeToMinutes(opts.shopHours.start);
        const e = timeToMinutes(opts.shopHours.end);
        base = base.filter((t) => {
          const m = timeToMinutes(t);
          return m >= s && m < e;
        });
      }
      if (scheduleRange) {
        const s = timeToMinutes(scheduleRange.start);
        const e = timeToMinutes(scheduleRange.end);
        base = base.filter((t) => {
          const m = timeToMinutes(t);
          return m >= s && m < e;
        });
      }
      return base.map((time) => {
        const slotDt = new Date(`${dateStr}T${time}:00`);
        const occupied = blockedSlots.some(
          (b) => slotDt >= new Date(b.startTime) && slotDt < new Date(b.endTime),
        );
        return { time, occupied };
      });
    },
    [scheduleRange, blockedSlots],
  );

  return { blockedSlots, isDateAvailable, getSlotStatuses, scheduleRange };
}
```

- [ ] **Step 2: 编译验证**

Run: `npm run build`
Expected: 成功，无 TS 报错（新文件可被引用但暂未使用，tsc 不报错）。

- [ ] **Step 3: 提交**

```bash
git add src/hooks/useTechnicianAvailability.ts
git commit -m "feat(booking): 抽取 useTechnicianAvailability 共用 hook"
```

---

## Task 2: 泛化 `ChatBookingSheet` → `BookingSheet`，回归聊天场景

**Files:**
- Rename: `src/components/ChatBookingSheet.tsx` → `src/components/BookingSheet.tsx`
- Modify: `src/pages/ChatDetail.tsx`（import + 调用，约 553-556 行）

目标：组件支持 `prefill`、`mode`，内部改用 `useTechnicianAvailability`；聊天入口行为不变。

- [ ] **Step 1: 重命名文件**

```bash
git mv src/components/ChatBookingSheet.tsx src/components/BookingSheet.tsx
```

- [ ] **Step 2: 改组件 props 接口与导出名**

在 `src/components/BookingSheet.tsx`：

替换原 props 接口（原 15-19 行的 `ChatBookingSheetProps`）为：

```ts
interface BookingSheetProps {
  technician: Technician;
  prefill?: {
    title?: string;
    description?: string;
    images?: string[];
  };
  mode?: 'chat' | 'standalone';
  onClose: () => void;
  onCreated?: () => void;
}
```

把组件声明（原 21 行）改为：

```ts
const BookingSheet: React.FC<BookingSheetProps> = ({ technician, prefill, mode = 'standalone', onClose, onCreated }) => {
```

把文件末尾导出（原 510 行）改为：

```ts
export default BookingSheet;
```

- [ ] **Step 3: 用 hook 替换内联可用性逻辑**

在 `BookingSheet.tsx` 顶部 import 区追加：

```ts
import { useTechnicianAvailability } from '../hooks/useTechnicianAvailability';
```

删除组件内的本地 `TIME_SLOTS` 常量（原 8-13 行）、`blockedSlots` state 与其 `useEffect`（原 51-63 行）、`scheduleRange`（原 66-71 行）、`isDateAvailable`（原 73-90 行）、`slotStatuses`（原 92-113 行）。

在组件内（state 声明之后）替换为：

```ts
const { isDateAvailable, getSlotStatuses } = useTechnicianAvailability(technician);
const slotStatuses = useMemo(() => getSlotStatuses(serviceDate), [getSlotStatuses, serviceDate]);
```

> `ChatBookingSheet` 原本不做到店营业时段过滤，因此 `getSlotStatuses(serviceDate)` 不传 `shopHours`，行为与原先一致。`useMemo` 仍从 `react` 导入（文件已 import）。

- [ ] **Step 4: 加入 prefill 预填**

把 note/images 的初始 state（原 43-44 行）改为读取 `prefill`：

```ts
const [note, setNote] = useState(prefill?.description || prefill?.title || '');
const [images, setImages] = useState<string[]>(prefill?.images || []);
```

- [ ] **Step 5: 提交行为按 mode 分流**

在 `handleSubmit` 内（原 183-193 的 `createOrder` 调用），把 `chatMode: true` 改为按 mode 传：

```ts
await orderService.createOrder({
  techId: technician.id,
  serviceType,
  serviceDate,
  startTime,
  chatMode: mode === 'chat',
  addressId: isHome ? addressId : undefined,
  shopAddress: isShop ? enabledShopAddresses[0] : undefined,
  customDescription: note.trim() || undefined,
  customImages: images.length > 0 ? images : undefined,
});
onCreated?.();
onClose();
```

> `onCreated` 的具体跳转/发消息由调用方决定（聊天端发卡片消息，独立端跳订单列表）。组件本身只负责创建 + 回调。

- [ ] **Step 6: 更新 ChatDetail 引用**

在 `src/pages/ChatDetail.tsx`：

import（原 10 行）改为：

```ts
import BookingSheet from '../components/BookingSheet';
```

渲染处（原 553-557 行）改为：

```tsx
<BookingSheet
  technician={fullTech}
  mode="chat"
  onClose={() => setShowBookingSheet(false)}
  onCreated={() => navigate('/orders')}
/>
```

- [ ] **Step 7: 编译 + lint**

Run: `npm run build && npm run lint`
Expected: 成功，无 TS / lint 报错。

- [ ] **Step 8: 手动冒烟（聊天预约回归）**

Run: `npm run dev`，打开任一聊天会话 → 点「📅 发起预约」。
Expected:
- 弹层正常滑出；月历置灰休息日；时段显示「已预约」置灰
- 选时间 + 说明 → 提交成功 → 跳订单列表
- 行为与改动前一致

- [ ] **Step 9: 提交**

```bash
git add src/components/BookingSheet.tsx src/pages/ChatDetail.tsx
git commit -m "refactor(booking): ChatBookingSheet 泛化为 BookingSheet（prefill/mode + 复用 hook）"
```

---

## Task 3: `CreateOrder` 复用 hook + 单师折叠 + 自定义服务并列

**Files:**
- Modify: `src/pages/CreateOrder.tsx`

- [ ] **Step 1: 引入 hook，移除内联可用性逻辑**

在 import 区追加：

```ts
import { useTechnicianAvailability } from '../hooks/useTechnicianAvailability';
```

删除内联的 `scheduleRange`(148-153)、`isDateAvailable`(196-213)、`slotStatuses`(177-194)、以及 274-278 行 `getBlockedSlots` 的拉取（保留 269-272 单师默认选中那段，仅删 blockedSlots 拉取与 `blockedSlots` state 声明 98 行）。

在 `selectedTechnician` 定义之后加入：

```ts
const { isDateAvailable, getSlotStatuses } = useTechnicianAvailability(selectedTechnician);
```

- [ ] **Step 2: 用 hook 重建 slotStatuses 与 availableTimeSlots**

替换原 `availableTimeSlots`(155-174) 与 `slotStatuses`(177-194) 为：

```ts
const shopHoursOpt = useMemo(() => {
  if (!isShopService || !selectedShopAddress) return null;
  if (!selectedShopHours || selectedShopHours.closed) return { start: '', end: '', closed: true };
  return { start: selectedShopHours.start, end: selectedShopHours.end };
}, [isShopService, selectedShopAddress, selectedShopHours]);

const slotStatuses = useMemo(
  () => getSlotStatuses(formData.serviceDate, { shopHours: shopHoursOpt }),
  [getSlotStatuses, formData.serviceDate, shopHoursOpt],
);

const availableTimeSlots = useMemo(
  () => slotStatuses.filter((s) => !s.occupied).map((s) => s.time),
  [slotStatuses],
);
```

> `selectedShopHours` 与 `selectedShopAddress`、`isShopService` 等保持原有定义不变。`availableTimeSlots` 仍被 `canSubmit`(414) 和自动选时间 effect(334-338) 使用，语义不变。

- [ ] **Step 3: 单美甲师折叠「选择美甲师」段**

把「选择美甲师」section（534-607 行）的内容包一层条件：`bookableTechnicians.length === 1` 时渲染紧凑摘要，否则渲染现有列表。摘要 JSX：

```tsx
{bookableTechnicians.length === 1 ? (
  <div className="flex items-center gap-3 rounded-[24px] bg-slate-50/80 p-4 ring-1 ring-black/5">
    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,#FFE0EA_0%,#F4F7FB_100%)]">
      {bookableTechnicians[0].avatarUrl ? (
        <img src={bookableTechnicians[0].avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-base font-semibold text-[var(--color-primary)]">{bookableTechnicians[0].name[0]}</span>
      )}
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900">{bookableTechnicians[0].name}</span>
        {bookableTechnicians[0].isDefault && (
          <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary)]">默认</span>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">{bookableTechnicians[0].city || bookableTechnicians[0].serviceArea || '暂未设置服务区域'}</p>
    </div>
  </div>
) : (
  /* —— 原有的多美甲师选择列表 JSX 原样保留在这里 —— */
)}
```

> 标题区（535-540）的副标题逻辑已按 `>1` 区分，保留不变。单师时 `formData.techId` 已由 269-271 的 effect 自动选中，无需用户操作。

- [ ] **Step 4: 「自定义服务」改为并列分段控件**

在「服务内容」section（662-906）中，把 673-701 行那个「自定义服务」开关按钮替换为顶部分段控件，放在 `selectedTechnician` 存在分支的最前：

```tsx
<div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
  <button
    type="button"
    onClick={() => { setIsCustomService(false); }}
    className={`rounded-xl py-2.5 text-sm font-medium transition ${
      !isCustomService ? 'bg-white text-gray-900 shadow-sm' : 'text-slate-500'
    }`}
  >
    选服务项目
  </button>
  <button
    type="button"
    onClick={() => { setIsCustomService(true); setFormData((prev) => ({ ...prev, selectedServiceIds: [] })); }}
    className={`rounded-xl py-2.5 text-sm font-medium transition ${
      isCustomService ? 'bg-white text-gray-900 shadow-sm' : 'text-slate-500'
    }`}
  >
    自定义需求
  </button>
</div>
```

其余两个分支保持不变：`{isCustomService && (...自定义表单...)}`（704-855）与 `{!isCustomService && (...服务项目列表...)}`（858-903）原样保留，仅删除被替换掉的旧开关按钮。

- [ ] **Step 5: 时段网格使用新 slotStatuses（确认无破坏）**

确认时段渲染（1116-1133 行 `slotStatuses.map(...)`）引用的是 Step 2 重建的 `slotStatuses`——结构 `{ time, occupied }` 不变，无需改动 JSX。

- [ ] **Step 6: 编译 + lint**

Run: `npm run build && npm run lint`
Expected: 成功，无报错。注意检查是否有因删除内联逻辑而残留的未使用 import（如 `useCallback`、`timeToMinutes`、本地 `timeSlots` 常量）——一并删除。

- [ ] **Step 7: 手动冒烟（从零预约）**

Run: `npm run dev`，从首页「去预约」进入 `/orders/create`。
Expected:
- 单美甲师时顶部仅一行摘要，无整段选择列表
- 「服务内容」顶部为 `选服务项目 | 自定义需求` 分段，切换正常
- 月历置灰休息日、时段「已预约」置灰、选时间可提交
- 上门/到店切换、地址选择、提交流程均正常

- [ ] **Step 8: 提交**

```bash
git add src/pages/CreateOrder.tsx
git commit -m "refactor(booking): CreateOrder 复用可用性 hook + 单师折叠 + 自定义服务并列"
```

---

## Task 4: `DesignDetail` 预约同款打开 `BookingSheet`

**Files:**
- Modify: `src/pages/DesignDetail.tsx`

`design.technician` 是精简的 `TechnicianInfo`（无 `serviceSchedule`），需从 `useAuth().technicians` 按 id 查完整 `Technician`；查不到则回退现有跳转。

- [ ] **Step 1: import BookingSheet + 新增弹层 state**

import 区追加：

```ts
import BookingSheet from '../components/BookingSheet';
import type { Technician } from '../services/auth';
```

在组件 state 区（53 行附近的 booking modal state 旁）追加：

```ts
const [quickBookTech, setQuickBookTech] = useState<Technician | null>(null);
```

- [ ] **Step 2: 改 `handleOpenBooking` 优先开弹层**

替换 `handleOpenBooking`（261-266 行）：

```ts
const handleOpenBooking = () => {
  if (!design?.technician) return;
  const fullTech = technicians.find((t) => t.id === design.technician!.id);
  if (fullTech) {
    setQuickBookTech(fullTech);
    return;
  }
  // 取不到完整美甲师信息：回退到完整表单
  navigate(`/orders/create?design_id=${design.id}&tech_id=${design.technician.id}`);
};
```

- [ ] **Step 3: 渲染 BookingSheet（预填作品）**

在组件 return 的末尾（与其他 modal 同级，`showBookingModal` 块之后）追加：

```tsx
{quickBookTech && design && (
  <BookingSheet
    technician={quickBookTech}
    prefill={{
      title: design.title || '预约同款',
      description: design.description || undefined,
      images: design.imageUrls || [],
    }}
    onClose={() => setQuickBookTech(null)}
    onCreated={() => { setQuickBookTech(null); navigate('/orders'); }}
  />
)}
```

- [ ] **Step 4: 编译 + lint**

Run: `npm run build && npm run lint`
Expected: 成功，无报错。

- [ ] **Step 5: 手动冒烟（预约同款）**

Run: `npm run dev`，打开一个设计需求详情（发布美甲师为已绑定）→ 点「发起预约」。
Expected:
- 弹出 `BookingSheet`，参考图区已带入作品图片，说明区带入标题/描述
- 选时间即可提交 → 成功后进入订单列表
- 若该美甲师不在绑定列表（构造此情形）→ 回退跳 `/orders/create`，预约不中断

- [ ] **Step 6: 提交**

```bash
git add src/pages/DesignDetail.tsx
git commit -m "feat(booking): 预约同款改用 BookingSheet 快速弹层（预填作品+回退跳转）"
```

---

## Task 5: `ArtistCardModal` 已绑定名片预约打开 `BookingSheet`

**Files:**
- Modify: `src/components/ArtistCardModal.tsx`

`technician` prop 类型即完整 `Technician`，直接开弹层。

- [ ] **Step 1: import + state**

import 区追加：

```ts
import BookingSheet from './BookingSheet';
```

在组件 state 区追加：

```ts
const [showBooking, setShowBooking] = useState(false);
```

- [ ] **Step 2: 改 `handleBook` 开弹层**

替换 `handleBook`（约 50-53 行）：

```ts
const handleBook = () => {
  if (technician.serviceSchedule || technician.homeService || technician.shopService) {
    setShowBooking(true);
    return;
  }
  // 信息不全：回退到完整表单
  onClose();
  navigate(`/orders/create?tech_id=${technician.id}`);
};
```

- [ ] **Step 3: 渲染 BookingSheet**

在组件 return（`ArtistCardView` 同级，外层 fragment 内）追加：

```tsx
{showBooking && (
  <BookingSheet
    technician={technician}
    onClose={() => setShowBooking(false)}
    onCreated={() => { setShowBooking(false); onClose(); navigate('/orders'); }}
  />
)}
```

> 若 `ArtistCardModal` 当前 return 的是单个 `<ArtistCardView .../>` 而非 fragment，用 `<>...</>` 包裹后再加该块。

- [ ] **Step 4: 编译 + lint**

Run: `npm run build && npm run lint`
Expected: 成功，无报错。

- [ ] **Step 5: 手动冒烟（名片预约）**

Run: `npm run dev`，在已绑定上下文打开美甲师名片弹窗 → 点「预约」。
Expected: 弹出 `BookingSheet`，选时间可提交 → 进入订单列表。

- [ ] **Step 6: 提交**

```bash
git add src/components/ArtistCardModal.tsx
git commit -m "feat(booking): 已绑定名片预约改用 BookingSheet 快速弹层"
```

---

## 终验（全部任务完成后）

- [ ] **构建与静态检查**

Run: `npm run build && npm run lint`
Expected: 全绿。

- [ ] **对照 spec 成功标准逐条冒烟**

1. 预约同款 → 弹层 + 作品图预填 + 选时间提交 → 订单列表 ✓（Task 4）
2. 已绑定名片预约 → 弹层 ✓（Task 5）
3. 聊天发起预约 → 行为不变、发卡片消息 ✓（Task 2）
4. 场景 1 单师 → 折叠一行；服务内容并列分段 ✓（Task 3）
5. 取不到完整 tech → 回退跳转、预约不中断 ✓（Task 4/5）
6. `BookingSheet` 与 `CreateOrder` 共用 hook、无重复日历逻辑 ✓（Task 1-3）
7. build 通过、无新增 TS 报错 ✓

- [ ] **`PublicArtistCard` 未改动确认**

Run: `git diff --name-only main -- src/pages/PublicArtistCard.tsx`
Expected: 无输出（该公开预约链路本次保持现状）。

---

## 自检备注（已核对）

- **Spec 覆盖**：6 个验收标准均有对应任务（见终验映射）。
- **类型一致**：`getSlotStatuses(dateStr, opts?)`、`isDateAvailable(dateStr)`、`SlotStatus { time, occupied }`、`BookingSheetProps { technician, prefill, mode, onClose, onCreated }` 在 Task 1/2 定义，Task 3/4/5 引用名一致。
- **回退路径**：DesignDetail（tech 不在绑定列表）与 ArtistCardModal（信息不全）均保留 `navigate('/orders/create?...')`，与 spec 边界处理一致。
- **未引入测试框架**：按用户决定，验证用 build/lint + 手动冒烟。

# 预约可用性与地址体验优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 6 项预约优化：无工时默认全天可约、提交时冲突校验+刷新、客户端内联填地址、同城（省+市）锁定、技师端热门作品进详情、美甲师省市结构化+登录强制完善。

**Architecture:** 后端在三个建单事务内加「5h 冻结窗口重叠」冲突校验与上门同城兜底校验，并给 `Technician` 加 `province` 列；客户端可用性 hook 升级为 48 格全天 + 无工时全开 + 过去时段置灰 + 暴露 `refresh()`，预约面板与表单接入冲突刷新、内联地址、省市锁定；技师端发起预约面板同口径处理无工时与冲突，新增省市选择器与登录强制完善守卫，并修复热门作品跳转。

**Tech Stack:** NestJS + Prisma(SQLite) + React 19 + TS + Vite + Tailwind。后端有 jest；前端无测试框架，前端验证用 `npm run build` + `npm run lint` + 手动冒烟。

**Scope:** `backend`、`client-frontend`、`technician-frontend`。不动 `client-wxapp`、`mobile-flutter`。所有前端命令在对应目录执行；后端命令在 `backend/`。

**分支：** 执行前从 `reconcile-set-password` 切出 `feat/booking-availability-address`。

---

## 文件结构

| 文件 | 职责 | 动作 |
|------|------|------|
| `backend/prisma/schema.prisma` | `Technician.province String?` | 改 |
| `backend/src/orders/client-orders.service.ts` | 冲突校验 + 上门同城兜底（客户建单/同款） | 改 |
| `backend/src/orders/orders.service.ts` | 技师代客建单：冲突校验 + 写 5h 冻结 | 改 |
| `backend/src/technician-auth/dto/update-technician-profile.dto.ts` | 加 `province` | 改 |
| `backend/src/technician-auth/technician-auth.service.ts` | 持久化/返回 `province` | 改 |
| `client-frontend/src/services/auth.ts` | `Technician.province` 类型 | 改 |
| `client-frontend/src/hooks/useTechnicianAvailability.ts` | 48 格/无工时全开/过去置灰/`refresh()` | 改 |
| `client-frontend/src/components/BookingSheet.tsx` | 冲突刷新 + 内联省市锁定 + 已有地址同城过滤 | 改 |
| `client-frontend/src/pages/CreateOrder.tsx` | 内联建址(req3) + 同城(req4) + 冲突刷新 | 改 |
| `technician-frontend/src/utils/workSchedule.ts` | `hasEffectiveWorkTime(raw)` | 改 |
| `technician-frontend/src/components/CreateBookingSheet.tsx` | 无工时全天 + 冲突刷新 | 改 |
| `technician-frontend/src/data/regions.ts` | 省→市数据集（生成后提交） | 新增 |
| `technician-frontend/src/components/RegionSelect.tsx` | 省/市两级下拉 | 新增 |
| `technician-frontend/src/pages/ProfileSettingsPage.tsx` | 用 RegionSelect 录省市 | 改 |
| `technician-frontend/src/services/auth.ts` + `contexts/authTypes.ts` | `province` 字段透传 | 改 |
| `technician-frontend/src/components/ProtectedRoute.tsx` + `App.tsx` + 新页 `ProfileCompletionPage.tsx` | 登录强制完善守卫 | 改/新增 |
| `technician-frontend/src/pages/HomePage.tsx` + `WorksPage.tsx` | 热门作品进详情 | 改 |

执行顺序：后端 T1–T3 → 客户端 T4–T6 → 技师端 T7–T12。每个 Task 自成可编译、可提交单元。

---

## Task 1: 后端 — 客户建单/同款 冲突校验 + 上门同城兜底

**Files:**
- Modify: `backend/src/orders/client-orders.service.ts`
- Test: `backend/src/orders/client-orders.conflict.spec.ts`（新增）

- [ ] **Step 1: 加私有方法 `assertNoBlockedConflict` 与 `assertSameCity`**

在 `client-orders.service.ts` 的私有方法区（紧邻 `assertOrderConflict`）新增：

```ts
private async assertNoBlockedConflict(
  tx: Prisma.TransactionClient,
  techId: number,
  startTime: Date,
  blockEnd: Date,
  ignoreOrderId?: number,
) {
  const conflict = await tx.blockedTimeSlot.findFirst({
    where: {
      techId,
      NOT: ignoreOrderId ? { orderId: ignoreOrderId } : undefined,
      startTime: { lt: blockEnd },
      endTime: { gt: startTime },
    },
    select: { id: true },
  });
  if (conflict) {
    throw new BadRequestException('该时间段已经被其他用户预约，请重新选择预约时间');
  }
}

private normalizeCity(s?: string | null) {
  return (s || '').trim().replace(/市$/, '');
}
private normalizeProvince(s?: string | null) {
  return (s || '').trim().replace(/省$/, '');
}

private assertSameCity(
  tech: { province?: string | null; city?: string | null },
  addr: { province?: string | null; city?: string | null },
) {
  // 美甲师未设城市则不限制（兜底）
  if (!tech.city) return;
  const cityOk = this.normalizeCity(addr.city) === this.normalizeCity(tech.city);
  const provinceOk =
    !tech.province ||
    this.normalizeProvince(addr.province) === this.normalizeProvince(tech.province);
  if (!cityOk || !provinceOk) {
    throw new BadRequestException('美甲师不支持跨城上门美甲');
  }
}
```

> `Prisma` 与 `BadRequestException` 已在文件顶部 import（确认；若 `Prisma` 未导入则补 `import { Prisma } from '@prisma/client';`）。

- [ ] **Step 2: 在 `createOrder` 事务内、写 BlockedTimeSlot 之前调用冲突校验；上门时校验同城**

在 `createOrder` 中，定位 `const blockEndTime = new Date(startTime.getTime() + 5 * 60 * 60 * 1000);` 与其后的 `await tx.blockedTimeSlot.create(...)`。在 `tx.blockedTimeSlot.create` **之前**插入：

```ts
await this.assertNoBlockedConflict(tx, dto.techId, startTime, blockEndTime);
```

并在该方法解析上门地址后（`createOrder` 中 `serviceType === '上门美甲'` 且拿到 `address` 记录处，即设置 `orderAddress = this.formatAddress(address)` 附近）加入同城校验（需先取到 technician 的 province/city；`createOrder` 已有 `binding.technician` 或查询的 technician 对象——使用它）：

```ts
// 上门同城兜底（技师 province/city 来自已查询的 technician 记录）
this.assertSameCity(
  { province: technician.province, city: technician.city },
  { province: address.province, city: address.city },
);
```

> 若 `createOrder` 当前作用域内 technician 变量名不同（如 `binding.technician`），用实际变量；若未 select `province`，在其 technician 查询的 `select`/`include` 中加入 `province: true, city: true`（或改为完整记录）。

- [ ] **Step 3: 在 `createFromDesign` 同样插入两处校验**

`createFromDesign` 中：上门分支拿到 `address` 后加 `this.assertSameCity({province: design.technician.province, city: design.technician.city}, {province: address.province, city: address.city});`；在写 `blockedTimeSlot.create` 之前加 `await this.assertNoBlockedConflict(tx, dto.techId, startTime, blockEndTime);`（若该方法的冻结变量名不同，按实际命名）。确认 `design.technician` 已 select `province, city`（`include: { technician: true }` 已全取，足够）。

- [ ] **Step 4: 写最小单测**

`backend/src/orders/client-orders.conflict.spec.ts`：

```ts
import { BadRequestException } from '@nestjs/common';
import { ClientOrdersService } from './client-orders.service';

describe('ClientOrdersService helpers', () => {
  const svc = new ClientOrdersService({} as any) as any;

  it('assertSameCity 通过：同省同市', () => {
    expect(() =>
      svc.assertSameCity({ province: '上海市', city: '上海' }, { province: '上海', city: '上海市' }),
    ).not.toThrow();
  });

  it('assertSameCity 抛错：跨市', () => {
    expect(() =>
      svc.assertSameCity({ province: '江苏', city: '苏州' }, { province: '江苏', city: '南京' }),
    ).toThrow(BadRequestException);
  });

  it('assertSameCity 不限制：技师无城市', () => {
    expect(() => svc.assertSameCity({ city: null }, { city: '北京' })).not.toThrow();
  });

  it('assertNoBlockedConflict 抛错：存在重叠', async () => {
    const tx = { blockedTimeSlot: { findFirst: async () => ({ id: 1 }) } };
    await expect(
      svc.assertNoBlockedConflict(tx, 1, new Date('2026-06-10T10:00:00'), new Date('2026-06-10T15:00:00')),
    ).rejects.toThrow('该时间段已经被其他用户预约，请重新选择预约时间');
  });

  it('assertNoBlockedConflict 通过：无重叠', async () => {
    const tx = { blockedTimeSlot: { findFirst: async () => null } };
    await expect(
      svc.assertNoBlockedConflict(tx, 1, new Date('2026-06-10T10:00:00'), new Date('2026-06-10T15:00:00')),
    ).resolves.toBeUndefined();
  });
});
```

> `ClientOrdersService` 构造参数若不止 prisma，按实际签名传 `{} as any` 占位即可（仅测纯方法）。

- [ ] **Step 5: 跑测试 + 构建**

Run: `cd backend && npx jest client-orders.conflict --silent && npm run build`
Expected: 测试全过；`nest build` 成功。

- [ ] **Step 6: 提交**

```bash
git add backend/src/orders/client-orders.service.ts backend/src/orders/client-orders.conflict.spec.ts
git commit -m "feat(orders): 客户建单/同款 增加5h冲突校验与上门同城兜底"
```

---

## Task 2: 后端 — 技师代客建单：冲突校验 + 写 5h 冻结

**Files:**
- Modify: `backend/src/orders/orders.service.ts`

- [ ] **Step 1: 阅读技师建单方法**

Run: `cd backend && grep -n "create\|blockedTimeSlot\|startTime\|endTime\|technicianId\|\\\$transaction" src/orders/orders.service.ts | head -40`
找到技师代客创建订单的方法（创建 `order` 记录的那个）。确认它是否在事务内、是否写 `blockedTimeSlot`。

- [ ] **Step 2: 加冲突校验 + 冻结（与客户端口径一致）**

在该创建方法的事务内、订单创建后：
- 计算 `const startTime = new Date(...dto...);`（用方法内已有 startTime）。
- `const blockEnd = new Date(startTime.getTime() + 5 * 60 * 60 * 1000);`
- 在写入冻结/创建订单之前加冲突校验：
```ts
const conflict = await tx.blockedTimeSlot.findFirst({
  where: { techId, startTime: { lt: blockEnd }, endTime: { gt: startTime } },
  select: { id: true },
});
if (conflict) {
  throw new BadRequestException('该时间段已经被其他用户预约，请重新选择预约时间');
}
```
- 若该方法当前**未**写 `blockedTimeSlot`，补写（与客户端对称，保证占用一致）：
```ts
await tx.blockedTimeSlot.create({
  data: { techId, orderId: createdOrder.id, startTime, endTime: blockEnd, reason: 'booking' },
});
```
（`techId` 用方法内技师 id 变量；`createdOrder` 用实际订单变量名。`BadRequestException` 已 import 则复用，否则补 import。）

- [ ] **Step 3: 构建**

Run: `cd backend && npm run build`
Expected: 成功。

- [ ] **Step 4: 提交**

```bash
git add backend/src/orders/orders.service.ts
git commit -m "feat(orders): 技师代客建单 增加5h冲突校验并对称写入冻结"
```

---

## Task 3: 后端 — Technician.province 列 + profile 读写

**Files:**
- Modify: `backend/prisma/schema.prisma`, `backend/src/technician-auth/dto/update-technician-profile.dto.ts`, `backend/src/technician-auth/technician-auth.service.ts`

- [ ] **Step 1: schema 加列**

在 `model Technician` 中 `city  String?` 之后加一行：
```prisma
  province              String?
```

- [ ] **Step 2: 本地 db push（仅加列，非破坏）**

Run: `cd backend && npx prisma db push && npx prisma generate`
Expected: 增量加列成功，无数据丢失提示外的告警。

- [ ] **Step 3: DTO 加 province**

`update-technician-profile.dto.ts`：在 `city?` 字段旁加：
```ts
  @ApiPropertyOptional({ description: '省份', example: '上海市' })
  @IsString()
  @IsOptional()
  province?: string;
```

- [ ] **Step 4: service 持久化 + 返回 province**

`technician-auth.service.ts`：
- `updateProfile` 中，仿照 `if (dto.city !== undefined) { updateData.city = dto.city.trim() || null; }` 增加：
```ts
if (dto.province !== undefined) {
  updateData.province = dto.province.trim() || null;
}
```
- 在所有返回技师信息的 `select`（grep `city: technician.city` / `city: true` 处，约 4 处）旁补 `province`：对象字面量返回处加 `province: technician.province,`；`select: { ... city: true ... }` 处加 `province: true,`。

Run: `cd backend && grep -n "city: technician.city\|city: true" src/technician-auth/technician-auth.service.ts` 逐处补 `province`。

- [ ] **Step 5: 构建**

Run: `cd backend && npm run build`
Expected: 成功。

- [ ] **Step 6: 提交**

```bash
git add backend/prisma/schema.prisma backend/src/technician-auth/dto/update-technician-profile.dto.ts backend/src/technician-auth/technician-auth.service.ts
git commit -m "feat(technician): 新增 province 列与 profile 读写"
```

---

## Task 4: 客户端 hook — 48格全天 / 无工时全开 / 过去置灰 / refresh()

**Files:**
- Modify: `client-frontend/src/hooks/useTechnicianAvailability.ts`

- [ ] **Step 1: TIME_SLOTS 改 48 格**

把现有 `TIME_SLOTS`（22 格）替换为生成式 48 格：

```ts
export const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});
```

- [ ] **Step 2: 加「工时是否生效」判定 + 改 scheduleRange/isDateAvailable**

在 `timeToMinutes` 下方加：
```ts
function hasEffectiveWorkTime(sched?: import('../services/auth').ServiceSchedule | null): boolean {
  if (!sched) return false;
  if (Array.isArray(sched.schemes)) {
    const active = sched.schemes.find((s) => s.id === sched.activeSchemeId);
    return !!active && Array.isArray(active.days) && active.days.length > 0;
  }
  if (sched.selectedDates && sched.selectedDates.length > 0) return true;
  if (sched.days) return Object.values(sched.days).some((d) => d?.enabled);
  return false;
}
```
（若 `ServiceSchedule` 未从 auth 导出，改为 `technician?.serviceSchedule` 的内联类型；确认 `client-frontend/src/services/auth.ts` 导出了 `ServiceSchedule`，否则在本文件 import type。）

把 `scheduleRange` 改为仅在生效时返回：
```ts
const scheduleRange = useMemo(() => {
  const sched = technician?.serviceSchedule;
  if (!hasEffectiveWorkTime(sched) || !Array.isArray(sched?.schemes)) return null;
  const active = sched!.schemes!.find((s) => s.id === sched!.activeSchemeId);
  return active ? { start: active.startTime, end: active.endTime } : null;
}, [technician]);
```

把 `isDateAvailable` 改为无工时全开：
```ts
const isDateAvailable = useCallback(
  (dateStr: string) => {
    const sched = technician?.serviceSchedule;
    if (!hasEffectiveWorkTime(sched)) return true; // 无生效工时：任意未来日期可约
    const weekday = new Date(`${dateStr}T00:00:00`).getDay();
    const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][weekday];
    if (Array.isArray(sched!.schemes)) {
      if (sched!.restDays?.includes(dateStr)) return false;
      const active = sched!.schemes.find((s) => s.id === sched!.activeSchemeId);
      return !!active && active.days.includes(dayKey);
    }
    if (sched!.selectedDates && sched!.selectedDates.length > 0)
      return sched!.selectedDates.includes(dateStr);
    return sched!.days?.[dayKey]?.enabled ?? true;
  },
  [technician],
);
```

- [ ] **Step 3: getSlotStatuses 增加「今天过去时段置灰」**

把 `getSlotStatuses` 内 `return base.map(...)` 改为：
```ts
const now = Date.now();
const todayStr = new Date().toISOString().slice(0, 10);
return base.map((time) => {
  const slotDt = new Date(`${dateStr}T${time}:00`);
  const isPast = dateStr === todayStr && slotDt.getTime() <= now;
  const occupied =
    isPast ||
    blockedSlots.some((b) => slotDt >= new Date(b.startTime) && slotDt < new Date(b.endTime));
  return { time, occupied };
});
```
（`dateStr` 用本地年月日比较更稳；若项目用 dayjs 可 `dayjs().format('YYYY-MM-DD')`，与 CreateOrder 现有写法一致。这里用 `toISOString().slice(0,10)` 在本地时区可能差一天——改用：`const todayStr = \`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}\`;`）

- [ ] **Step 4: 暴露 refresh()**

把拉取 `blockedSlots` 的逻辑抽为可手动触发：
```ts
const fetchBlocked = useCallback(() => {
  if (!technician) { setBlockedSlots([]); return; }
  orderService.getBlockedSlots(technician.id)
    .then(setBlockedSlots)
    .catch(() => setBlockedSlots([]));
}, [technician]);

useEffect(() => { fetchBlocked(); }, [fetchBlocked]);
```
返回值加入 `refresh: fetchBlocked`：
```ts
return { blockedSlots, isDateAvailable, getSlotStatuses, scheduleRange, refresh: fetchBlocked };
```

- [ ] **Step 5: 构建 + lint**

Run: `cd client-frontend && npm run build && npm run lint`
Expected: 成功。注意 `CreateOrder`/`BookingSheet` 仍能解构（新增返回字段向后兼容）。

- [ ] **Step 6: 提交**

```bash
git add client-frontend/src/hooks/useTechnicianAvailability.ts
git commit -m "feat(availability): 48格全天/无工时全开/过去时段置灰/暴露refresh"
```

---

## Task 5: 客户端 BookingSheet — 冲突刷新 + 内联省市锁定 + 已有地址同城过滤

**Files:**
- Modify: `client-frontend/src/components/BookingSheet.tsx`, `client-frontend/src/services/auth.ts`

- [ ] **Step 1: Technician 类型加 province**

`client-frontend/src/services/auth.ts` 的 `interface Technician` 中 `city?: string | null;` 下加：
```ts
  province?: string | null;
```

- [ ] **Step 2: 用 hook 的 refresh + 冲突处理**

`BookingSheet.tsx`：把 `useTechnicianAvailability(technician)` 的解构加上 `refresh`。在 `handleSubmit` 的 `catch` 块中，先判断冲突消息并刷新：

```ts
} catch (err: unknown) {
  const e = err as { response?: { data?: { message?: string | string[] } } };
  const msg = e.response?.data?.message;
  const text = Array.isArray(msg) ? msg[0] : msg;
  if (typeof text === 'string' && text.includes('该时间段已经被其他用户预约')) {
    alert('该时间段已经被其他用户预约，请重新选择预约时间');
    refresh();
    setStartTime('');
  } else {
    alert('发起预约失败：' + (text || (err as Error).message || '请稍后重试'));
  }
}
```
（保持其余逻辑不变；`setStartTime` 为现有 state setter。）

- [ ] **Step 3: 内联地址表单加省/市锁定字段**

把内联表单（`showInlineForm` 分支，含 `newName/newPhone/newAddr` 三个 `Field`）改为额外展示锁定的省/市，并在 `createAddress` 时带上：

新增 state（与 newName 等并列）：
```ts
const lockedProvince = technician.province || '';
const lockedCity = technician.city || '';
```
内联表单 JSX 在三个 `Field` 上方插入只读省/市展示：
```tsx
{(lockedProvince || lockedCity) && (
  <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-500">
    服务城市：{[lockedProvince, lockedCity].filter(Boolean).join(' ')}（仅支持同城上门）
  </div>
)}
```
`createAddress` 调用补省/市：
```ts
const saved = await addressService.createAddress({
  contactName: newName.trim(),
  contactPhone: newPhone.trim() || undefined,
  province: lockedProvince || undefined,
  city: lockedCity || undefined,
  detailAddress: newAddr.trim(),
  isDefault: addresses.length === 0,
});
```
（确认 `addressService.createAddress` 入参类型支持 `province/city`；`ClientAddress` 有这些字段，service 应已透传，若 DTO 不含则在 `client-frontend/src/services/address.ts` 的 create 入参类型补 `province?/city?`。）

- [ ] **Step 4: 已有地址同城过滤**

加归一化工具（文件内顶部）：
```ts
const normCity = (s?: string | null) => (s || '').trim().replace(/市$/, '');
const normProv = (s?: string | null) => (s || '').trim().replace(/省$/, '');
const sameCity = (a: ClientAddress, t: { province?: string | null; city?: string | null }) =>
  !t.city ||
  (normCity(a.city) === normCity(t.city) &&
    (!t.province || normProv(a.province) === normProv(t.province)));
```
在已有地址选择 UI（地址列表/下拉）中：对不匹配地址禁用点击并置灰；点选不匹配项时 `alert('美甲师不支持跨城上门美甲');` 不选中。具体到现有渲染：
- 单地址展示分支：若 `!sameCity(addresses[0], technician)` 则展示「该地址非美甲师所在城市，不支持跨城上门」并提供「+ 新增同城地址」入口（`setShowInlineForm(true)`）。
- 多地址 `<select>`：把不同城 option `disabled`；`onChange` 时若选中项不同城则 `alert(...)` 并不更新 `selectedAddressId`。

- [ ] **Step 5: 构建 + lint**

Run: `cd client-frontend && npm run build && npm run lint`
Expected: 成功。

- [ ] **Step 6: 提交**

```bash
git add client-frontend/src/components/BookingSheet.tsx client-frontend/src/services/auth.ts client-frontend/src/services/address.ts
git commit -m "feat(booking): BookingSheet 冲突刷新+内联省市锁定+已有地址同城过滤"
```

---

## Task 6: 客户端 CreateOrder — 内联建址(req3) + 同城(req4) + 冲突刷新

**Files:**
- Modify: `client-frontend/src/pages/CreateOrder.tsx`

- [ ] **Step 1: 阅读现有上门地址段与提交逻辑**

Run: `cd client-frontend && grep -n "addresses\|addressId\|profile/addresses\|isHomeService\|getSlotStatuses\|useTechnicianAvailability\|handleSubmit\|catch\|alert" src/pages/CreateOrder.tsx | head -40`

- [ ] **Step 2: hook 解构加 refresh + 冲突处理**

`useTechnicianAvailability(selectedTechnician)` 解构加 `refresh`。在 `handleSubmit` 的 catch 中按 Task 5 Step 2 同样的方式：命中「该时间段已经被其他用户预约」→ `alert` 同句 + `refresh()` + 清空 `formData.startTime`（`setFormData(p=>({...p,startTime:''}))`）；否则保留原 alert。

- [ ] **Step 3: 上门无地址时内联建址（取消强制跳转）**

在上门地址 section（`isHomeService` 分支，现含「暂无上门地址，请先添加」+ 跳 `/profile/addresses`）改为：当 `addresses.length === 0` 时渲染内联表单（联系人、手机号、详细地址）并展示锁定省/市（同 Task 5 Step 3 文案）。新增 state：
```ts
const [inlineName, setInlineName] = useState('');
const [inlinePhone, setInlinePhone] = useState('');
const [inlineAddr, setInlineAddr] = useState('');
```
保留「管理地址」入口为次要链接，不再阻断。

- [ ] **Step 4: 提交时若用内联表单则先建址**

在 `handleSubmit` 上门分支，下单前：若 `addresses.length === 0`（或用户处于内联模式）且填了 `inlineName/inlineAddr`：
```ts
const saved = await addressService.createAddress({
  contactName: inlineName.trim(),
  contactPhone: inlinePhone.trim() || undefined,
  province: selectedTechnician?.province || undefined,
  city: selectedTechnician?.city || undefined,
  detailAddress: inlineAddr.trim(),
  isDefault: true,
});
// 用 saved.id 作为下单 addressId
```
然后用 `saved.id` 作为 `payload.addressId`（替换原 `formData.addressId`）。`addressService` 已在文件 import；若无则加 `import { addressService } from '../services/address';`。

- [ ] **Step 5: 同城过滤（已有地址）**

复用 Task 5 的 `normCity/normProv/sameCity`（可在本文件再定义或抽到 `client-frontend/src/utils/sameCity.ts` 供两处 import——推荐抽公共，避免重复）。**推荐**：新建 `client-frontend/src/utils/sameCity.ts` 导出 `normCity/normProv/sameCity`，Task 5 与本任务都 import。
地址列表渲染：不同城地址 `disabled`+置灰；点选弹 `alert('美甲师不支持跨城上门美甲')` 不选中。

- [ ] **Step 6: 构建 + lint**

Run: `cd client-frontend && npm run build && npm run lint`
Expected: 成功。

- [ ] **Step 7: 提交**

```bash
git add client-frontend/src/pages/CreateOrder.tsx client-frontend/src/utils/sameCity.ts client-frontend/src/components/BookingSheet.tsx
git commit -m "feat(booking): CreateOrder 内联建址+同城过滤+冲突刷新"
```

> 若抽了 `sameCity.ts`，回到 BookingSheet 改为 import 公共版（顺带提交）。

---

## Task 7: 技师端 CreateBookingSheet — 无工时全天 + 冲突刷新

**Files:**
- Modify: `technician-frontend/src/utils/workSchedule.ts`, `technician-frontend/src/components/CreateBookingSheet.tsx`

- [ ] **Step 1: workSchedule 增加 hasEffectiveWorkTime（基于原始 schedule）**

`workSchedule.ts` 末尾加：
```ts
export function hasEffectiveWorkTime(saved?: ServiceSchedule | null): boolean {
  if (!saved) return false;
  if (Array.isArray(saved.schemes)) {
    const active = saved.schemes.find((s) => s.id === saved.activeSchemeId);
    return !!active && Array.isArray(active.days) && active.days.length > 0;
  }
  if (saved.selectedDates && saved.selectedDates.length > 0) return true;
  if (saved.days) return Object.values(saved.days).some((d) => d?.enabled);
  return false;
}

export const FULL_DAY_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});
```

- [ ] **Step 2: CreateBookingSheet 用原始 schedule 判定无工时**

`CreateBookingSheet.tsx`：
- import 增加 `hasEffectiveWorkTime, FULL_DAY_SLOTS`。
- 新增：`const effective = useMemo(() => hasEffectiveWorkTime(technician?.serviceSchedule), [technician?.serviceSchedule]);`
- `isDateDisabled(day)`：在「过去日期」判断保留；当 `!effective` 时**不**因工作日/休息日置灰（仅过去置灰）：
```ts
if (!effective) return date < today && formatDateStr(date) !== formatDateStr(today);
```
放在函数最前（过去判断之后、restDays/active 判断之前）。
- `availableTimeSlots`：当 `!effective` 时返回全天 48 格：
```ts
const availableTimeSlots = useMemo(() => {
  if (!serviceDate) return [];
  if (!effective) return FULL_DAY_SLOTS;
  if (!active) return [];
  const date = new Date(`${serviceDate}T00:00:00`);
  const weekdayKey = DAY_KEY_MAP[date.getDay()];
  if (!active.days.includes(weekdayKey) || restDays.includes(serviceDate)) return [];
  return generateTimeSlots(active.startTime, active.endTime);
}, [serviceDate, active, restDays, effective]);
```

- [ ] **Step 3: slotStatuses 增加今天过去时段置灰**

`slotStatuses` 的 map 中 occupied 增加过去判断：
```ts
const nowMs = Date.now();
const todayStr = formatDateStr(new Date());
// ...
occupied:
  (serviceDate === todayStr && slotMs <= nowMs) ||
  occupiedRanges.some((r) => slotMs >= r.start && slotMs < r.end),
```

- [ ] **Step 4: 提交冲突处理**

`handleSubmit` 的 `catch` 改为识别冲突（后端会抛该消息；`ordersService.create` 走 axios，错误在 `err.response.data.message`）：
```ts
} catch (err) {
  const e = err as { response?: { data?: { message?: string | string[] } } };
  const m = e.response?.data?.message;
  const text = Array.isArray(m) ? m[0] : m;
  if (typeof text === 'string' && text.includes('该时间段已经被其他用户预约')) {
    toast.error('该时间段已经被其他用户预约，请重新选择预约时间');
    ordersService.list({ technicianId: technician.id }).then(setOrders).catch(() => {});
    setStartClock('');
  } else {
    toast.error('创建预约失败，请检查网络或稍后再试。');
  }
}
```
（保留原成功/草稿分支逻辑；`setOrders`、`setStartClock`、`ordersService`、`toast` 均为现有。重新拉 orders 即刷新 `occupiedRanges`→`slotStatuses`。）

- [ ] **Step 5: 构建 + lint**

Run: `cd technician-frontend && npm run build && npm run lint`
Expected: 成功。

- [ ] **Step 6: 提交**

```bash
git add technician-frontend/src/utils/workSchedule.ts technician-frontend/src/components/CreateBookingSheet.tsx
git commit -m "feat(tech-booking): 无工时全天48格+今日过去置灰+冲突刷新"
```

---

## Task 8: 技师端 省市数据集 + RegionSelect 组件

**Files:**
- Create: `technician-frontend/src/data/regions.ts`, `technician-frontend/src/components/RegionSelect.tsx`

- [ ] **Step 1: 生成省→市数据集（提交为静态文件，无运行时依赖）**

安装数据源（仅生成期用）并生成静态 TS：
```bash
cd technician-frontend
npm i -D province-city-china
node -e '
const { pca } = require("province-city-china/dist/data");
const map = {};
for (const p of pca) {
  const cities = (p.children || []).map((c) => c.name);
  map[p.name] = cities.length ? cities : [p.name];
}
const fs = require("fs");
fs.writeFileSync("src/data/regions.ts",
  "// 自动生成：中国省→市两级。请勿手改。\n" +
  "export const PROVINCE_CITY: Record<string, string[]> = " +
  JSON.stringify(map, null, 2) + ";\n" +
  "export const PROVINCES = Object.keys(PROVINCE_CITY);\n");
console.log("provinces:", Object.keys(map).length);
'
npm uninstall province-city-china
```
Expected: 打印 `provinces: 34`（或相近），生成 `src/data/regions.ts`。

> 若 `province-city-china/dist/data` 路径不符，运行 `node -e "console.log(Object.keys(require('province-city-china')))"` 查正确导出名（如 `pca`/`pcaa`），用省→市两级（`pca`）。直辖市 children 可能为空，则 `[p.name]` 兜底。

- [ ] **Step 2: 校验生成文件可被 TS 引用**

Run: `cd technician-frontend && node -e "const {PROVINCES}=require('./src/data/regions.ts')" 2>/dev/null; head -5 src/data/regions.ts`
（TS 不能直接 require，主要靠下一步 build 校验；此处仅肉眼确认文件非空、结构正确。）

- [ ] **Step 3: RegionSelect 组件**

创建 `technician-frontend/src/components/RegionSelect.tsx`：
```tsx
import React, { useMemo } from 'react';
import { PROVINCE_CITY, PROVINCES } from '../data/regions';

interface RegionSelectProps {
  province: string;
  city: string;
  onChange: (v: { province: string; city: string }) => void;
}

const RegionSelect: React.FC<RegionSelectProps> = ({ province, city, onChange }) => {
  const cities = useMemo(() => PROVINCE_CITY[province] || [], [province]);
  return (
    <div className="flex gap-2">
      <select
        value={province}
        onChange={(e) => {
          const p = e.target.value;
          const list = PROVINCE_CITY[p] || [];
          onChange({ province: p, city: list.includes(city) ? city : (list[0] || '') });
        }}
        className="h-12 flex-1 rounded-xl bg-gray-100 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5A66]"
      >
        <option value="">选择省份</option>
        {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <select
        value={city}
        disabled={!province}
        onChange={(e) => onChange({ province, city: e.target.value })}
        className="h-12 flex-1 rounded-xl bg-gray-100 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF5A66] disabled:opacity-60"
      >
        <option value="">选择城市</option>
        {cities.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  );
};

export default RegionSelect;
```

- [ ] **Step 4: 构建 + lint**

Run: `cd technician-frontend && npm run build && npm run lint`
Expected: 成功（RegionSelect 暂未被引用，导出不报错）。

- [ ] **Step 5: 提交**

```bash
git add technician-frontend/src/data/regions.ts technician-frontend/src/components/RegionSelect.tsx technician-frontend/package.json technician-frontend/package-lock.json
git commit -m "feat(tech): 新增省市数据集与 RegionSelect 组件"
```
（确认 `package.json` 未残留 `province-city-china` 依赖；若残留则手动删除该行后再提交。）

---

## Task 9: 技师端 ProfileSettingsPage — 用 RegionSelect 录省市

**Files:**
- Modify: `technician-frontend/src/pages/ProfileSettingsPage.tsx`, `technician-frontend/src/services/auth.ts`, `technician-frontend/src/contexts/authTypes.ts`

- [ ] **Step 1: 类型加 province**

`technician-frontend/src/contexts/authTypes.ts` 和 `services/auth.ts` 中技师类型加 `province?: string;`（grep `serviceArea` 定位类型，旁边加）。`services/auth.ts` 的 profile 映射处（`city: response.data...city`）增加 `province: response.data...province`，更新请求体也带 `province`。

- [ ] **Step 2: 表单 state + 提交带 province**

`ProfileSettingsPage.tsx`：
- `formData` 初值加 `province: ''`；初始化 `setFormData` 时 `province: technician.province || ''`。
- 把「所在城市」文本 `<input>`（占位"如：北京市"）替换为：
```tsx
<RegionSelect
  province={formData.province}
  city={formData.city}
  onChange={({ province, city }) => setFormData({ ...formData, province, city })}
/>
```
import `RegionSelect from '../components/RegionSelect';`。
- 提交对象（`updateProfile({ ... city: formData.city, serviceArea: ... })`）加 `province: formData.province`。

- [ ] **Step 3: 构建 + lint**

Run: `cd technician-frontend && npm run build && npm run lint`
Expected: 成功。

- [ ] **Step 4: 提交**

```bash
git add technician-frontend/src/pages/ProfileSettingsPage.tsx technician-frontend/src/services/auth.ts technician-frontend/src/contexts/authTypes.ts
git commit -m "feat(tech): 资料页用 RegionSelect 录入结构化省市"
```

---

## Task 10: 技师端 登录强制完善守卫

**Files:**
- Create: `technician-frontend/src/pages/ProfileCompletionPage.tsx`
- Modify: `technician-frontend/src/components/ProtectedRoute.tsx`, `technician-frontend/src/App.tsx`

- [ ] **Step 1: 完善页**

创建 `ProfileCompletionPage.tsx`：用 `RegionSelect` 收省/市，保存调 `authService.updateProfile({province, city})`（或现有 profile 更新方法），成功后 `refreshProfile()`（或重新拉 me）并 `navigate('/', {replace:true})`。完整：
```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RegionSelect from '../components/RegionSelect';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/auth';
import { useToast } from '../components/ToastProvider';

const ProfileCompletionPage: React.FC = () => {
  const navigate = useNavigate();
  const { technician, refreshProfile } = useAuth() as any;
  const toast = useToast();
  const [province, setProvince] = useState(technician?.province || '');
  const [city, setCity] = useState(technician?.city || '');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!province || !city) { toast.error('请选择所在省份和城市'); return; }
    setSaving(true);
    try {
      await authService.updateProfile({ province, city });
      await refreshProfile?.();
      navigate('/', { replace: true });
    } catch {
      toast.error('保存失败，请重试');
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50 px-6">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-lg font-semibold text-gray-900">完善服务城市</h1>
        <p className="text-sm text-gray-500">请先完善你的服务省/市，用于同城上门预约与定位推荐。</p>
        <RegionSelect province={province} city={city} onChange={(v) => { setProvince(v.province); setCity(v.city); }} />
        <button onClick={submit} disabled={saving}
          className="w-full min-h-[48px] rounded-xl bg-[#FF5A66] text-sm font-medium text-white disabled:opacity-60">
          {saving ? '保存中…' : '保存并继续'}
        </button>
      </div>
    </div>
  );
};

export default ProfileCompletionPage;
```
> 确认 `useAuth` 暴露 `refreshProfile`/`technician`；`authService.updateProfile` 存在并接受 `{province, city}`（Task 9 已对齐）。若方法名不同（如 `technicianService.updateProfile`），用实际名。

- [ ] **Step 2: 守卫拦截**

`ProtectedRoute.tsx`：在 `if (!token || !technician) return <Navigate to="/login" .../>;` 之后、`return <>{children}</>;` 之前加：
```tsx
const needProfile = !technician.province || !technician.city;
if (needProfile && location.pathname !== '/profile-completion') {
  return <Navigate to="/profile-completion" replace />;
}
```

- [ ] **Step 3: 路由**

`App.tsx`：在受保护路由组内（与 `/profile-settings` 同级）加：
```tsx
<Route path="/profile-completion" element={<ProfileCompletionPage />} />
```
import：`const ProfileCompletionPage = lazy(() => import('./pages/ProfileCompletionPage'));`（与其它页一致的 lazy 模式；若非 lazy 则直接 import）。

- [ ] **Step 4: 构建 + lint**

Run: `cd technician-frontend && npm run build && npm run lint`
Expected: 成功。

- [ ] **Step 5: 提交**

```bash
git add technician-frontend/src/pages/ProfileCompletionPage.tsx technician-frontend/src/components/ProtectedRoute.tsx technician-frontend/src/App.tsx
git commit -m "feat(tech): 登录后强制完善省市守卫"
```

---

## Task 11: 技师端首页 热门作品 → 作品详情

**Files:**
- Modify: `technician-frontend/src/pages/HomePage.tsx`, `technician-frontend/src/pages/WorksPage.tsx`

- [ ] **Step 1: HomePage 每个热门作品跳带 workId**

`HomePage.tsx` 约 712 行：把每个作品的 `<Link key={work.id} to="/works" ...>` 改为 `to={\`/works?workId=${work.id}\`}`。标题旁「查看全部」的 `<Link to="/works">` 保持不变。

- [ ] **Step 2: WorksPage 读取 workId 并打开详情**

`WorksPage.tsx`：
- import：`import { useSearchParams } from 'react-router-dom';`
- 组件内：`const [searchParams, setSearchParams] = useSearchParams();`
- 在 works 数据加载完成后（works 列表 state 有值的 effect 中）加：
```ts
useEffect(() => {
  const wid = searchParams.get('workId');
  if (!wid || works.length === 0) return;
  const target = works.find((w) => w.id === Number(wid));
  if (target) {
    openWorkDetail(target);
    searchParams.delete('workId');
    setSearchParams(searchParams, { replace: true });
  }
}, [searchParams, works]);
```
（`openWorkDetail` 与 `works` 为现有；放在它们定义之后。`works` 的 state 变量名以文件实际为准。）

- [ ] **Step 3: 构建 + lint**

Run: `cd technician-frontend && npm run build && npm run lint`
Expected: 成功。

- [ ] **Step 4: 提交**

```bash
git add technician-frontend/src/pages/HomePage.tsx technician-frontend/src/pages/WorksPage.tsx
git commit -m "fix(tech-home): 热门作品点击进入该作品详情"
```

---

## 终验（全部任务完成后）

- [ ] **三端构建 + lint + 后端测试**

```bash
cd backend && npm run build && npx jest client-orders.conflict --silent
cd ../client-frontend && npm run build && npm run lint
cd ../technician-frontend && npm run build && npm run lint
```
Expected: 全绿。

- [ ] **手动冒烟（对照 spec 第「测试与验证」8 条）** —— 用 demo 数据逐条走查（清空某技师工时验证全天；两客户抢同段验证冲突提示+刷新；取消释放；无地址内联建址；跨城置灰+提示；技师热门作品进详情；空省市技师登录被强制完善；RegionSelect 保存回结构化省市）。

---

## 自检备注（已核对）

- **Spec 覆盖**：需求 1→T4/T7；需求 2→T1/T2/T5/T6/T7；需求 3→T6；需求 4→T1/T5/T6（+T3 数据）；需求 5→T11；需求 6→T3/T8/T9/T10。
- **类型一致**：`refresh`、`getSlotStatuses({shopHours})`、`hasEffectiveWorkTime`、`PROVINCE_CITY/PROVINCES`、`RegionSelect({province,city,onChange})`、`assertNoBlockedConflict`/`assertSameCity`、`Technician.province` 在定义任务与引用任务间命名一致。
- **冲突消息**：后端统一抛 `该时间段已经被其他用户预约，请重新选择预约时间`，三端 catch 以 `includes('该时间段已经被其他用户预约')` 匹配。
- **数据安全**：schema 仅加可空列；部署 `prisma db push` 增量、非破坏。
- **占用对称**：T2 确保技师建单也写 5h 冻结，与客户端口径一致，避免双端占用不同步。
- **未引入前端测试框架**：前端 build/lint + 手动冒烟；后端用既有 jest 加最小纯函数单测。

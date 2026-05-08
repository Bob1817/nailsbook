# 美甲师接单状态与店铺预约联动 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 打通美甲师接单状态、服务类型、店铺启用/营业时间与用户端预约可用性的完整闭环。

**Architecture:** 在现有 technician `status/homeService/shopService/shopAddresses` 结构上做最小扩展，不新增独立店铺表。店铺营业时间和启用状态继续存入 `shopAddresses` JSON；后端在用户预约提交时做最终校验，前端负责展示过滤与首次开启接单流程。

**Tech Stack:** NestJS, Prisma, React, TypeScript, Vite, Tailwind

---

### Task 1: 扩展店铺数据结构与默认值

**Files:**
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/contexts/authTypes.ts`
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/services/auth.ts`
- Modify: `/Users/shibo/Documents/Codex/nailBook/backend/src/technician-auth/technician-auth.service.ts`

- [ ] **Step 1: 扩展前端类型**

```ts
export interface ShopBusinessHour {
  weekday: number;
  start: string;
  end: string;
  closed?: boolean;
}

export interface ShopAddress {
  name: string;
  phone?: string;
  province?: string;
  city?: string;
  district?: string;
  detailAddress?: string;
  doorInfo?: string;
  latitude?: string;
  longitude?: string;
  enabled?: boolean;
  businessHours?: ShopBusinessHour[];
}
```

- [ ] **Step 2: 在前端 auth 映射里补默认值标准化**

```ts
function buildDefaultBusinessHours(): ShopBusinessHour[] {
  return [1, 2, 3, 4, 5, 6, 0].map((weekday) => ({
    weekday,
    start: '10:00',
    end: '21:00',
    closed: false,
  }));
}

function normalizeShopAddress(shop: ShopAddress): ShopAddress {
  return {
    ...shop,
    enabled: shop.enabled ?? true,
    businessHours: shop.businessHours?.length ? shop.businessHours : buildDefaultBusinessHours(),
  };
}
```

- [ ] **Step 3: 后端 technician 返回值统一补默认值**

```ts
private buildDefaultBusinessHours() {
  return [1, 2, 3, 4, 5, 6, 0].map((weekday) => ({
    weekday,
    start: '10:00',
    end: '21:00',
    closed: false,
  }));
}

private normalizeShopAddresses(addresses: any[] = []) {
  return addresses.map((shop) => ({
    ...shop,
    enabled: shop.enabled ?? true,
    businessHours:
      Array.isArray(shop.businessHours) && shop.businessHours.length > 0
        ? shop.businessHours
        : this.buildDefaultBusinessHours(),
  }));
}
```

- [ ] **Step 4: 在 login / me / updateServiceType 返回与保存流程中统一使用 normalize**

Run: `rg "shopAddresses" /Users/shibo/Documents/Codex/nailBook/backend/src/technician-auth/technician-auth.service.ts`
Expected: 找到 login、me、updateServiceType 三处并统一接入标准化逻辑

- [ ] **Step 5: 运行前后端构建验证**

Run: `cd /Users/shibo/Documents/Codex/nailBook/backend && npm run build`
Expected: exit 0

Run: `cd /Users/shibo/Documents/Codex/nailBook/technician-frontend && npm run build`
Expected: exit 0


### Task 2: 首页首次开启接单流程补齐最小建店

**Files:**
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/components/ServiceTypeSetupModal.tsx`
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/HomePage.tsx`

- [ ] **Step 1: 在服务类型弹窗中把“到店无店铺”改成内联最小建店表单**

```tsx
{shopService && shopAddresses.length === 0 && (
  <div className="rounded-2xl bg-pink-50 p-4 space-y-3">
    <p className="text-sm font-medium text-gray-900">先创建一个到店店铺</p>
    <input ... placeholder="店铺名称" />
    <input ... placeholder="详细地址" />
  </div>
)}
```

- [ ] **Step 2: 保存店铺时写入默认启用状态与营业时间**

```ts
const newShop: ShopAddress = {
  ...addressForm,
  enabled: true,
  businessHours: buildDefaultBusinessHours(),
};
```

- [ ] **Step 3: 提交流程改为使用当前 `shopAddresses`，不再只读 `existingShops`**

```ts
await onSubmit({
  homeService,
  shopService,
  shopAddresses: shopService ? shopAddresses : [],
});
```

- [ ] **Step 4: 首页开启接单逻辑保持最小闭环**

```ts
async function handleServiceTypeSubmit(settings: ServiceTypeSettings) {
  await updateServiceType(settings);
  await updateTechnicianStatus('active');
}
```

- [ ] **Step 5: 运行前端构建验证**

Run: `cd /Users/shibo/Documents/Codex/nailBook/technician-frontend && npm run build`
Expected: exit 0


### Task 3: 店铺管理补营业时间与启用开关

**Files:**
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/ShopManagement.tsx`
- Modify: `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/ShopEdit.tsx`

- [ ] **Step 1: 店铺管理卡片展示启用状态和营业时间摘要**

```tsx
<span className={shop.enabled ? 'text-emerald-600' : 'text-gray-400'}>
  {shop.enabled ? '营业中' : '已关闭'}
</span>
<p className="text-xs text-gray-400">{formatBusinessHours(shop.businessHours)}</p>
```

- [ ] **Step 2: 在店铺管理页增加启用/关闭切换**

```tsx
<button
  onClick={() => handleToggleEnabled(index)}
  className="rounded-full bg-gray-100 px-4 py-2 text-sm"
>
  {shop.enabled ? '关闭店铺' : '启用店铺'}
</button>
```

- [ ] **Step 3: 在编辑页增加营业时间编辑 UI**

```tsx
{businessHours.map((hour, index) => (
  <div key={hour.weekday} className="grid grid-cols-[auto_1fr_1fr] gap-3">
    <input type="checkbox" checked={!hour.closed} />
    <input type="time" value={hour.start} />
    <input type="time" value={hour.end} />
  </div>
))}
```

- [ ] **Step 4: 编辑页保存时把 `enabled` 和 `businessHours` 一并写回**

```ts
const nextShop: ShopAddress = {
  ...formData,
  enabled,
  businessHours,
};
```

- [ ] **Step 5: 运行前端构建验证**

Run: `cd /Users/shibo/Documents/Codex/nailBook/technician-frontend && npm run build`
Expected: exit 0


### Task 4: 用户端预约校验接入接单状态、店铺启用和营业时间

**Files:**
- Modify: `/Users/shibo/Documents/Codex/nailBook/backend/src/client-bookings/client-bookings.service.ts`

- [ ] **Step 1: 先拦截 technician 接单状态**

```ts
if (binding.technician.status !== 'active') {
  throw new BadRequestException('该美甲师当前未开启接单');
}
```

- [ ] **Step 2: 为到店预约补店铺启用校验**

```ts
const shops = this.normalizeShopAddresses(binding.technician.shopAddresses);
const selectedShop = shops.find((shop) => shop.name === dto.shopName);

if (!selectedShop?.enabled) {
  throw new BadRequestException('该店铺当前已关闭，暂不可预约');
}
```

- [ ] **Step 3: 补营业时间校验**

```ts
const serviceDate = new Date(dto.serviceDate);
const weekday = serviceDate.getDay();
const hour = selectedShop.businessHours.find((item) => item.weekday === weekday);

if (!hour || hour.closed || dto.startTime < hour.start || dto.startTime > hour.end) {
  throw new BadRequestException('预约时间不在店铺营业时间内');
}
```

- [ ] **Step 4: 运行后端构建验证**

Run: `cd /Users/shibo/Documents/Codex/nailBook/backend && npm run build`
Expected: exit 0


### Task 5: 用户端预约入口按可用性过滤展示

**Files:**
- Modify: `/Users/shibo/Documents/Codex/nailBook/client-frontend/src/pages/DesignDetail.tsx`
- Modify: `/Users/shibo/Documents/Codex/nailBook/client-frontend/src/services/technicians.ts`

- [ ] **Step 1: 前端 technician 数据映射标准化店铺字段**

```ts
const availableShops = (technician.shopAddresses || []).filter((shop) => shop.enabled !== false);
```

- [ ] **Step 2: 仅在美甲师接单中时展示预约入口**

```tsx
const canBook = design.technician.status === 'active';
```

- [ ] **Step 3: 服务类型展示只保留当前可用项**

```tsx
const canHomeService = canBook && design.technician.homeService;
const canShopService = canBook && design.technician.shopService && availableShops.length > 0;
```

- [ ] **Step 4: 到店选择只展示启用店铺**

```tsx
{availableShops.map((shop) => (
  <option key={shop.name} value={shop.name}>{shop.name}</option>
))}
```

- [ ] **Step 5: 运行用户端构建验证**

Run: `cd /Users/shibo/Documents/Codex/nailBook/client-frontend && npm run build`
Expected: exit 0


### Task 6: 全链路回归验证

**Files:**
- Verify only

- [ ] **Step 1: 验证首次登录默认关闭**

Run: 在美甲师端登录后进入首页，检查 switch 文案是否为 `已暂停`
Expected: 默认关闭

- [ ] **Step 2: 验证首次开启接单**

Run: 首页点击开启接单 → 选择上门/到店 → 若到店无店铺则填写名称和地址 → 保存
Expected: 接单状态变为 `active`，店铺同步出现在 `/shops`

- [ ] **Step 3: 验证店铺启用/关闭和营业时间**

Run: 进入 `/shops` 编辑任意店铺，修改营业时间并关闭店铺，再返回列表
Expected: 状态和营业时间展示正确

- [ ] **Step 4: 验证用户端预约过滤**

Run: 在用户端选择对应美甲师预约
Expected: 暂停接单时无法预约；接单中时仅显示启用服务类型；到店仅显示启用店铺

- [ ] **Step 5: 验证到店预约营业时间拦截**

Run: 选择超出营业时间的时间发起到店预约
Expected: 后端返回 `预约时间不在店铺营业时间内`


# WebApp 预约入口收敛与表单精简设计文档

**日期：** 2026-06-04
**作者：** Claude + shibo
**状态：** 已确认，待实现
**范围：** 仅 `client-frontend`（webapp）。不改动 `client-wxapp`、`mobile-flutter`，不改后端 API。

---

## 背景与问题

预约系统是同一套（统一走 `POST /orders`），但 webapp 有三个发起场景，对「美甲师」的已知程度不同：

1. **场景 1 — 从零预约**：首页 / 订单页「去预约」，不带任何预约信息
2. **场景 2 — 聊天发起**：对话对象即美甲师，已知
3. **场景 3 — 预约同款**：作品/设计发布者即美甲师，作品本身即参考，均已知

当前实现已有两套预约界面：

- **快速底单** `ChatBookingSheet`（底部弹层，已含月历 + 工作时段 + 已预约置灰）——仅场景 2 使用，体验好
- **完整表单** `CreateOrder.tsx`（单页 6 段长表单，也已含同样的月历 + 占用逻辑）

### 核心痛点

1. **入口分流不一致**：场景 3（预约同款）和「名片预约」虽然美甲师已确定，却 `navigate('/orders/create?...')` 跳进与「从零预约」相同的 6 段长表单，还要从「选择美甲师」开始往下滚——而隔壁聊天场景已有优雅的快速弹层。同样的「已知美甲师」上下文，体验天差地别。
2. **完整表单过长**：`CreateOrder.tsx` 所有段落始终展开；单美甲师时仍渲染整段「选择美甲师」；「自定义服务」藏在服务列表里作为 toggle，点开后路径比主路径还长，容易迷惑。
3. **日历/占用逻辑重复**：`isDateAvailable` / `slotStatuses` / `blockedSlots` 在 `ChatBookingSheet` 和 `CreateOrder` 各写了一份，今后易不一致。

> 注：用户最初担心的「时间选择体验」（22 格宫格、无占用提示）在 webapp 中**已经解决**——两处都已是月历 + 时段网格 + 「已预约」置灰（即下文方案 B）。本次不再改动时间选择交互本身。

---

## 方案：统一收敛，不新增第三套界面

```
┌─────────────────────────────────────────────────────┐
│  共用层（消除重复）                                     │
│  useTechnicianAvailability(technician)  ← 新建 hook    │
│    └─ isDateAvailable(dateStr)                         │
│       slotStatuses(dateStr, { isShopService, ... })    │
│       blockedSlots                                     │
└─────────────────────────────────────────────────────┘
            │                          │
            ▼                          ▼
  ┌──────────────────┐      ┌──────────────────────┐
  │ BookingSheet     │      │ CreateOrder.tsx       │
  │ (由 ChatBooking  │      │ (场景 1：从零预约)      │
  │  Sheet 泛化)      │      │ 原地精简               │
  │ 已知美甲师场景：   │      │                       │
  │ - 场景 2 聊天     │      │ - 单师折叠「选美甲师」 │
  │ - 场景 3 预约同款 │      │ - 自定义服务提为并列项 │
  │ - 名片预约(已绑定)│      │ - 复用 availability hook│
  └──────────────────┘      └──────────────────────┘
```

设计原则：webapp 不新增第三套预约界面，把已知美甲师的入口统一到快速弹层，完整表单只服务「从零预约」并原地精简。

---

## 组件 1：`useTechnicianAvailability` hook（新建）

把现在分别内联在 `ChatBookingSheet` 与 `CreateOrder` 的可用性逻辑抽成单一来源。

**输入：** `technician: Technician`

**输出：**
- `blockedSlots: { startTime: string; endTime: string }[]` —— 内部用 `orderService.getBlockedSlots(technician.id)` 拉取
- `isDateAvailable(dateStr: string): boolean` —— 基于 `serviceSchedule`（新版 `schemes` + `activeSchemeId` + `restDays`，及 legacy 格式），逻辑与现有 `CreateOrder.tsx:196-213` 完全一致
- `slotStatuses(dateStr, opts?): { time: string; occupied: boolean }[]` —— 基于工作时段范围过滤 + `blockedSlots` 判定占用。`opts` 可传入到店营业时段过滤所需信息（见下）

**约束：** 行为必须与现有实现等价——本 hook 是「抽取」而非「重写」。抽取后 `ChatBookingSheet` 和 `CreateOrder` 都改为调用它，删除各自的内联副本。

> 到店营业时段过滤（`shopAvailableTimeSlots`）目前只存在于 `CreateOrder`。hook 通过可选 `opts`（如 `{ shopHours }`）支持这一过滤；`ChatBookingSheet` 不传则不过滤，保持现状。

---

## 组件 2：`BookingSheet`（由 `ChatBookingSheet` 泛化）

在现有 `ChatBookingSheet` 基础上扩展，使其可被「已知美甲师」的各入口复用。

### 接口

```ts
interface BookingSheetProps {
  technician: Technician;          // 完整对象，各入口从 useAuth().technicians 按 id 查到
  prefill?: {
    title?: string;
    description?: string;
    images?: string[];             // 预约同款：作品封面/图片作为参考图
  };
  mode?: 'chat' | 'standalone';    // 默认 standalone
  onClose: () => void;
  onCreated?: () => void;
}
```

### 相比现有 `ChatBookingSheet` 的新增能力

1. **`prefill` 预填**：打开时把 `prefill.images` 填入参考图、`prefill.title`/`description` 填入说明区。预约同款场景下用户打开即「带着作品」，只需选时间。
2. **`onCreated` 行为分流**：
   - `mode === 'chat'`：沿用现状——`chatMode: true`，创建后由调用方（`ChatDetail`）发预约卡片消息
   - `mode === 'standalone'`：正常创建（不带 `chatMode`），成功后 `onCreated`（跳 `/orders` 或弹成功提示）
3. 其余（服务方式单一时固定、地址默认选中/内联新增、月历+时段占用）沿用现有逻辑，改为通过 `useTechnicianAvailability` 取数。

### 提交语义

预约同款本质是「我想要这个款，请报价」，契合现有「说明 + 参考图 → 报价」模式：仍走 `customDescription` + `customImages`，**不选预设服务项目**。

---

## 三个入口的具体改动

| 入口 | 当前 | 改动后 |
|------|------|--------|
| **场景 2 聊天** `ChatDetail.tsx:553` | 已用 `ChatBookingSheet`，`technician={fullTech}` | 改引用泛化后的 `BookingSheet`，`mode="chat"`；行为回归不变 |
| **场景 3 预约同款** `DesignDetail.tsx:262` | `navigate('/orders/create?design_id&tech_id')` | 从 `useAuth().technicians` 按 `design.technician.id` 查完整 tech → 打开 `BookingSheet`，`prefill` 带作品标题+图片；查不到则**回退**为现有跳转 |
| **名片预约（已绑定）** `ArtistCardModal.tsx:52` | `navigate('/orders/create?tech_id')` | 用 props 上的完整 `technician` → 打开 `BookingSheet`（`standalone`） |
| **名片预约（公开/未绑定）** `PublicArtistCard.tsx:66` | `navigate('/orders/create?tech_id')` | **保持现状**——此处走「先绑定再预约」链路，可能未登录/未绑定，不强行改弹层 |

### 边界处理

- 任一入口若无法取得完整 `Technician`（缺 `serviceSchedule` 等），回退到现有的 `navigate('/orders/create?...')`，不阻断预约。

---

## 场景 1 完整表单精简（`CreateOrder.tsx`）

保留单页表单（用户已选「原地精简」，不改弹层/向导），做三处改动：

1. **单美甲师折叠「选择美甲师」**
   - `bookableTechnicians.length === 1`：顶部渲染一行紧凑摘要（头像 + 名字 +「默认」徽标），不占整段
   - `length > 1`：保持现有选择列表

2. **「自定义服务」提为并列选项**
   - 「服务内容」段顶部用二选一分段控件：`选服务项目 | 自定义需求`，两条路径平级可见，选哪个展开哪个
   - 移除「藏在服务列表里的 toggle」式交互

3. **复用 `useTechnicianAvailability`**
   - 删除本页内联的 `isDateAvailable` / `slotStatuses` / `blockedSlots` effect，改为调用 hook

---

## 明确不做（YAGNI）

- 不把场景 1 改成弹层或分步向导
- 不动 `client-wxapp`、`mobile-flutter`
- 不改后端 API（`getBlockedSlots`、`createOrder` 沿用）
- 不改时间选择交互本身（方案 B 已落地）
- 不动 `PublicArtistCard` 的公开预约链路

---

## 成功标准（验收）

1. 作品/设计详情点「预约同款」→ 弹出 `BookingSheet`，作品图已预填为参考图，选时间即可提交，成功后进入订单列表
2. 美甲师名片（已绑定上下文）点「预约」→ 弹出 `BookingSheet`
3. 聊天内发起预约 → 行为回归不变（仍发预约卡片消息）
4. 场景 1 单美甲师 →「选择美甲师」折叠为一行；「服务内容」为 `选服务项目 | 自定义需求` 并列分段
5. 取不到完整 tech 的入口 → 回退跳转完整表单，预约不中断
6. `ChatBookingSheet` 与 `CreateOrder` 不再各自持有重复的日历/占用逻辑（统一走 hook）
7. `npm run build` 通过、无新增 TS 报错
```

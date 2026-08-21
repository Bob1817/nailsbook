# 美甲师端优化设计：热门作品 / 登录引导 / 工作时间重做

日期：2026-06-03
分支：reconcile-set-password
范围：technician-frontend + client-frontend（**后端无改动、不动数据库结构**）

---

## ① 今日热门作品全量展示

**现状**：`HomePage.tsx` 的 `featuredWorks` 把全部作品按热度排序后 `.slice(0, 4)`。

**改动**：
- 改为 `works.filter(w => w.isFeatured)`，按现有热度公式排序（`viewCount + likeCount + favoriteCount + commentCount` 降序，同分按 `createdAt` 倒序），**去掉 `.slice(0, 4)`**。
- 无推荐作品时沿用现有空状态占位 UI（`featuredWorks.length ? ... : ...`）。
- 「推荐」= `isFeatured`，由 WorksPage 现有「推荐作品/取消推荐」开关控制，机制现成。

**文件**：`technician-frontend/src/pages/HomePage.tsx`（单文件）。

**验收**：把 N(>4) 个作品设为推荐 → 首页热门区显示全部 N 个；取消某个推荐 → 它从热门区消失；无推荐 → 显示空状态。

---

## ② 登录引导（服务类型 → 工作时间）

**触发**：美甲师未配置服务类型（`homeService` 与 `shopService` 均未设置）时登录。

**流程**（两步引导）：
1. Step1：服务类型设置（复用 `ServiceTypeSetupModal`，选上门/店铺）。
2. Step2：提示设置工作时间 —— 选项 [去设置]（跳转工作时间页）/ [跳过]。

**可忽略**：
- 现有弹窗去掉强制（`isForceSetup` 默认 true → 支持「跳过」按钮）。
- 跳过 = 关闭引导进首页；**只要服务类型仍未配置，下次登录再次引导**（不持久化"已忽略"标记）。

**文件**：`technician-frontend/src/components/ServiceTypeSetupModal.tsx`（加跳过/第二步提示）、`technician-frontend/src/pages/HomePage.tsx`（触发与跳转）。

**验收**：未配置服务类型的账号登录 → 弹引导；跳过 → 进首页；再次登录 → 仍引导；完成服务类型配置后 → 不再引导。

---

## ③ 工作时间重做（仿苹果闹钟）

### 数据模型（存于 `technician.serviceSchedule` 的 JSON，后端零改动）

```ts
interface WorkTimeScheme {
  id: string;          // uuid/时间戳
  label: string;       // 标签，如"日常""周末"
  startTime: string;   // "10:00"
  endTime: string;     // "21:00"
  days: string[];      // 应用的工作日，子集 of ['mon','tue','wed','thu','fri','sat','sun']
}
interface ServiceSchedule {
  schemes: WorkTimeScheme[];
  activeSchemeId: string | null;   // 仅一个启用
  restDays: string[];              // 休息日 'YYYY-MM-DD'，不可预约
  // 旧字段（仅读取兼容，不再写入）：days?: Record<string, {enabled,startTime,endTime}>; selectedDates?: string[];
}
```

一个方案 = 一段工作时间 + 应用到的工作日 + 标签。多个方案，**同一时刻仅一个启用**。

### 技师端 ServiceTimePage（重做）

- **方案列表**（闹钟列表风格）：每条显示 标签 / 时间段(10:00–21:00) / 应用工作日(周一·周二…) / 单选启用钮（启用一个自动停用其余 → 设 `activeSchemeId`）。
- 点方案 → **弹窗**：
  - 上方：时间段选择（开始 / 结束）。
  - 下方：应用范围 —— 周一~周日多选 chips。
  - 标签输入框。
  - 保存 / 删除按钮。
- 顶部「+」新增方案（默认 10:00–21:00、空 days、自动生成标签如"方案1"）。
- 页面**最下方**「设置休息日」按钮 → 日历（月视图，多选日期）→ 选中后点「设置为休息日」→ 加入 `restDays`；已设休息日以列表/高亮展示，可移除。

### 客户端 CreateOrder（消费方）

`isDateAvailable(dateStr)` 与时段生成按格式分支：
- **新格式**（有 `schemes`）：
  - 可预约日期 = 该日期的星期 ∈ 启用方案 `days` **且** `dateStr ∉ restDays`。
  - 可预约时段 = 启用方案 `startTime`–`endTime` 内的半点档，**再减去** 已有 `BlockedTimeSlot` 占用。
  - 无启用方案（`activeSchemeId` 为空）→ 视为不可预约。
- **旧格式**（无 `schemes`、有 `days`）：保持现有逻辑（`days[dayKey].enabled`、`selectedDates` 白名单）。

### 兼容老数据（不动数据库）

- 技师端加载时：若 `serviceSchedule` 无 `schemes` 但有 `days` → 在内存构造一个「默认方案」：`days` = 原 enabled 的天；`startTime/endTime` = 这些天里最常见的时段（取众数，缺省 10:00–21:00）；`label`="默认"；`activeSchemeId` 指向它；`restDays`=[]。
- 用户**下次保存**才把新格式写回，旧数据不主动迁移。
- ⚠️ 已知边界：旧 `selectedDates`（白名单）语义与新 `restDays`（黑名单）相反，迁移**不携带** `selectedDates`。极少数用过该白名单的美甲师需重新设置休息日。

**文件**：`technician-frontend/src/pages/ServiceTimePage.tsx`（重做）、`technician-frontend/src/contexts/authTypes.ts`（类型）、`client-frontend/src/pages/CreateOrder.tsx`（消费逻辑兼容）。可能新增日历/时间选择小组件。

**验收**：
- 建两个方案（"日常"周一~周五 10–21、"周末"周六周日 12–20），启用其一 → 客户端下单页仅在对应工作日、对应时段可约。
- 切换启用方案 → 客户端可约日期/时段随之变化。
- 设某日为休息日 → 客户端该日不可约，即使其星期在启用方案内。
- 旧格式账号进页面 → 自动呈现"默认方案"，客户端可预约性与改造前一致。

---

## 非目标（YAGNI）

- 不做方案的拖拽排序、不做跨天时段（如 22:00–次日02:00）、不做单方案多时段（拼班）—— 本期一个方案一段时间。
- 不改后端、不加数据库表/列。
- 休息日仅"全天不可约"，不支持"半天休息"。

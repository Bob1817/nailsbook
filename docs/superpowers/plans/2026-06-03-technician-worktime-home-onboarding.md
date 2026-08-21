# 美甲师端优化实现计划：热门作品 / 登录引导 / 工作时间重做

> **For agentic workers:** 本计划按任务逐个实现。前端无 jest 组件测试，验证统一用 `npm run build`（tsc+vite，类型即测试）+ `npx eslint <改动文件>` + 预览手动核对。每个任务独立可测、独立提交。

**Goal:** 美甲师端三项优化 —— 首页全量展示推荐作品、登录引导服务类型+工作时间、工作时间重做为仿苹果闹钟的多方案+休息日模型，并让客户端下单页正确消费新模型。

**Architecture:** 纯前端改动，后端零改动。工作时间新模型存于既有 `technician.serviceSchedule` JSON 字段（后端透传，不动数据库）。客户端消费方对新/旧格式分支兼容。

**Tech Stack:** React + TypeScript + Vite + Tailwind（technician-frontend / client-frontend）。分支 `reconcile-set-password`。

---

## Task 1: 今日热门作品全量展示

**Files:**
- Modify: `technician-frontend/src/pages/HomePage.tsx`（`featuredWorks` useMemo，约 298-309 行）

- [ ] **Step 1: 改 featuredWorks 逻辑**

把：
```ts
const featuredWorks = useMemo(
  () =>
    [...works]
      .sort((left, right) => { /* 热度 */ })
      .slice(0, 4),
  [works]
);
```
改为（先 filter isFeatured，去掉 slice）：
```ts
const featuredWorks = useMemo(
  () =>
    works
      .filter((w) => w.isFeatured)
      .sort((left, right) => {
        const leftScore = (left.viewCount || 0) + left.likeCount + left.favoriteCount + left.commentCount;
        const rightScore = (right.viewCount || 0) + right.likeCount + right.favoriteCount + right.commentCount;
        if (rightScore !== leftScore) return rightScore - leftScore;
        return (parseDate(right.createdAt)?.getTime() ?? 0) - (parseDate(left.createdAt)?.getTime() ?? 0);
      }),
  [works]
);
```

- [ ] **Step 2: 验证空状态仍生效** —— 确认渲染处 `featuredWorks.length ? (...) : (空状态)` 不变。

- [ ] **Step 3: 构建+lint**
Run: `cd technician-frontend && npm run build && npx eslint src/pages/HomePage.tsx`
Expected: 构建通过、0 lint 错误。

- [ ] **Step 4: 提交**
```bash
git add technician-frontend/src/pages/HomePage.tsx
git commit -m "feat(technician-home): show all featured works in 今日热门作品"
```

---

## Task 2: 工作时间数据模型与类型（authTypes + 工具函数）

新模型是 Task 3/5 的基础，先落类型与纯函数工具（可独立验证）。

**Files:**
- Modify: `technician-frontend/src/contexts/authTypes.ts`（`ServiceSchedule`、新增 `WorkTimeScheme`）
- Create: `technician-frontend/src/utils/workSchedule.ts`（迁移/规范化纯函数）

- [ ] **Step 1: 扩展类型**

`authTypes.ts` 中 `ServiceSchedule` 改为：
```ts
export interface WorkTimeScheme {
  id: string;
  label: string;
  startTime: string; // "10:00"
  endTime: string;   // "21:00"
  days: string[];    // 子集 of ['mon','tue','wed','thu','fri','sat','sun']
}

export interface ServiceSchedule {
  schemes?: WorkTimeScheme[];
  activeSchemeId?: string | null;
  restDays?: string[]; // 'YYYY-MM-DD'
  // 旧字段（仅读取兼容）：
  days?: Record<string, DaySchedule>;
  selectedDates?: string[];
}
```
（保留 `days`/`selectedDates` 为可选，供旧数据读取与客户端兼容分支。）

- [ ] **Step 2: 写迁移/规范化工具 `workSchedule.ts`**
```ts
import type { DaySchedule, ServiceSchedule, WorkTimeScheme } from '../contexts/authTypes';

export const DAY_KEYS = ['mon','tue','wed','thu','fri','sat','sun'] as const;
export const DAY_LABELS: Record<string,string> = { mon:'周一',tue:'周二',wed:'周三',thu:'周四',fri:'周五',sat:'周六',sun:'周日' };

export function isNewFormat(s?: ServiceSchedule | null): boolean {
  return !!s && Array.isArray(s.schemes);
}

// 旧 days{} → 一个默认方案；新格式原样返回；空 → 一个默认空方案
export function normalizeSchedule(saved?: ServiceSchedule | null): ServiceSchedule {
  if (saved && Array.isArray(saved.schemes)) {
    return { schemes: saved.schemes, activeSchemeId: saved.activeSchemeId ?? saved.schemes[0]?.id ?? null, restDays: saved.restDays ?? [] };
  }
  if (saved?.days) {
    const enabled = DAY_KEYS.filter((k) => saved.days![k]?.enabled);
    // 众数时段
    const counts: Record<string, number> = {};
    enabled.forEach((k) => { const d = saved.days![k]; const key = `${d.startTime}-${d.endTime}`; counts[key] = (counts[key]||0)+1; });
    const top = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0];
    const [startTime, endTime] = top ? top.split('-') : ['10:00','21:00'];
    const scheme: WorkTimeScheme = { id: 'default', label: '默认', startTime, endTime, days: enabled.length ? enabled : [...DAY_KEYS] };
    return { schemes: [scheme], activeSchemeId: scheme.id, restDays: [] };
  }
  const scheme: WorkTimeScheme = { id: genId(), label: '默认', startTime: '10:00', endTime: '21:00', days: [...DAY_KEYS] };
  return { schemes: [scheme], activeSchemeId: scheme.id, restDays: [] };
}

export function genId(): string { return `s_${Date.now()}_${Math.floor(Math.random()*1000)}`; }

export function activeScheme(s: ServiceSchedule): WorkTimeScheme | null {
  return s.schemes?.find((x) => x.id === s.activeSchemeId) ?? null;
}

export function daysSummary(days: string[]): string {
  if (days.length === 7) return '每天';
  if (days.length === 0) return '未选择';
  return days.slice().sort((a,b)=>DAY_KEYS.indexOf(a as any)-DAY_KEYS.indexOf(b as any)).map((d)=>DAY_LABELS[d]).join('·');
}
```

- [ ] **Step 3: 构建+lint**
Run: `cd technician-frontend && npm run build && npx eslint src/utils/workSchedule.ts src/contexts/authTypes.ts`
Expected: 通过。（注意 ServiceTimePage 旧引用 `mergeSchedule`/`days` 将在 Task 3 重写，若此步因旧页面类型不兼容报错，先不改其它文件——本步只确保新增内容自身类型正确；如有阻塞，跳到 Task 3 一起验证。）

- [ ] **Step 4: 提交**
```bash
git add technician-frontend/src/contexts/authTypes.ts technician-frontend/src/utils/workSchedule.ts
git commit -m "feat(technician-schedule): work-time scheme model + migration utils"
```

---

## Task 3: 工作时间页重做（ServiceTimePage 仿闹钟）

**Files:**
- Rewrite: `technician-frontend/src/pages/ServiceTimePage.tsx`
- Create: `technician-frontend/src/components/SchemeEditorModal.tsx`（方案编辑弹窗）
- Create: `technician-frontend/src/components/RestDayCalendar.tsx`（休息日日历多选）

- [ ] **Step 1: 方案编辑弹窗 `SchemeEditorModal.tsx`**
Props: `{ open, scheme: WorkTimeScheme, onSave(scheme), onDelete(), onClose }`。布局：
  - 上方：开始/结束时间（沿用半点 `select`，选项 `TIME_OPTIONS`，校验 start<end）
  - 下方：周一~周日 chips 多选（toggle `days`）
  - 标签输入框（`label`）
  - 底部：保存（校验 days 非空、start<end）/ 删除 / 取消
触摸友好（≥44px）。

- [ ] **Step 2: 休息日日历 `RestDayCalendar.tsx`**
Props: `{ open, value: string[], onConfirm(dates: string[]), onClose }`。月视图（含上/下月切换），点击日期切换选中（多选，禁用过去日期可选——允许选今天及以后），底部「设置为休息日」确认。输出 'YYYY-MM-DD'。

- [ ] **Step 3: 重写 ServiceTimePage**
  - state：`schedule: ServiceSchedule = normalizeSchedule(technician?.serviceSchedule)`
  - 顶部标题栏（沿用现有返回头）+ 右上「+」新增方案（push 一个 `{id:genId(),label:'方案'+n,startTime:'10:00',endTime:'21:00',days:[]}` 并打开编辑弹窗）
  - 方案列表：每条显示 标签 / `startTime–endTime` / `daysSummary(days)` / 单选启用钮（点选设 `activeSchemeId=该id`）；点条目主体打开 `SchemeEditorModal` 编辑
  - 最下方「设置休息日」按钮 → 打开 `RestDayCalendar`；已设休息日以 chips 列表展示，可点 × 移除
  - 保存按钮 → `updateTechnicianProfile({ serviceSchedule: schedule })`，toast 成功/失败
  - 编辑弹窗 onSave 用新 scheme 替换列表中同 id 项；onDelete 移除该 scheme（若删的是 active，则 active 切到剩余第一个或 null）

- [ ] **Step 4: 构建+lint**
Run: `cd technician-frontend && npm run build && npx eslint src/pages/ServiceTimePage.tsx src/components/SchemeEditorModal.tsx src/components/RestDayCalendar.tsx`
Expected: 通过。

- [ ] **Step 5: 预览手动核对**
启动 technician-frontend 预览，进入「服务时间」页：新增两个方案、切换启用、设一个休息日、保存。确认 toast 成功、刷新后保留。

- [ ] **Step 6: 提交**
```bash
git add technician-frontend/src/pages/ServiceTimePage.tsx technician-frontend/src/components/SchemeEditorModal.tsx technician-frontend/src/components/RestDayCalendar.tsx
git commit -m "feat(technician-schedule): redesign ServiceTimePage with alarm-style schemes + rest days"
```

---

## Task 4: 登录引导（服务类型 → 工作时间，可跳过）

**Files:**
- Modify: `technician-frontend/src/components/ServiceTypeSetupModal.tsx`（加跳过、加第二步提示）
- Modify: `technician-frontend/src/pages/HomePage.tsx`（触发与跳转，约 371 行 hasServiceType 判断与 1013 行 modal）

- [ ] **Step 1: 弹窗加「跳过」与第二步**
  - 给 `ServiceTypeSetupModal` 增加可选 `onSkip?: () => void`；当传入时，底部显示「跳过」按钮（不再强制）。
  - 新增轻量第二步：服务类型保存成功后，弹窗内切换到「设置工作时间」提示页，按钮 [去设置]（`navigate('/service-time')`）/ [跳过]（关闭进首页）。可在 HomePage 用本地 state 控制第二步，或在 modal 内加 `step` 状态。选 modal 内 `step: 'type'|'time'` 实现，回调 `onGoSetTime`、`onSkip`。

- [ ] **Step 2: HomePage 触发**
  - 现有：`showServiceTypeModal` 在无服务类型时打开。保持触发条件（`homeService`、`shopService` 均未设置）。
  - 传入 `onSkip` 关闭弹窗（不写持久标记 → 下次登录仍触发）。
  - `onGoSetTime` → `navigate('/service-time')`。

- [ ] **Step 3: 构建+lint**
Run: `cd technician-frontend && npm run build && npx eslint src/components/ServiceTypeSetupModal.tsx src/pages/HomePage.tsx`
Expected: 通过。

- [ ] **Step 4: 预览核对** —— 用未配置服务类型的账号登录：弹引导→选服务类型→提示设工作时间→[去设置]跳转/[跳过]进首页；重登仍引导。

- [ ] **Step 5: 提交**
```bash
git add technician-frontend/src/components/ServiceTypeSetupModal.tsx technician-frontend/src/pages/HomePage.tsx
git commit -m "feat(technician-onboarding): guided service-type then work-time, skippable"
```

---

## Task 5: 客户端下单页消费新模型（CreateOrder 兼容）

**Files:**
- Modify: `client-frontend/src/pages/CreateOrder.tsx`（`isDateAvailable` 160-174、`availableTimeSlots` 145-157）

- [ ] **Step 1: isDateAvailable 加新格式分支**
```ts
const isDateAvailable = useCallback((dateStr: string) => {
  const sched = selectedTechnician?.serviceSchedule;
  if (!sched) return true;
  const weekday = new Date(`${dateStr}T00:00:00`).getDay();
  const dayKey = ['sun','mon','tue','wed','thu','fri','sat'][weekday];

  // 新格式：schemes + activeSchemeId + restDays
  if (Array.isArray(sched.schemes)) {
    if (sched.restDays?.includes(dateStr)) return false;
    const active = sched.schemes.find((s) => s.id === sched.activeSchemeId);
    if (!active) return false;
    return active.days.includes(dayKey);
  }

  // 旧格式
  if (sched.selectedDates && sched.selectedDates.length > 0) return sched.selectedDates.includes(dateStr);
  return sched.days?.[dayKey]?.enabled ?? true;
}, [selectedTechnician]);
```

- [ ] **Step 2: 时段按启用方案范围过滤**
新增 `scheduleRange`（启用方案的 start/end，新格式才有），并入 `availableTimeSlots`：
```ts
const scheduleRange = useMemo(() => {
  const sched = selectedTechnician?.serviceSchedule;
  if (!sched || !Array.isArray(sched.schemes)) return null;
  const active = sched.schemes.find((s) => s.id === sched.activeSchemeId);
  return active ? { start: active.startTime, end: active.endTime } : null;
}, [selectedTechnician]);

const availableTimeSlots = useMemo(() => {
  let baseSlots = isShopService ? shopAvailableTimeSlots : timeSlots;
  // 技师工作时间方案范围（上门/到店都收敛）
  if (scheduleRange) {
    const s = timeToMinutes(scheduleRange.start), e = timeToMinutes(scheduleRange.end);
    baseSlots = baseSlots.filter((slot) => { const m = timeToMinutes(slot); return m >= s && m < e; });
  }
  if (blockedSlots.length === 0) return baseSlots;
  return baseSlots.filter((slot) => {
    const slotDateTime = new Date(`${formData.serviceDate}T${slot}:00`);
    return !blockedSlots.some((b) => { const bs = new Date(b.startTime), be = new Date(b.endTime); return slotDateTime >= bs && slotDateTime < be; });
  });
}, [isShopService, shopAvailableTimeSlots, blockedSlots, formData.serviceDate, scheduleRange]);
```

- [ ] **Step 3: 文案微调（可选）** —— 行 1013 附近原"仅在特定日期接单"针对旧 selectedDates；新格式下休息日提示沿用"所选日期为休息日"。确认 `isDateAvailable=false` 时已有不可选提示即可，无需新增。

- [ ] **Step 4: 构建+lint**
Run: `cd client-frontend && npm run build && npx eslint src/pages/CreateOrder.tsx`
Expected: 通过。

- [ ] **Step 5: 端到端预览核对** —— 技师端建方案/设休息日并保存后，客户端下单页选该技师：仅工作日+方案时段可约，休息日不可约。

- [ ] **Step 6: 提交**
```bash
git add client-frontend/src/pages/CreateOrder.tsx
git commit -m "feat(client-order): consume new work-time scheme model with rest days"
```

---

## Task 6: 整体回归与部署

- [ ] **Step 1: 全量构建** —— `technician-frontend`、`client-frontend` 各 `npm run build` 通过。
- [ ] **Step 2: 后端无改动确认** —— `git diff --stat origin/reconcile-set-password -- backend/` 应为空。
- [ ] **Step 3: 推送** —— 仅 webapp 白名单文件已提交，`git push origin reconcile-set-password`。
- [ ] **Step 4: 部署（严格串行单容器）** —— 仅改了 technician-frontend + client-frontend，需重建 `tech-web` 与 `client-web`：
  ```
  DEPLOY_BRANCH=reconcile-set-password 下，服务器 git pull 后：
  docker compose build tech-web   # 完成后再
  docker compose build client-web # 一次只构建一个（2G 内存铁律）
  docker compose up -d tech-web client-web
  docker compose restart nginx    # 容器重建后修复上游 502
  ```
- [ ] **Step 5: 健康检查** —— m/tech → 200。
- [ ] **Step 6: 数据安全** —— 本次零后端/数据库改动，prod.db 不受影响。

---

## Self-Review 结果

- **Spec 覆盖**：① Task1；② Task4；③ 模型 Task2 / 技师端 Task3 / 客户端 Task5 / 兼容 Task2+Task5。全覆盖。
- **占位符**：无 TBD/TODO，关键代码均给出。
- **类型一致**：`WorkTimeScheme`/`ServiceSchedule`/`normalizeSchedule`/`activeScheme`/`daysSummary` 跨任务命名一致；`days` 用 'mon'..'sun'，weekday 映射用 ['sun'..'sat'] 与现有代码一致。
- **铁律**：部署串行单容器、后端/数据库零改动 —— 已在 Task6 固化。

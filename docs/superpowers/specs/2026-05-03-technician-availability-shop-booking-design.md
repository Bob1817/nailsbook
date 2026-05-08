# 美甲师接单状态与店铺预约联动设计

## 目标

把美甲师端的接单状态、服务类型、店铺管理，与用户端预约能力打通成一个完整闭环：

1. 美甲师首次登录时，接单状态默认为关闭。
2. 美甲师首次开启接单时，必须先配置接单服务类型。
3. 如果开启到店美甲，必须存在可用店铺；没有店铺时在当前流程里完成最小建店。
4. 用户端只有在美甲师开启接单时，才能对该美甲师发起预约。
5. 用户端预约时，只展示该美甲师当前启用的服务类型和可用店铺。
6. 店铺管理支持营业时间和启用/关闭；到店预约必须落在启用店铺的营业时间内。

## 现状

当前代码已经具备以下基础：

- 美甲师有 `status`、`homeService`、`shopService`、`shopAddresses`。
- 首页接单开关已经能真实写后端 `PATCH /api/technician/auth/status`。
- 服务类型弹窗已经存在，但对到店场景只做了“是否有店铺”的粗判断。
- 店铺管理页支持新增/编辑/删除店铺基本信息。
- 用户端预约时已经会校验：
  - 上门服务是否开启
  - 到店服务是否开启
  - 选择的店铺是否属于该美甲师

当前缺口：

- 接单状态没有参与用户端预约拦截。
- 店铺没有“启用状态”和“营业时间”。
- 到店场景没有“首次建店”的完整引导。
- 用户端没有按“接单中 + 服务类型 + 店铺状态 + 营业时间”做完整可预约性约束。

## 数据设计

### 美甲师状态

- `status === 'active'`：接单中，可被用户端预约。
- `status === 'inactive'`：暂停接单，可登录，不可被用户端预约。
- `status === 'suspended'`：禁用，不可登录。

首次登录默认状态按 `inactive` 处理。

### 店铺结构扩展

现有 `shopAddresses` 继续保存在 technician 的 JSON 字段中，不新增独立店铺表，先走最小实现。

`ShopAddress` 扩展为：

- `name`
- `phone?`
- `province?`
- `city?`
- `district?`
- `detailAddress?`
- `doorInfo?`
- `latitude?`
- `longitude?`
- `enabled: boolean`
- `businessHours: Array<{ weekday: number; start: string; end: string; closed?: boolean }>`

约束：

- 新建店铺默认 `enabled = true`
- 营业时间默认生成周一到周日 `10:00-21:00`
- 没有营业时间的旧店铺在前端读取时补默认值，保存后落回后端

## 业务规则

### 美甲师端

1. 首次开启接单
   - 如果当前 `status !== active`，点击首页 switch 时进入“服务类型设置”流程。
   - 若未勾选任何服务类型，不能开启。
   - 若勾选上门美甲，可直接开启。
   - 若勾选到店美甲：
     - 有可用店铺时，显示店铺列表供勾选确认。
     - 没有店铺时，在当前弹窗内展示最小建店表单：店铺名称、详细地址。
     - 建店成功后写回 `shopAddresses`，再完成服务类型保存并开启接单。

2. 已开启后再次编辑
   - 仍可通过首页 switch 关闭接单。
   - 服务类型与店铺能力的详细编辑仍在“店铺管理”页完成。

### 店铺管理

每个店铺新增两个管理能力：

1. `启用/关闭`
   - 关闭后，该店铺不出现在用户端到店预约可选列表中。

2. `营业时间`
   - 可编辑每周营业时间。
   - 支持某天停业。

### 用户端预约

当用户选择美甲师发起预约时：

1. 若美甲师 `status !== active`
   - 不允许创建预约。
   - 前端不展示可预约入口，后端提交时也拦截。

2. 服务类型展示规则
   - 只展示开启的服务类型。
   - `homeService = true` 才显示上门美甲。
   - `shopService = true` 且存在启用店铺时才显示到店美甲。

3. 到店预约规则
   - 只展示 `enabled === true` 的店铺。
   - 预约时间必须落在对应店铺当日营业时间内。
   - 若不在营业时间内，后端返回明确错误。

## 前端改造范围

### technician-frontend

需要修改：

- `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/contexts/authTypes.ts`
  - 扩展 `ShopAddress`
- `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/components/ServiceTypeSetupModal.tsx`
  - 支持首次开启接单时的最小建店
  - 支持显示可用店铺
- `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/HomePage.tsx`
  - 保持首页 switch 入口
  - 首次开启接单时串起服务类型/店铺流程
- `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/ShopManagement.tsx`
  - 增加店铺启用/关闭
  - 增加营业时间展示与入口
- `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/pages/ShopEdit.tsx`
  - 增加店铺启用状态与营业时间编辑
- `/Users/shibo/Documents/Codex/nailBook/technician-frontend/src/services/auth.ts`
  - 保持 `shopAddresses` 扩展字段的读写映射

### client-frontend

需要修改：

- 预约入口页面（当前设计详情预约页）按美甲师状态和店铺可用性过滤可预约选项
- 到店美甲时只展示启用店铺
- 提示文案明确说明“暂停接单”或“当前店铺不可预约”

## 后端改造范围

需要修改：

- `/Users/shibo/Documents/Codex/nailBook/backend/src/technician-auth/technician-auth.service.ts`
  - 首次登录默认 `inactive`
  - `updateServiceType` / `login` / `me` 保证新店铺字段读写
- `/Users/shibo/Documents/Codex/nailBook/backend/src/client-bookings/client-bookings.service.ts`
  - 校验 technician `status === active`
  - 校验店铺 `enabled`
  - 校验预约时间在营业时间内

## 错误处理

统一返回明确业务错误，不做模糊提示：

- `该美甲师当前未开启接单`
- `该美甲师暂未开启上门美甲服务`
- `该美甲师暂未开启到店美甲服务`
- `该店铺当前已关闭，暂不可预约`
- `预约时间不在店铺营业时间内`
- `请先创建至少一个店铺，再开启到店美甲`

## 验证标准

### 美甲师端

1. 首次登录后，首页接单开关默认为关闭。
2. 首次开启接单时，必须先完成服务类型设置。
3. 选择到店美甲但没有店铺时，可在当前流程创建店铺。
4. 创建成功后，店铺出现在“店铺管理”列表中。
5. 店铺管理可编辑营业时间与启用状态。

### 用户端

1. 暂停接单的美甲师不可预约。
2. 只显示美甲师已开启的服务类型。
3. 到店预约只显示已启用店铺。
4. 非营业时间内无法提交到店预约。

## 范围控制

本次只做最小闭环，不做以下扩展：

- 不新增独立店铺数据表
- 不做复杂节假日例外营业时间
- 不做多个接单状态来源的后台审批流
- 不做客户端复杂的日历禁用可视化，只做必要的可选项过滤和提交校验

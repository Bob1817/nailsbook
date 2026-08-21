# 上门/到店地址流程细化设计（在 booking-availability-address 基础上）

**日期：** 2026-06-04
**状态：** 已确认，待实现
**范围：** 主要 `client-frontend`；`backend` 同城校验微调。不动 `client-wxapp`、`mobile-flutter`。
**分支：** 续用 `feat/booking-availability-address`。

## 背景 / Bug
同城判定 `sameCity` 当前要求**省+市都匹配**。美甲师完善后 `province=浙江省/city=杭州市`，而客户新增的杭州地址 `province=null`，城市虽同却因省份为空被判跨城 → 置灰、无法提交。需求本意是「城市匹配」。

按服务类型分流（用户澄清）：
- **上门美甲**：客户地址须与美甲师**同城**，不同城则阻止创建。
- **到店美甲**：客户无需地址，仅需弹窗展示美甲师店铺地址供确认，确认后创建。

## 需求与设计

### 0. 同城判定改为按城市匹配（修 bug）
- `client-frontend/src/utils/sameCity.ts`：`sameCity(addr, tech)` 改为仅比较 `normCity(addr.city) === normCity(tech.city)`（`tech.city` 为空则不限制）。不再用省份否决。
- `backend/src/orders/client-orders.service.ts` 的 `assertSameCity`：同样改为 city-only（省份不再否决），作为安全网。

### 1. 上门 + 跨城 → 阻止 + 提示
- 选中跨城地址时，列表项置灰、不可选（已有）。
- 提交时若上门且最终地址跨城：弹「跨城美甲无法预约」，不创建。前端 `CreateOrder`、`BookingSheet` 提交前校验。

### 2. 上门 + 无地址 / 本地新增 → 内联结构化地址
- 内联表单：
  - **省、市锁定**为美甲师 `province`/`city`（只读展示）。
  - **区县**：内置数据下拉，数据来自新增 `client-frontend/src/data/cityDistricts.ts`（`CITY_DISTRICTS: Record<cityName, string[]>`，按城市名归一化查找）。
  - **街道村 / 道路小区等详细**：手填（合并进 `detailAddress`）。
- 校验：区县已选 + 详细已填 → 视为同城合法 → 可提交。
- 保存：`addressService.createAddress({ province, city, district, detailAddress, contactName, contactPhone })` 写入地址簿，用返回 id 下单。
- 组件：新增 `client-frontend/src/components/DistrictSelect.tsx`（输入城市，输出区县下拉）。

### 3. 到店 → 弹窗确认店铺地址
- 到店服务提交时，先弹确认弹窗，展示所选**美甲师店铺地址**（name + province/city/district/detailAddress）。
- 「确认预约」→ 创建；「取消」→ 关闭弹窗留在页面。
- 到店不需要客户地址（维持现状），弹窗仅为让用户明确前往地点。
- `CreateOrder`、`BookingSheet` 各加该确认弹窗（到店分支）。

## 数据集
- 用 `province-city-china`（生成期 devDep）生成 `cityDistricts.ts`（城市→区县名数组），生成后卸载依赖、提交静态文件，无运行时依赖。与技师端 `regions.ts` 同手法。

## 影响文件
- `client-frontend/src/utils/sameCity.ts`
- `client-frontend/src/data/cityDistricts.ts`（新增）
- `client-frontend/src/components/DistrictSelect.tsx`（新增）
- `client-frontend/src/components/BookingSheet.tsx`
- `client-frontend/src/pages/CreateOrder.tsx`
- `backend/src/orders/client-orders.service.ts`（assertSameCity city-only）

## 验证
- `backend`：`npm run build` + `npx jest client-orders.conflict`（同城用例改为 city-only 仍通过；必要时更新该用例期望）。
- `client-frontend`：`npm run build` + `npm run lint`。
- 手动冒烟：
  1. 上门选跨城(上海/北京)地址 → 置灰；强行提交弹「跨城美甲无法预约」。
  2. 上门无同城地址 → 内联：省市锁定杭州、区县下拉选「西湖区」、详细手填 → 可提交、地址入库。
  3. 同城地址(杭州，省份空)→ 现在可正常选择并提交（bug 修复）。
  4. 到店 → 提交弹店铺地址确认 → 确认后创建；取消则不创建。

## 不做
- 不引入街道级联数据（街道/详细手填）。
- 不改时间/冲突/技师端等其他已完成部分。

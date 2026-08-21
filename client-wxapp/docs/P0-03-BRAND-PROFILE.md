# P0-03 品牌主页数据模型

完成日期：2026-08-12

## 数据模型

新增：

- `BrandProfile`：品牌名称、定位、公开区域、介绍、审美理念、交通、专业保障、规则、分享配置和发布状态；
- `BrandEnvironmentPhoto`：环境照片、说明和顺序；
- `BrandFaq`：问题、回答、顺序和启用状态。

`BrandProfile.technicianId` 唯一并关联 `Technician`，删除美甲师时级联删除品牌资料。环境照片和 FAQ 由品牌资料拥有。

## 历史资料迁移

迁移 `20260812224000_add_brand_profiles` 从现有 `Technician` 回填：

- `name` → `brandName`；
- `city` → `city`；
- `serviceArea` → `publicServiceArea`；
- `bio` → `artistIntroduction`；
- active 美甲师保持 published，其他状态为 draft。

迁移 `20260812223000_reconcile_updated_at_defaults` 先修复 P0-01 发现的 `MarketingMaterial` 与 `SubscriptionResourceUsage` 默认值差异，使完整迁移链重新达到 schema 零差异。

## 接口

经营端：

- `GET /api/technician/brand-profile`
- `PUT /api/technician/brand-profile`

接口只使用 JWT 中的 `technicianId`，DTO 不接受 owner ID，避免跨美甲师写入。

公开端：

- `GET /api/public/brand-profiles/:technicianId`

公开响应采用显式字段白名单。旧 `public/artist` 接口继续兼容现有小程序，但已移除：

- 电话；
- 邀请码；
- 精确店铺地址；
- 完整工作日程；
- 任意社交媒体 JSON；
- 内部预约就绪问题；
- 数据库内部 ID 和状态字段。

## 小程序配置

主页经营页面现在可以维护：

- 品牌名称、头像和一句话定位；
- 城市、公开服务区域、个人介绍和审美理念；
- 环境照片、交通与停车说明；
- 卫生、材料和过敏提示；
- 迟到、取消和售后规则；
- FAQ；
- 分享标题、描述和封面；
- 草稿或公开发布状态。

## 测试结果

- 空库应用 52 个迁移：通过；
- Prisma schema diff：`No difference detected`；
- 外键检查：无异常；
- 完整性检查：`ok`；
- 模拟旧版历史数据库资料回填：通过；
- 后端构建：通过；
- 后端测试：64 个套件、266 项测试通过；
- 小程序静态检查：69 个页面、92 个 JavaScript 文件、80 个 JSON 文件；
- 信息架构、导航、转化和作品入口专项检查：通过。

## 回滚

SQLite 不执行逆向迁移。部署前必须停止写入并使用 `.backup` 创建完整数据库副本。失败时保留失败库用于排查，切回升级前数据库和上一版本应用。新增表只承载从旧字段复制或后续编辑的数据，旧 `Technician` 字段仍保留，便于版本回退。

## 后续边界

- 当前公开主页继续复用旧页面布局；P0-08 再完整展示环境、保障、规则和 FAQ；
- 服务项目仍来自旧 `serviceItems`，将在 P0-04 迁移为正式 Service；
- 生产部署前仍需在真实匿名化数据库副本上执行一次完整迁移和数量核对。

# 美甲记录与私密档案闭环测试报告

日期：2026-10-26
依据用例：[SERVICE-RECORD-ARCHIVE-TEST-CASES-2026-10-26.md](SERVICE-RECORD-ARCHIVE-TEST-CASES-2026-10-26.md)
执行环境：本地代码库（未提交改动）、本地 SQLite 测试库、生产只读契约检查（api.lunails.cn）

## 1. 总体结论

**通过（带保留项）**。文档第 8 节映射的全部自动化测试通过，关键隐私边界（PV-002/003/004/005）经自动化与静态代码双重验证无越权。停止条件均未触发。

保留项：依赖微信开发者工具双端交互、真机视觉与测试账号（T1/T2/C1）的用例尚未执行，见第 4 节清单。

## 2. 自动化执行结果

| # | 测试对象 | 结果 | 覆盖用例 |
| --- | --- | --- | --- |
| 1 | `scripts/test-service-record-archive-sync.js` | 通过 | CF-001~CF-009 门禁（候选生成、手动同步、失败重试、重新同步标记） |
| 2 | `scripts/test-service-record-autosave.js` | 通过 | SR-003/004/005/006/010 门禁（防抖、载荷边界、本机草稿、离页保存） |
| 3 | `scripts/test-booking-preparation-context.js` | 通过 | BK 系列门禁（服务前准备聚合与优先级） |
| 4 | `src/orders/service-record.spec.ts`（6 用例） | 通过 | SR-002 照片分阶段、SR-008 非法状态拒绝、草稿创建幂等、完成单不可再开录 |
| 5 | `src/orders/service-record-association.spec.ts` | 通过 | AS-002 缺原因阻止、AS-003 已同步后禁止换客户 |
| 6 | `src/technician-works/work-preparation-from-record.spec.ts` | 通过 | WF-004/DB-002/DB-003 同事务版本递增与修订快照 |
| 7 | `src/technician-works/public-brand.service.spec.ts`（补充执行，6 用例） | 通过 | PV-005 公开作品响应无 `preparation` 字段 |
| 8 | `test/production-deployment.contract-spec.ts`（生产只读） | 通过（4/4） | PV-002：健康检查 200；3 个受保护接口未登录 401 |

回归基线：小程序全量 112 个脚本测试，108 通过，4 个失败（`test-mvp-information-architecture`、`test-style-tags-management`、`test-tag-categories`、`test-work-entry`）均为本轮之前已存在的失败，与档案链路改动无关，未新增回归。

## 3. 静态代码验证结果

| 用例 | 验证点 | 证据 | 结论 |
| --- | --- | --- | --- |
| SR-003 | 800ms 防抖、合并并发保存 | `complete-service/index.js` `scheduleSave()` L468-481、`_pendingSave` 合并 | 通过 |
| SR-004 | 自动保存载荷不含档案参数 | `recordPayload()` L669-680 仅记录字段；`autoSave()` L499-506 载荷 = 记录字段 + 阶段照片，无 `profileFacts`/同步开关 | 通过 |
| SR-005 | 失败存本机、重试、成功清草稿 | L508-512：失败 `_persistLocalDraft()` + 提示"已存本机"；`retrySave()` L522-524；成功 `removeStorageSync` | 通过（逻辑层） |
| SR-006 | 离页强制保存 | `onHide`/`onUnload` → `flushSave()` L189-194、L483-489 | 通过 |
| SR-010 | 防重复提交 | `_saving` 守卫 + `_pendingSave` 队列合并，L493-496、L515-518 | 通过（逻辑层） |
| CF-007/008 | 记录保存与档案同步失败分离、仅重试档案 | `syncCustomerFacts()` L714-722：失败提示"美甲记录已保存，客户档案同步失败，可点击重试"，重试仅重发 `profileFacts` | 通过 |
| WF-007 | 作品同步失败不影响记录 | `finishSubmission()` L732-738 独立捕获，记录已保存提示保留 | 通过 |
| WF-004/DB-002/DB-003 | 版本与修订同事务、按来源递增 | `technician-works.service.ts` L740-767 单个 `$transaction` 内更新方案+写修订；同来源复同步不升版本 | 通过 |
| PV-003 | 档案按归属美甲师过滤 | orders.service 全链 `technicianId` 作用域 | 通过 |
| PV-004 | B 不可读 A 的作品方案 | `findOne()` `where: { id, techId: technicianId }` L80-82 | 通过 |
| PV-005 | 公开接口无私密字段 | public-brand spec 断言响应无 `preparation`，通过 | 通过 |

## 4. 待人工执行清单（需开发者工具 / 测试账号）

以下用例依赖真机交互、双账号或数据库直查，本轮无法自动执行：

| 分组 | 用例 | 所需条件 |
| --- | --- | --- |
| 流程 | SR-001/002/007/009、CF-004/006、BK-001~BK-005 | 微信开发者工具，美甲师 A + 客户 C1 双端登录 |
| 网络 | SR-005 真实断网/恢复、SR-006 真实切后台 | 开发者工具 Network 面板模拟 |
| 越权 | AS-004、PV-003/004 全链路复测 | 美甲师 B 测试账号登录态 |
| 隐私 | PV-001（客户侧响应体审查）、PV-006（日志审查） | 客户 C1 登录态 + 服务端日志访问 |
| 数据 | DB-001/DB-004/DB-005 | 本地或测试库 SQL 直查 |
| 视觉 | UI-001~UI-005 | 小屏 + iPhone 15 Pro Max 模拟器 |

## 5. 本轮缺陷与修复

| 编号 | 级别 | 描述 | 处理 |
| --- | --- | --- | --- |
| FIX-1 | 低 | 门禁 `test-technician-booking-card.js` 断言记录详情页含"服务总结"，与已实现结构（摘要指标 `record-metrics` + 分组明细 `record-groups`/「过程与反馈」）不一致，门禁误报失败 | 已修正断言字符串为 `record-groups` + `过程与反馈`，门禁恢复通过。页面实现未改动 |

## 6. 停止条件核查

- 客户档案/作品档案跨账号泄露：未发现
- 自动保存触发档案同步：未发现（SR-004 载荷隔离已验证）
- 同步失败导致记录丢失：未发现（CF-007/WF-007 失败路径均保留记录）
- 作品方案与版本修订不一致：未发现（同事务写入已验证）
- 生产数据创建/修改/删除：未发生（生产仅执行 GET 只读契约检查）

## 7. 通过标准评估（对照用例文档第 10 节）

- 所有 P0 用例通过：自动化与静态覆盖的 P0 全部通过；SR-001/002/007、CF-004、BK-001、AS-001、PV-001 等 P0 待人工确认
- 隐私隔离：自动化 + 静态双重验证无越权
- 自动保存/手动同步/独立重试边界：符合设计
- 版本与修订一致性、重复确认不产生重复事实：规格测试通过
- 页面遮挡/溢出/触控：待 UI-001~UI-005 人工执行后闭环

**结论：可进入开发者工具人工验收阶段；建议按第 4 节清单依次执行，重点先跑 PV-001 与 BK-001。**

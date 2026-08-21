# P0-02 MVP 信息架构收敛

完成日期：2026-08-12

## 经营端主导航

经营端统一为五个一级入口：

1. 今日：`/pages/technician/home/index`
2. 客户：`/pages/technician/customers/index`
3. 预约：`/pages/technician/orders/index`
4. 作品：`/pages/technician/works/index`
5. 我的经营：`/pages/technician/profile/index`

作品页已接入自定义底部导航；今日与预约页面标题同步调整。

## 入口合并

- 预约页保留“今日行程/当日预约”视图，移除跳往“全部行程”和“全部预约”的重复下拉入口；
- 经营数据中的订单明细入口统一回到预约页；
- 原设计需求入口在“我的经营”中改名为“预约意向”，复用现有数据和页面；
- 品牌主页、服务与价格、预约时间和预约意向集中到“我的经营”；
- 作品管理提升为一级导航，不再在“我的经营”重复展示。

## 隐藏能力

仅隐藏入口，不删除页面、接口和历史数据：

- AI 分享图；
- 点赞、收藏、评论等社区入口；
- 订阅套餐；
- 邀请基金和推荐好友；
- 宣传物料；
- 店铺管理；
- 多美甲师绑定申请入口；
- 美甲师端邀请码绑定卡片；
- 平台化工具入口。

现有客户端绑定关系仍保留，以免在公开预约改造完成前破坏已有客户登录和预约。旧页面也继续保留在 `app.json`，用于历史链接兼容；它们不属于当前 MVP 主导航。

## 验证

专项检查：

```bash
cd /Users/shibo/Documents/Codex/nailBook/client-wxapp
node scripts/test-mvp-information-architecture.js
```

专项检查验证：

- 经营端导航恰好五项；
- 五项名称和路由正确；
- 我的经营只展示当前阶段入口；
- 预约页不再跳往重复列表；
- 客户端主要入口不再显示 AI、点赞、收藏和推荐奖励。

同时执行：

```bash
node scripts/validate-miniprogram.js
node scripts/test-artist-navigation.js
node scripts/test-conversion-tracking.js
node scripts/test-work-entry.js
```

## 后续边界

- “主页与规则”当前复用主页经营页面；保障、取消、售后和 FAQ 的实际编辑字段由 P0-03 品牌模型批次补齐；
- “预约意向”当前复用设计需求页面；Lead 模型上线后再迁移到正式线索/预约意向模块；
- 旧深链页面暂不删除，待真实用户验证和数据迁移完成后再决定是否物理移除。

/**
 * 公众号消息自动回复规则。
 *
 * 规则按数组顺序匹配，**负向意图（取消/退款/投诉）排在正向之前**，
 * 避免"取消预约"被"预约"规则抢占。
 *
 * 注意：微信关键词回复无法直接下发小程序卡片，回复文案统一引导用户点击底部菜单。
 */

export interface KeywordRule {
  id: string;
  /** full = 与用户消息完全一致；contains = 消息中包含任一关键词即命中 */
  match: 'full' | 'contains';
  keywords: string[];
  reply: string;
}

const BOOKING_ENTRY = '点击底部菜单【立即预约】';

export const KEYWORD_RULES: KeywordRule[] = [
  {
    id: 'cancel',
    match: 'contains',
    keywords: ['取消', '退订', '不去了'],
    reply: `取消预约：进入【我的服务】→【我的预约】→ 打开订单 → 取消预约。
距服务开始 24 小时以上可免费取消；24 小时内取消会与美甲师协商。需要协助请直接回复"人工"。`,
  },
  {
    id: 'refund',
    match: 'contains',
    keywords: ['退款', '退钱', '退费'],
    reply: `退款会原路退回，微信支付一般 1–3 个工作日到账。
如订单已进入服务中，请回复"人工"说明情况，我们会在 24 小时内处理。`,
  },
  {
    id: 'complaint',
    match: 'contains',
    keywords: ['投诉', '不满意', '差评'],
    reply: `非常抱歉给你带来不好的体验。
请把订单号和具体情况发给我们，客服主管会在 24 小时内跟进处理，一定给你一个交代。`,
  },
  {
    id: 'reschedule',
    match: 'contains',
    keywords: ['改期', '改时间', '换时间', '延期'],
    reply: `改期：进入【我的服务】→【我的预约】→ 打开订单 → 申请改期，美甲师确认后自动生效。
距服务开始不足 24 小时的订单，建议回复"人工"由客服协助处理。`,
  },
  {
    id: 'price',
    match: 'contains',
    keywords: ['价格', '报价', '多少钱', '价目', '收费', '贵'],
    reply: `价格按服务项目与形式（上门/到店）区分：基础手部护理 88 元起，甲片延长 168 元起，款式设计按难度报价。
${BOOKING_ENTRY}，选择服务后即可看到实时价格。`,
  },
  {
    id: 'booking',
    match: 'contains',
    keywords: ['预约', '怎么约', '下单', '预定', 'booking'],
    reply: `${BOOKING_ENTRY}，选择美甲师与服务后可实时查看可约时段，几分钟即可完成下单。`,
  },
  {
    id: 'deposit',
    match: 'contains',
    keywords: ['定金', '订金', '押金'],
    reply: `部分上门服务需支付定金锁定时间，服务完成后可抵扣费用。
定金规则在订单确认页有明确说明，支付前可仔细查看。`,
  },
  {
    id: 'address',
    match: 'contains',
    keywords: ['地址', '门店', '位置', '在哪', '导航', '怎么去', '停车'],
    reply: `门店地址与营业时间可在【了解我们】→【门店与服务】查看，支持一键导航；门店同时提供到店与上门服务。
具体到店路线也可以回复"人工"由客服发给你。`,
  },
  {
    id: 'home_service',
    match: 'contains',
    keywords: ['上门', '到家', '家里做'],
    reply: `支持上门服务。下单时选择"上门服务"并填写地址，美甲师会按约定时间到家；上门范围与时长以订单页展示为准。`,
  },
  {
    id: 'opening_hours',
    match: 'contains',
    keywords: ['营业时间', '几点', '什么时候', '休息'],
    reply: `客服在线时间 10:00–21:00；门店营业时间同为 10:00–21:00，节假日以公众号公告为准。`,
  },
  {
    id: 'human_service',
    match: 'contains',
    keywords: ['人工', '客服', '在线吗', '在吗', '你好', 'hi', 'hello'],
    reply: `你好，人工客服在线时间 10:00–21:00。
你可以直接在对话框描述问题，客服看到会立即回复；价格、预约、地址等问题也可以直接回复关键词秒回。`,
  },
  {
    id: 'phone',
    match: 'contains',
    keywords: ['电话', '手机号', '联系方式', '微信'],
    reply: `客服联系方式：请在【我的服务】→【联系客服】留言，我们会尽快回复。
为避免信息遗漏，建议优先在公众号内沟通，这样你的预约记录和沟通记录都在同一处。`,
  },
  {
    id: 'invoice',
    match: 'contains',
    keywords: ['发票', '开票', '报销'],
    reply: `支持开具电子发票。请把订单号与开票信息（单位名称、税号、邮箱）发给我们，1–2 个工作日内发送到你的邮箱。`,
  },
  {
    id: 'promotion',
    match: 'contains',
    keywords: ['优惠', '活动', '折扣', '便宜', '券', '代金券'],
    reply: `最新活动会第一时间在公众号推送，优惠券可在【我的服务】→【我的预约】→ 优惠券中查看使用，即将过期的券我们会提前提醒你。`,
  },
  {
    id: 'member',
    match: 'contains',
    keywords: ['会员', '充值', '储值'],
    reply: `会员储值功能在逐步开放中，可在小程序内【我的】页面查看；储值后可享专属折扣与优先预约。`,
  },
  {
    id: 'works',
    match: 'contains',
    keywords: ['作品', '案例', '款式', '样式', '效果图'],
    reply: `作品精选请点【了解我们】→【作品精选】，可按风格筛选；看到喜欢的款式可在作品页直接预约同款。`,
  },
  {
    id: 'artist',
    match: 'contains',
    keywords: ['美甲师', '技师', '师傅', '谁做'],
    reply: `我们的美甲师都经过实名认证与作品审核。【了解我们】→【发现美甲师】可查看主页与作品，选定后可长期预约同一位。`,
  },
  {
    id: 'durability',
    match: 'contains',
    keywords: ['保持', '掉色', '脱落', '会不会掉'],
    reply: `常规甲油胶可保持 3–4 周，甲片延长约 4–6 周。日常注意避免长时间热水浸泡与硬物碰撞。
如有非人为脱落，7 天内可联系美甲师处理。`,
  },
  {
    id: 'allergy',
    match: 'contains',
    keywords: ['过敏', '敏感', '皮肤'],
    reply: `我们使用正规品牌产品并执行消毒流程。如你有过敏史或皮肤敏感，请在下单备注或提前告知美甲师，会为你调整产品与流程。`,
  },
  {
    id: 'recruit',
    match: 'contains',
    keywords: ['招募', '招聘', '入驻', '我想做美甲师'],
    reply: `美甲师入驻请在【了解我们】→【美甲师招募】填写资料，通过审核后即可接单。期待与你合作。`,
  },
  {
    id: 'cooperation',
    match: 'contains',
    keywords: ['加盟', '合作', '渠道', '代理', '商务'],
    reply: `商务合作请回复"合作 + 你的城市 + 联系方式"，商务同事会在 1–2 个工作日内联系你。`,
  },
  {
    id: 'feedback',
    match: 'contains',
    keywords: ['建议', '反馈', '意见'],
    reply: `感谢你的反馈。可直接回复内容，或在小程序【意见反馈】提交，我们会逐条查看并跟进。`,
  },
  {
    id: 'faq',
    match: 'contains',
    keywords: ['常见问题', 'faq', '帮助'],
    reply: `常见问题：改期/取消 → 回复"改期""取消"；退款 → 回复"退款"；上门范围 → 回复"上门"；发票 → 回复"发票"。`,
  },
  {
    id: 'thanks',
    match: 'full',
    keywords: ['谢谢', '感谢', '好的', '哦', '嗯'],
    reply: `不客气，期待与你的下一次见面。有需要随时找我们。`,
  },
];

export const DEFAULT_WELCOME_REPLY = `欢迎来到 NailBook。

你可以：
1. 点击左下角【立即预约】直接下单
2. 在【我的服务】里查看预约进度、联系客服
3. 回复"价格"查看价目，"地址"查看门店信息

回复"人工"可联系客服，在线时间 10:00–21:00。`;

export const DEFAULT_FALLBACK_REPLY = `收到，暂时没能自动回答你的问题。
你可以回复：价格 / 预约 / 地址 / 改期 / 退款 / 人工
或点击底部菜单【我的服务】→【联系客服】，人工在线 10:00–21:00。`;

/**
 * 匹配关键词规则。负向规则已在数组前部，直接按序返回首个命中项。
 */
export function matchKeywordRule(content: string): KeywordRule | null {
  const text = content.trim().toLowerCase();
  if (!text) {
    return null;
  }
  for (const rule of KEYWORD_RULES) {
    for (const keyword of rule.keywords) {
      const target = keyword.toLowerCase();
      if (rule.match === 'full' ? text === target : text.includes(target)) {
        return rule;
      }
    }
  }
  return null;
}

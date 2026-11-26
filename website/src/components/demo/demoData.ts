export type ScenarioId = 'quote' | 'booking' | 'storefront'
export type ActiveDevice = 'client' | 'artist'

export interface ScreenHotspot {
  /** Percentage coordinates relative to the real screenshot container */
  leftPct: number
  topPct: number
  widthPct: number
  heightPct: number
  labelZh: string
  labelEn: string
  /** Optional tooltip placement */
  tooltipPos?: 'top' | 'bottom'
}

export interface ScreenFrame {
  src: string
  altZh: string
  altEn: string
  captionZh: string
  captionEn: string
  /** True when the source PNG already includes an iOS bezel & Dynamic Island */
  hasBakedFrame?: boolean
}

export interface DemoStepConfig {
  actor: ActiveDevice
  titleZh: string
  titleEn: string
  hintZh: string
  hintEn: string
  valueZh: string
  valueEn: string
  clientScreen: ScreenFrame
  artistScreen: ScreenFrame
  hotspot: ScreenHotspot
}

export interface ScenarioMeta {
  id: ScenarioId
  badgeZh: string
  badgeEn: string
  titleZh: string
  titleEn: string
  subtitleZh: string
  subtitleEn: string
  doneClientScreen: ScreenFrame
  doneArtistScreen: ScreenFrame
  doneSummaryZh: string
  doneSummaryEn: string
  steps: DemoStepConfig[]
}

const SCREENS = {
  workDetail: {
    src: '/images/campaign-cases/case-work-detail.webp',
    altZh: '顾客端真实作品详情页（烟岚流银水墨大理石 ¥298）',
    altEn: 'Real client work detail screen (¥298 Ink Marble)',
    captionZh: '顾客端 · 原创作品详情与明码参考价',
    captionEn: 'Client · Work Detail & Clear Pricing',
  },
  bookingConfirm: {
    src: '/images/campaign-cases/case-booking-confirm.webp',
    altZh: '顾客端真实预约时段选择与确认弹窗',
    altEn: 'Real client booking slot & confirmation modal',
    captionZh: '顾客端 · 自助选时段并确认预约',
    captionEn: 'Client · Self-Serve Slot Confirmation',
  },
  clientHome: {
    src: '/preview-client.png',
    altZh: '顾客端真实首页与我的预约状态卡片',
    altEn: 'Real client home screen with booking status card',
    captionZh: '顾客端 · 我的预约实时进度',
    captionEn: 'Client · Live Booking Status',
    hasBakedFrame: true,
  },
  artistHome: {
    src: '/images/campaign-cases/case-artist-home.webp',
    altZh: '顾客端真实美甲师个人主页（听栖美甲工作室·贝贝）',
    altEn: 'Real artist personal storefront (Beibei · Tingqi Studio)',
    captionZh: '顾客端 · 美甲师专属个人主页',
    captionEn: 'Client · Private Artist Storefront',
  },
  shopHome: {
    src: '/images/campaign-cases/case-shop-home.webp',
    altZh: '顾客端真实工作室环境与地图导航页',
    altEn: 'Real studio details & map navigation screen',
    captionZh: '顾客端 · 工作室环境与精准到店指引',
    captionEn: 'Client · Studio Info & Map Directions',
  },
  techWorkbench: {
    src: '/preview-technician.png',
    altZh: '美甲师端真实工作台首页与下一单待报价卡片',
    altEn: 'Real artist workbench home with pending quote card',
    captionZh: '美甲师端 · 经营看板与下一单待报价',
    captionEn: 'Artist · Workbench & Pending Quote',
    hasBakedFrame: true,
  },
  quickQuote: {
    src: '/images/campaign-cases/case-quick-quote.jpg',
    altZh: '美甲师端真实快捷报价单预览（¥406.00）',
    altEn: 'Real itemized quote card preview (¥406.00)',
    captionZh: '美甲师端 · 专属美甲报价单预览',
    captionEn: 'Artist · Itemized Quote Card Preview',
  },
  scheduleCalendar: {
    src: '/images/campaign-cases/case-schedule-calendar.webp',
    altZh: '美甲师端真实行程日历与月度收入统计',
    altEn: 'Real artist schedule calendar & monthly revenue',
    captionZh: '美甲师端 · 行程排期与月度实收日历',
    captionEn: 'Artist · Schedule & Revenue Calendar',
  },
  customerCrm: {
    src: '/images/campaign-cases/case-customer-crm.webp',
    altZh: '美甲师端真实客户档案与复购提醒列表',
    altEn: 'Real artist CRM & retention alert list',
    captionZh: '美甲师端 · 老客标签与智能复购提醒',
    captionEn: 'Artist · Client Tags & Retention CRM',
  },
  serviceList: {
    src: '/images/campaign-cases/case-service-list.webp',
    altZh: '美甲师端真实服务项目管理与定金配置',
    altEn: 'Real artist service menu & deposit settings',
    captionZh: '美甲师端 · 服务价目、工时与定金配置',
    captionEn: 'Artist · Service Menu & Deposit Setup',
  },
} satisfies Record<string, ScreenFrame>

export const SCENARIOS: ScenarioMeta[] = [
  {
    id: 'quote',
    badgeZh: '剧本 01',
    badgeEn: 'Flow 01',
    titleZh: '作品引流与快捷报价',
    titleEn: 'Portfolio to Quick Quote',
    subtitleZh: '从顾客看中款式到收到正式报价单，全程 3 步',
    subtitleEn: 'From picking a look to itemized quote in 3 taps',
    doneClientScreen: SCREENS.clientHome,
    doneArtistScreen: SCREENS.quickQuote,
    doneSummaryZh:
      '顾客看到清晰的项目明细、时长与定金规则，直接告别微信反复问价和临时加价尴尬。',
    doneSummaryEn:
      'Clients receive clear itemized pricing and duration—ending back-and-forth chat haggling.',
    steps: [
      {
        actor: 'client',
        titleZh: '顾客看中原创款式发起预约',
        titleEn: 'Client picks an original look',
        hintZh: '点击左侧真实界面底部的「预约同款」按钮',
        hintEn: 'Tap "预约同款" at the bottom of the Client screen',
        valueZh: '作品自带参考价与预计用时，先过滤预算不符的询价，沟通直接进入正题。',
        valueEn: 'Reference price & duration upfront filter out mismatched inquiries.',
        clientScreen: SCREENS.workDetail,
        artistScreen: SCREENS.techWorkbench,
        hotspot: {
          leftPct: 40,
          topPct: 90.5,
          widthPct: 57,
          heightPct: 7.5,
          labelZh: '点击「预约同款」',
          labelEn: 'Tap "Book Look"',
          tooltipPos: 'top',
        },
      },
      {
        actor: 'artist',
        titleZh: '美甲师工作台秒级响应待报价',
        titleEn: 'Artist responds from workbench',
        hintZh: '点击右侧真实工作台「下一单」卡片的「立即报价」按钮',
        hintEn: 'Tap "立即报价" on the Artist workbench screen',
        valueZh: '工作台首页置顶显示待报价预约与倒计时，不用在微信聊天列表里翻消息。',
        valueEn: 'Pending quotes stay pinned on your workbench—zero lost chat messages.',
        clientScreen: SCREENS.clientHome,
        artistScreen: SCREENS.techWorkbench,
        hotspot: {
          leftPct: 62,
          topPct: 74.5,
          widthPct: 31,
          heightPct: 7.5,
          labelZh: '点击「立即报价」',
          labelEn: 'Tap "Quote Now"',
          tooltipPos: 'top',
        },
      },
      {
        actor: 'artist',
        titleZh: '生成高质感报价单并一键分享',
        titleEn: 'Share itemized quote card',
        hintZh: '点击右侧真实报价单底部的「确认并分享」完成发送',
        hintEn: 'Tap "确认并分享" at the bottom right of the quote card',
        valueZh: '系统自动汇总服务项、总价与预计时长，对外呈现高级、克制的专属美甲方案。',
        valueEn: 'Auto-generates a refined, itemized quote card ready to share in WeChat.',
        clientScreen: SCREENS.clientHome,
        artistScreen: SCREENS.quickQuote,
        hotspot: {
          leftPct: 65,
          topPct: 88,
          widthPct: 31,
          heightPct: 7.5,
          labelZh: '点击「确认并分享」',
          labelEn: 'Tap "Confirm & Share"',
          tooltipPos: 'top',
        },
      },
    ],
  },
  {
    id: 'booking',
    badgeZh: '剧本 02',
    badgeEn: 'Flow 02',
    titleZh: '自助约档期与老客 CRM',
    titleEn: 'Self-Booking & Client CRM',
    subtitleZh: '顾客自助锁档期，排期收入与复购标签自动沉淀',
    subtitleEn: 'Self-serve booking synced with calendar & retention CRM',
    doneClientScreen: SCREENS.clientHome,
    doneArtistScreen: SCREENS.customerCrm,
    doneSummaryZh:
      '每一次预约都自动沉淀为你的个人客户资产：累计消费、性格标签与预计复购日一目了然。',
    doneSummaryEn:
      'Every booking enriches your private CRM with spend history, tags, and next-visit alerts.',
    steps: [
      {
        actor: 'client',
        titleZh: '顾客核对档期并提交预约',
        titleEn: 'Client confirms slot & submits',
        hintZh: '点击左侧真实预约弹窗底部的「提交申请」按钮',
        hintEn: 'Tap "提交申请" on the Client booking modal',
        valueZh: '已约满日期自动置灰，顾客自助选好空闲时段，告别来回核对排期。',
        valueEn: 'Booked days gray out automatically—no scheduling ping-pong.',
        clientScreen: SCREENS.bookingConfirm,
        artistScreen: SCREENS.scheduleCalendar,
        hotspot: {
          leftPct: 50,
          topPct: 87.5,
          widthPct: 47,
          heightPct: 7.5,
          labelZh: '点击「提交申请」',
          labelEn: 'Tap "Submit"',
          tooltipPos: 'top',
        },
      },
      {
        actor: 'artist',
        titleZh: '行程日历与月度实收自动同步',
        titleEn: 'Calendar & revenue sync live',
        hintZh: '点击右侧真实行程日历中的高亮排期（16日），查看对应老客档案',
        hintEn: 'Tap the highlighted date on the Artist calendar to view CRM',
        valueZh: '每日实收、预估收入与月度趋势自动汇总，独立美甲师不再手写记账。',
        valueEn: 'Daily & monthly revenue totals update automatically with zero manual bookkeeping.',
        clientScreen: SCREENS.clientHome,
        artistScreen: SCREENS.scheduleCalendar,
        hotspot: {
          leftPct: 17,
          topPct: 70.5,
          widthPct: 16,
          heightPct: 8.5,
          labelZh: '查看排期与客群',
          labelEn: 'Inspect Schedule',
          tooltipPos: 'top',
        },
      },
      {
        actor: 'artist',
        titleZh: '自动触发老客标签与复购提醒',
        titleEn: 'Surface client tags & retention',
        hintZh: '点击右侧真实 CRM 中「待复购」客户卡片（方人也 · 细节控/追求完美）完成演练',
        hintEn: 'Tap the "待复购" client card to finish the walkthrough',
        valueZh: '系统按服务周期自动提醒主动跟进老客，并直观展示“细节控/追求完美”等偏好标签。',
        valueEn: 'Smart retention prompts surface due clients alongside their exact style tags.',
        clientScreen: SCREENS.clientHome,
        artistScreen: SCREENS.customerCrm,
        hotspot: {
          leftPct: 6,
          topPct: 37,
          widthPct: 88,
          heightPct: 24,
          labelZh: '点击查看复购提醒',
          labelEn: 'Review Retention Alert',
          tooltipPos: 'top',
        },
      },
    ],
  },
  {
    id: 'storefront',
    badgeZh: '剧本 03',
    badgeEn: 'Flow 03',
    titleZh: '专属个人主页与透明价目',
    titleEn: 'Private Storefront & Pricing',
    subtitleZh: '用独立高级名片替代朋友圈，自主配置服务与定金',
    subtitleEn: 'Replace messy feeds with a private storefront & clear rules',
    doneClientScreen: SCREENS.shopHome,
    doneArtistScreen: SCREENS.serviceList,
    doneSummaryZh:
      '对外是干净无竞品的个人品牌主页，对内可随时调整价目、预计工时与定金，客户 100% 归属你本人。',
    doneSummaryEn:
      'A private brand storefront externally, full pricing & deposit control internally.',
    steps: [
      {
        actor: 'client',
        titleZh: '顾客打开你的专属美甲师主页',
        titleEn: 'Client visits your personal page',
        hintZh: '点击左侧真实美甲师主页底部的「查看客户预约入口」',
        hintEn: 'Tap "查看客户预约入口" at the bottom of the Client screen',
        valueZh: '集中展示个人简介、专业履历与工作室实景，第一眼就建立中高端信任感。',
        valueEn: 'Showcase credentials and real studio photos to build instant trust.',
        clientScreen: SCREENS.artistHome,
        artistScreen: SCREENS.serviceList,
        hotspot: {
          leftPct: 46,
          topPct: 90.5,
          widthPct: 51,
          heightPct: 7.5,
          labelZh: '点击「查看客户预约入口」',
          labelEn: 'Tap "Booking Entry"',
          tooltipPos: 'top',
        },
      },
      {
        actor: 'client',
        titleZh: '查看工作室营业时间与地图导航',
        titleEn: 'View hours & map directions',
        hintZh: '点击左侧真实店铺页底部的「分享店铺」按钮，体验私域转发',
        hintEn: 'Tap "分享店铺" at the bottom right of the studio screen',
        valueZh: '到店定位、营业时间与到店指引一页看清，减少反复发定位的沟通成本。',
        valueEn: 'Built-in map directions and studio hours cut repetitive location texts.',
        clientScreen: SCREENS.shopHome,
        artistScreen: SCREENS.serviceList,
        hotspot: {
          leftPct: 50,
          topPct: 88.5,
          widthPct: 47,
          heightPct: 7.5,
          labelZh: '点击「分享店铺」',
          labelEn: 'Tap "Share Studio"',
          tooltipPos: 'top',
        },
      },
      {
        actor: 'artist',
        titleZh: '美甲师端自主管理服务与定金',
        titleEn: 'Manage service menu & deposits',
        hintZh: '点击右侧真实服务管理中的「简单款设计 ¥238」卡片完成演练',
        hintEn: 'Tap the "简单款设计 ¥238" service card on the Artist screen',
        valueZh: '随时上下架服务项、设置预计工时与定金金额，顾客端主页实时同步生效。',
        valueEn: 'Update prices, durations, and deposits anytime—instantly reflected for clients.',
        clientScreen: SCREENS.shopHome,
        artistScreen: SCREENS.serviceList,
        hotspot: {
          leftPct: 6,
          topPct: 42,
          widthPct: 88,
          heightPct: 26,
          labelZh: '点击查看服务配置',
          labelEn: 'Inspect Service Item',
          tooltipPos: 'top',
        },
      },
    ],
  },
]

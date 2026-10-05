const ROLE_CLIENT = 'client';
const ROLE_TECHNICIAN = 'technician';

const ONBOARDING_PLANS = {
  [ROLE_CLIENT]: {
    roleLabel: '客户',
    navigationTitle: '客户使用引导',
    finishLabel: '开始使用',
    destination: '/pages/client/home/index',
    steps: [
      {
        eyebrow: '先找到喜欢的灵感',
        title: '发现心仪款式',
        description: '浏览美甲师作品与服务信息，收藏喜欢的设计，再决定预约。',
        icon: '/static/icons/search.svg',
        points: ['查看作品和服务详情', '进入美甲师主页了解风格', '收藏灵感，预约时更好沟通']
      },
      {
        eyebrow: '把想法变成确定行程',
        title: '完成一次预约',
        description: '选择服务、日期和时间，确认门店与需求后提交预约。',
        icon: '/static/icons/booking-calendar.svg',
        points: ['先选服务，再选可预约时间', '填写需求与参考图片', '提交前核对门店和价格']
      },
      {
        eyebrow: '后续安排都在这里',
        title: '随时管理行程',
        description: '在订单和消息中查看进度，与美甲师确认细节，服务后留下评价。',
        icon: '/static/icons/tab-chat.svg',
        points: ['订单中查看预约状态', '消息中沟通改期与需求', '个人中心管理收藏和资料']
      }
    ]
  },
  [ROLE_TECHNICIAN]: {
    roleLabel: '美甲师',
    navigationTitle: '美甲师使用引导',
    finishLabel: '进入工作台',
    destination: '/pages/technician/home/index',
    steps: [
      {
        eyebrow: '先让客户认识你',
        title: '完善接单资料',
        description: '补充头像、简介、门店与服务项目，让客户快速了解你的专业信息。',
        icon: '/static/icons/profile-edit.svg',
        points: ['完善个人与门店资料', '设置服务项目和参考价格', '发布代表作品展示风格']
      },
      {
        eyebrow: '把可接单时间安排清楚',
        title: '设置可预约时间',
        description: '维护营业时间与不可约时段，减少来回确认和时间冲突。',
        icon: '/static/icons/calendar.svg',
        points: ['设置每周营业时间', '标记休息和临时占用', '及时处理待确认预约']
      },
      {
        eyebrow: '从第一位客户开始经营',
        title: '开始经营客户',
        description: '分享邀请码，管理预约、客户档案与作品，形成稳定的服务记录。',
        icon: '/static/icons/tab-customers.svg',
        points: ['分享邀请码邀请客户', '在工作台处理预约事项', '维护客户档案和服务记录']
      }
    ]
  }
};

function normalizeOnboardingRole(role) {
  return role === ROLE_TECHNICIAN ? ROLE_TECHNICIAN : ROLE_CLIENT;
}

function getOnboardingPlan(role) {
  return ONBOARDING_PLANS[normalizeOnboardingRole(role)];
}

function getOnboardingCompletionKey(role) {
  return `first_use_onboarding_v2_${normalizeOnboardingRole(role)}`;
}

module.exports = {
  ONBOARDING_PLANS,
  normalizeOnboardingRole,
  getOnboardingPlan,
  getOnboardingCompletionKey
};

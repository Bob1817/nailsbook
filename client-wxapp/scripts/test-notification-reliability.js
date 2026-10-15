const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const subscriptionSource = fs.readFileSync(path.join(root, 'utils/wechat-subscription.js'), 'utf8');
const orderDetailJs = fs.readFileSync(path.join(root, 'pages/technician/order-detail/index.js'), 'utf8');
const orderDetailWxml = fs.readFileSync(path.join(root, 'pages/technician/order-detail/index.wxml'), 'utf8');
const homeJs = fs.readFileSync(path.join(root, 'pages/technician/home/index.js'), 'utf8');
const homeWxml = fs.readFileSync(path.join(root, 'pages/technician/home/index.wxml'), 'utf8');
const clientOrdersJs = fs.readFileSync(path.join(root, 'pages/client/orders/index.js'), 'utf8');
const clientOrdersWxml = fs.readFileSync(path.join(root, 'pages/client/orders/index.wxml'), 'utf8');
const clientChatJs = fs.readFileSync(path.join(root, 'pages/client/chat-detail/index.js'), 'utf8');
const clientChatWxml = fs.readFileSync(path.join(root, 'pages/client/chat-detail/index.wxml'), 'utf8');
const technicianChatJs = fs.readFileSync(path.join(root, 'pages/technician/chat-detail/index.js'), 'utf8');
const technicianChatWxml = fs.readFileSync(path.join(root, 'pages/technician/chat-detail/index.wxml'), 'utf8');
const clientHomeJs = fs.readFileSync(path.join(root, 'pages/client/home/index.js'), 'utf8');
const clientHomeWxml = fs.readFileSync(path.join(root, 'pages/client/home/index.wxml'), 'utf8');

const storage = {};
const launchConfig = {};
const requested = [];
const recorded = [];
let launchConfigLoads = 0;
const fakeApp = {
  globalData: { launchConfig },
  loadLaunchConfig: async () => {
    launchConfigLoads += 1;
    Object.assign(launchConfig, {
      bookingClientSuccessTemplateId: 'client-success-template',
      bookingClientStatusTemplateId: 'client-status-template',
      bookingDayBeforeTemplateId: 'day-template',
      bookingHourBeforeTemplateId: 'hour-template',
      consultationReplyTemplateId: 'consultation-template'
    });
    return launchConfig;
  }
};
const wx = {
  getStorageSync: (key) => storage[key],
  setStorageSync: (key, value) => { storage[key] = value; },
  requestSubscribeMessage: ({ tmplIds, success }) => {
    requested.push(tmplIds);
    success({ [tmplIds[0]]: 'accept' });
  }
};
const moduleValue = { exports: {} };
vm.runInNewContext(subscriptionSource, {
  module: moduleValue,
  exports: moduleValue.exports,
  getApp: () => fakeApp,
  wx,
  require: (name) => {
    if (name === '../config') return {};
    if (name === '../services/api') {
      return {
        technician: {
          wechatSubscriptions: {
            record: async (decisions) => recorded.push(decisions)
          }
        },
        client: { wechatSubscriptions: { record: async () => {} } }
      };
    }
    throw new Error(`Unexpected dependency: ${name}`);
  }
});

(async () => {
  const preparedClientStatus = await moduleValue.exports.prepareBookingReminderStatus('client', {
    status: 'needs_enable',
    configuredTemplates: 3
  });
  assert.strictEqual(launchConfigLoads, 1, '状态接口未返回模板时必须等待启动配置完成');
  assert.strictEqual(
    preparedClientStatus.templates.bookingStatus,
    'client-status-template',
    '客户端必须在按钮展示前取得报价和状态变更模板'
  );

  const templates = {
    bookingEvent: 'new-template',
    bookingStatus: 'status-template',
    dayBefore: 'day-template',
    hourBefore: 'hour-template',
    consultationReply: 'consultation-template'
  };
  await moduleValue.exports.requestBookingReminder('technician', templates);
  await moduleValue.exports.requestBookingReminder('technician', templates);
  await moduleValue.exports.requestBookingReminder('technician', templates);
  await moduleValue.exports.requestBookingReminder('technician', templates);
  await moduleValue.exports.requestBookingReminder('client', {
    ...templates,
    bookingEvent: 'client-success-template',
    bookingStatus: 'client-status-template'
  });
  launchConfig.consultationReplyTemplateId = 'consultation-template';
  await moduleValue.exports.requestConsultationReply('technician');

  assert.deepStrictEqual(
    requested.map((ids) => Array.from(ids)),
    [
      ['new-template', 'consultation-template'],
      ['status-template', 'consultation-template'],
      ['day-template', 'consultation-template'],
      ['hour-template', 'consultation-template'],
      ['client-status-template', 'consultation-template'],
      ['consultation-template']
    ],
    '同名预约模板必须轮换申请，咨询回复模板可随自然操作或聊天入口申请'
  );
  assert.strictEqual(recorded.length, 5, '每次微信授权结果都必须回传后端');
  assert.strictEqual(storage.wechat_subscription_rotation_technician, 0, '完成一轮后应回到首个模板');

  assert.strictEqual(
    moduleValue.exports.isSubscriptionCategoryMissing({
      status: 'needs_top_up',
      templates,
      templateStatuses: {
        bookingEvent: { enabled: true },
        bookingStatus: { enabled: true },
        dayBefore: { enabled: true },
        hourBefore: { enabled: true },
        consultationReply: { enabled: false }
      }
    }, ['bookingEvent', 'bookingStatus', 'dayBefore', 'hourBefore']),
    false,
    '预约提醒均已授权时，不能因咨询模板缺失继续显示预约入口'
  );
  assert.strictEqual(
    moduleValue.exports.isSubscriptionCategoryUnavailable({
      status: 'needs_top_up',
      templates,
      templateStatuses: {
        bookingEvent: { enabled: true },
        bookingStatus: { enabled: false },
        dayBefore: { enabled: false },
        hourBefore: { enabled: false }
      }
    }, ['bookingEvent', 'bookingStatus', 'dayBefore', 'hourBefore']),
    false,
    '任一预约提醒可用后，首页补充提醒引导必须隐藏'
  );
  assert.strictEqual(
    moduleValue.exports.isSubscriptionCategoryUnavailable({
      status: 'needs_enable',
      templates,
      templateStatuses: {
        bookingEvent: { enabled: false },
        bookingStatus: { enabled: false },
        dayBefore: { enabled: false },
        hourBefore: { enabled: false }
      }
    }, ['bookingEvent', 'bookingStatus', 'dayBefore', 'hourBefore']),
    true,
    '所有预约提醒均不可用时，首页必须提示开启提醒'
  );
  assert.strictEqual(
    moduleValue.exports.claimFirstSubscriptionPrompt('client', { id: 8 }),
    true,
    '同一账号首次进入应展示一次订阅引导'
  );
  assert.strictEqual(
    moduleValue.exports.claimFirstSubscriptionPrompt('client', { id: 8 }),
    false,
    '同一账号后续登录不应重复展示首次引导'
  );

  assert(homeWxml.includes('bindtap="enableBookingReminders"'), '首页必须提供明确点击的提醒授权入口');
  assert(homeJs.includes('api.technician.wechatSubscriptions.status()'), '首页必须读取真实可用授权状态');
  assert(homeJs.includes('this.data.reminderStatus || {}'), '美甲师提醒入口必须使用状态接口返回的权威模板配置');
  assert(homeJs.includes('prepareBookingReminderStatus'), '美甲师提醒入口必须等待模板配置准备完成');
  assert(homeJs.includes('isSubscriptionCategoryUnavailable'), '美甲师首页仅应在没有可用预约提醒时展示引导');
  assert(homeJs.includes("technician_daily_summary_seen"), '首页必须提供每日首次待办摘要');

  assert(clientOrdersWxml.includes('bindtap="enableBookingReminders"'), '客户端预约页必须提供明确点击的提醒授权入口');
  assert(clientOrdersJs.includes('api.client.wechatSubscriptions.status()'), '客户端预约页必须读取真实可用授权状态');
  assert(clientOrdersJs.includes('this.data.reminderStatus || {}'), '客户端提醒入口必须使用状态接口返回的权威模板配置');
  assert(clientOrdersJs.includes('prepareBookingReminderStatus'), '客户端提醒入口必须等待模板配置准备完成');

  assert(orderDetailWxml.includes('bindtap="addBookingToCalendar"'), '已确认预约详情必须提供加入系统日历入口');
  assert(orderDetailJs.includes('wx.addPhoneCalendar'), '日历入口必须调用微信系统日历能力');
  assert(orderDetailJs.includes("technician_calendar_syncs"), '日历同步必须记录时间指纹以提示重复或改期');
  assert(orderDetailJs.includes('alarmOffset: 2 * 60 * 60'), '系统日历应请求提前两小时提醒');

  assert(clientChatWxml.includes('bindtap="enableReplyReminder"'), '客户端聊天页必须提供回复提醒授权入口');
  assert(technicianChatWxml.includes('bindtap="enableReplyReminder"'), '美甲师聊天页必须提供回复提醒授权入口');
  assert(clientChatJs.includes("requestConsultationReply('client')"), '客户端聊天页必须请求咨询回复模板');
  assert(technicianChatJs.includes("requestConsultationReply('technician')"), '美甲师聊天页必须请求咨询回复模板');
  assert(clientChatJs.includes("['consultationReply']"), '客户端聊天页只应根据咨询回复模板决定是否展示入口');
  assert(technicianChatJs.includes("['consultationReply']"), '美甲师聊天页只应根据咨询回复模板决定是否展示入口');
  assert(clientHomeJs.includes("claimFirstSubscriptionPrompt('client'"), '客户端首次进入必须触发一次性订阅引导');
  assert(homeJs.includes("claimFirstSubscriptionPrompt('technician'"), '美甲师首次进入必须触发一次性订阅引导');
  assert(clientHomeWxml.includes('<subscription-onboarding'), '客户端首页必须挂载首次订阅引导');
  assert(homeWxml.includes('<subscription-onboarding'), '美甲师首页必须挂载首次订阅引导');

  console.log('订阅模板轮换、提醒状态、每日摘要和系统日历检查通过');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

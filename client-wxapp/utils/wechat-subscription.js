const config = require('../config');
const api = require('../services/api');

function getLaunchConfig() {
  const app = getApp();
  return app.globalData.launchConfig || wx.getStorageSync('launch_config') || {};
}

function getConsultationTemplateId() {
  const remoteConfig = getLaunchConfig();
  return String(
    remoteConfig.consultationReplyTemplateId || config.consultationReplyTemplateId || ''
  ).trim();
}

function resolveBookingTemplates(role, providedTemplates = {}) {
  const remoteConfig = getLaunchConfig();
  return {
    dayBeforeTemplateId: String(
      providedTemplates.dayBefore ||
      remoteConfig.bookingDayBeforeTemplateId ||
      remoteConfig.bookingReminderTemplateId ||
      config.bookingDayBeforeTemplateId ||
      config.bookingReminderTemplateId ||
      ''
    ).trim(),
    hourBeforeTemplateId: String(
      providedTemplates.hourBefore ||
      remoteConfig.bookingHourBeforeTemplateId ||
      config.bookingHourBeforeTemplateId ||
      ''
    ).trim(),
    eventTemplateId: String(
      providedTemplates.bookingEvent ||
      (role === 'technician'
        ? (remoteConfig.bookingTechnicianNewTemplateId || config.bookingTechnicianNewTemplateId || '')
        : (remoteConfig.bookingClientSuccessTemplateId || config.bookingClientSuccessTemplateId || ''))
    ).trim(),
    statusTemplateId: String(
      providedTemplates.bookingStatus ||
      (role === 'technician'
        ? (remoteConfig.bookingTechnicianStatusTemplateId || config.bookingTechnicianStatusTemplateId || '')
        : (remoteConfig.bookingClientStatusTemplateId || config.bookingClientStatusTemplateId || ''))
    ).trim(),
    consultationTemplateId: String(
      providedTemplates.consultationReply || getConsultationTemplateId()
    ).trim()
  };
}

function getBookingReminderResultState(result) {
  if (!result || result.skipped) return 'missing';
  if (result.error) return 'error';
  const decisions = Object.values(result);
  if (decisions.includes('accept')) return 'accepted';
  if (decisions.includes('ban')) return 'banned';
  return 'rejected';
}

async function prepareBookingReminderStatus(role, status) {
  if (!status) return null;
  const configured = status.templates || {};
  if (Object.values(configured).some(Boolean)) return status;

  const app = getApp();
  if (app && typeof app.loadLaunchConfig === 'function') {
    await app.loadLaunchConfig();
  }
  const resolved = resolveBookingTemplates(role);
  return {
    ...status,
    templates: {
      bookingEvent: resolved.eventTemplateId,
      bookingStatus: resolved.statusTemplateId,
      dayBefore: resolved.dayBeforeTemplateId,
      hourBefore: resolved.hourBeforeTemplateId,
      consultationReply: resolved.consultationTemplateId
    }
  };
}

async function requestBookingReminder(role, providedTemplates) {
  const {
    dayBeforeTemplateId,
    hourBeforeTemplateId,
    eventTemplateId,
    statusTemplateId,
    consultationTemplateId
  } = resolveBookingTemplates(role, providedTemplates);
  // 当前四个预约模板在微信后台的标题均为“预约提醒”。微信会过滤同一次
  // 请求中的同名模板，因此每次用户操作只申请一个，并在后续自然操作中轮换补充。
  const candidates = (role === 'client'
    ? [statusTemplateId, eventTemplateId, dayBeforeTemplateId, hourBeforeTemplateId]
    : [eventTemplateId, statusTemplateId, dayBeforeTemplateId, hourBeforeTemplateId])
    .filter((templateId, index, list) => templateId && list.indexOf(templateId) === index);
  const rotationKey = `wechat_subscription_rotation_${role}`;
  const rotation = Number(wx.getStorageSync(rotationKey) || 0);
  const appointmentTemplateIds = candidates.length
    ? [candidates[rotation % candidates.length]]
    : [];
  // “咨询回复通知”标题不同，可与一个预约模板在同一次明确点击中申请。
  const templateIds = appointmentTemplateIds.concat(
    consultationTemplateId && !appointmentTemplateIds.includes(consultationTemplateId)
      ? [consultationTemplateId]
      : []
  );
  if (!templateIds.length || typeof wx.requestSubscribeMessage !== 'function') {
    return { skipped: true };
  }
  try {
    const result = await new Promise((resolve, reject) => {
      wx.requestSubscribeMessage({
        tmplIds: templateIds,
        success: resolve,
        fail: reject
      });
    });
    const decisions = templateIds.reduce((values, templateId) => {
      values[templateId] = result[templateId] || 'reject';
      return values;
    }, {});
    const service = role === 'technician'
      ? api.technician.wechatSubscriptions
      : api.client.wechatSubscriptions;
    await service.record(decisions);
    if (candidates.length) {
      wx.setStorageSync(rotationKey, (rotation + 1) % candidates.length);
    }
    return decisions;
  } catch (error) {
    return { error: error && error.errMsg ? error.errMsg : 'request_failed' };
  }
}

function shouldShowConsultationReminder(role) {
  if (!getConsultationTemplateId() || typeof wx.requestSubscribeMessage !== 'function') {
    return false;
  }
  const lastPromptAt = Number(wx.getStorageSync(`wechat_consultation_prompt_${role}`) || 0);
  return !lastPromptAt || Date.now() - lastPromptAt >= 7 * 24 * 60 * 60 * 1000;
}

async function requestConsultationReply(role) {
  const templateId = getConsultationTemplateId();
  if (!templateId || typeof wx.requestSubscribeMessage !== 'function') {
    return { skipped: true };
  }
  try {
    const result = await new Promise((resolve, reject) => {
      wx.requestSubscribeMessage({
        tmplIds: [templateId],
        success: resolve,
        fail: reject
      });
    });
    const decisions = { [templateId]: result[templateId] || 'reject' };
    const service = role === 'technician'
      ? api.technician.wechatSubscriptions
      : api.client.wechatSubscriptions;
    await service.record(decisions);
    wx.setStorageSync(`wechat_consultation_prompt_${role}`, Date.now());
    return decisions;
  } catch (error) {
    return { error: error && error.errMsg ? error.errMsg : 'request_failed' };
  }
}

module.exports = {
  getBookingReminderResultState,
  prepareBookingReminderStatus,
  requestBookingReminder,
  requestConsultationReply,
  shouldShowConsultationReminder
};

const config = require('../config');
const api = require('../services/api');

async function requestBookingReminder(role) {
  const app = getApp();
  const remoteConfig = app.globalData.launchConfig || wx.getStorageSync('launch_config') || {};
  const dayBeforeTemplateId = String(
    remoteConfig.bookingDayBeforeTemplateId ||
    remoteConfig.bookingReminderTemplateId ||
    config.bookingDayBeforeTemplateId ||
    config.bookingReminderTemplateId ||
    ''
  ).trim();
  const hourBeforeTemplateId = String(
    remoteConfig.bookingHourBeforeTemplateId ||
    config.bookingHourBeforeTemplateId ||
    ''
  ).trim();
  const eventTemplateId = String(role === 'technician'
    ? (remoteConfig.bookingTechnicianNewTemplateId || config.bookingTechnicianNewTemplateId || '')
    : (remoteConfig.bookingClientSuccessTemplateId || config.bookingClientSuccessTemplateId || '')
  ).trim();
  const templateIds = [eventTemplateId, dayBeforeTemplateId, hourBeforeTemplateId]
    .filter((templateId, index, list) => templateId && list.indexOf(templateId) === index);
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
    return decisions;
  } catch (error) {
    return { error: error && error.errMsg ? error.errMsg : 'request_failed' };
  }
}

module.exports = { requestBookingReminder };

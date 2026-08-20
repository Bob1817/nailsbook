const config = require('../config');
const api = require('../services/api');

async function requestBookingReminder(role) {
  const app = getApp();
  const remoteConfig = app.globalData.launchConfig || wx.getStorageSync('launch_config') || {};
  const templateId = String(remoteConfig.bookingReminderTemplateId || config.bookingReminderTemplateId || '').trim();
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
    return decisions;
  } catch (error) {
    return { error: error && error.errMsg ? error.errMsg : 'request_failed' };
  }
}

module.exports = { requestBookingReminder };

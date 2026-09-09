const KEY = 'work_share_registration';
function rememberShareRegistration(context, redirect) {
  wx.setStorageSync(KEY, { context, redirect, expiresAt: Date.now() + 60 * 60 * 1000 });
}
function readShareRegistration() {
  const saved = wx.getStorageSync(KEY);
  if (!saved || saved.expiresAt <= Date.now() || saved.redirect !== wx.getStorageSync('post_auth_redirect')) return {};
  const context = saved.context || {};
  if (!Number.isInteger(context.shareWorkId) || context.shareWorkId <= 0) return {};
  if (context.shareToken && !/^[a-f0-9]{48}$/.test(context.shareToken)) return {};
  return { shareWorkId: context.shareWorkId, shareToken: context.shareToken || undefined,
    shareChannel: context.shareChannel === 'wechat_moments' ? 'wechat_moments' : 'wechat_share',
    shareVisitorId: typeof context.shareVisitorId === 'string' ? context.shareVisitorId.slice(0, 64) : undefined };
}
function clearShareRegistration() { wx.removeStorageSync(KEY); }
module.exports = { rememberShareRegistration, readShareRegistration, clearShareRegistration };

// Client hints are scoped to an account; reading or dismissing one never completes a task.
function clientGuideKey() {
  const user = wx.getStorageSync('client_userInfo') || wx.getStorageSync('userInfo') || {};
  return user.id ? 'context_guide_v1_client_' + user.id : '';
}
function startClientGuide() {
  const key = clientGuideKey();
  if (key && !wx.getStorageSync(key)) wx.setStorageSync(key, { dismissed: {} });
}
module.exports = { clientGuideKey, startClientGuide };

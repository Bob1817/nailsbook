function requireAgreement(page) {
  if (page.data.privacyAgreed) return true;
  wx.showToast({ title: '请先阅读并同意用户协议与隐私政策', icon: 'none' });
  return false;
}

function requireWechatPrivacyAuthorization() {
  if (typeof wx.requirePrivacyAuthorize !== 'function') return Promise.resolve();
  return new Promise((resolve, reject) => {
    wx.requirePrivacyAuthorize({ success: resolve, fail: reject });
  });
}

function openPrivacyContract() {
  if (typeof wx.openPrivacyContract === 'function') {
    wx.openPrivacyContract({
      fail: () => wx.showToast({ title: '请在微信中查看隐私保护指引', icon: 'none' })
    });
    return;
  }
  wx.navigateTo({ url: '/pages/client/agreement/index?type=privacy' });
}

module.exports = { requireAgreement, requireWechatPrivacyAuthorization, openPrivacyContract };

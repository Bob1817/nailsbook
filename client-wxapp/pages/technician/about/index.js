const releaseConfig = require('../../../config');

Page({
  data: {
    version: '开发版',
    currentYear: new Date().getFullYear(),
    operatorName: releaseConfig.operatorName || '上线前配置',
    storeName: releaseConfig.storeName || '上线前配置',
    filingNumber: releaseConfig.filingNumber || '完成备案后配置',
    privacyContact: releaseConfig.privacyContact || '上线前配置'
  },
  async onLoad() {
    try {
      const dynamic = await getApp().loadLaunchConfig();
      this.setData({
        operatorName: dynamic.operatorName || this.data.operatorName,
        storeName: dynamic.storeName || this.data.storeName,
        storeAddress: dynamic.storeAddress || '',
        storePhone: dynamic.storePhone || '',
        filingNumber: dynamic.filingNumber || this.data.filingNumber,
        privacyContact: dynamic.privacyContact || this.data.privacyContact
      });
    } catch (err) {}
    try {
      const info = wx.getAccountInfoSync();
      const version = info && info.miniProgram && info.miniProgram.version;
      this.setData({ version: version || '开发版' });
    } catch (err) {}
  },
  openAgreement(e) {
    wx.navigateTo({ url: `/pages/client/agreement/index?type=${e.currentTarget.dataset.type}` });
  }
});

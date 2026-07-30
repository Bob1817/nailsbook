Page({
  data: {
    version: '开发版',
    currentYear: new Date().getFullYear()
  },
  onLoad() {
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

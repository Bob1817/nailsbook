const api = require('../../../services/api');

var TYPES = ['功能建议', '使用问题', '预约相关', '账号问题', '账号注销申请', '其他'];
var TITLE_MAX = 30;
var CONTENT_MAX = 500;

Page({
  data: {
    types: TYPES,
    typeIndex: 0,
    title: '',
    content: '',
    titleMax: TITLE_MAX,
    contentMax: CONTENT_MAX,
    submitting: false
  },

  onLoad(options) {
    this._pageActive = true;
    if (options && options.action === 'account-deletion') {
      this.setData({
        typeIndex: TYPES.indexOf('账号注销申请'),
        title: '申请注销账号',
        content: '请注销我的客户账号。我已了解，运营方将在核验身份及处理未完成预约后联系我确认。'
      });
    }
  },
  onShow() {
    this._pageActive = true;
    if (this._submitFinishedWhileHidden) {
      this.setData({ submitting: false });
      this._submitFinishedWhileHidden = false;
    }
  },
  onHide() { this._pageActive = false; },
  onUnload() { this._pageActive = false; },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  onTypeChange(e) {
    this.setData({ typeIndex: Number(e.detail.value) });
  },

  async submit() {
    if (this.data.submitting) return;
    var title = this.data.title.trim();
    var content = this.data.content.trim();
    if (!title) { wx.showToast({ title: '请输入问题标题', icon: 'none' }); return; }
    if (!content) { wx.showToast({ title: '请输入问题内容', icon: 'none' }); return; }

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...' });
    try {
      await api.client.feedback.create({
        title: title,
        type: this.data.types[this.data.typeIndex],
        content: content
      });
      wx.hideLoading();
      if (!this._pageActive) { this._submitFinishedWhileHidden = true; return; }
      await wx.showModal({
        title: '反馈已提交',
        content: '我们已经收到你的反馈。平台会结合问题影响范围进行处理，暂不承诺固定回复时间。',
        showCancel: false,
        confirmText: '知道了'
      });
      wx.navigateBack();
    } catch (err) {
      wx.hideLoading();
      if (!this._pageActive) { this._submitFinishedWhileHidden = true; return; }
      this.setData({ submitting: false });
      wx.showToast({ title: (err && err.message) || '提交失败', icon: 'none' });
    }
  }
});

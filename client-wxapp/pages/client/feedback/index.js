const api = require('../../../services/api');

var TYPES = ['功能建议', '使用问题', '预约相关', '账号问题', '其他'];
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
      wx.showToast({ title: '提交成功', icon: 'success' });
      setTimeout(function () { wx.navigateBack(); }, 800);
    } catch (err) {
      wx.hideLoading();
      this.setData({ submitting: false });
      wx.showToast({ title: (err && err.message) || '提交失败', icon: 'none' });
    }
  }
});

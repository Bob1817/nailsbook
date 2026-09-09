const { supportWechat = '' } = require('../../config');

Component({
  properties: {
    work: { type: Object, value: {} },
    imageUrls: { type: Array, value: [] },
    comments: { type: Array, value: [] },
    hiddenComments: { type: Array, value: [] },
    loading: { type: Boolean, value: false },
    loadFailed: { type: Boolean, value: false },
    loadErrorText: { type: String, value: '' },
    loadErrorDescription: { type: String, value: '' },
    canRetryLoad: { type: Boolean, value: false },
    isAuthor: { type: Boolean, value: false },
    showBookSame: { type: Boolean, value: true },
    canComment: { type: Boolean, value: true },
    canShare: { type: Boolean, value: true },
    sharePath: { type: String, value: '' },
    canRetryShare: { type: Boolean, value: false },
    commentText: { type: String, value: '' },
    submittingComment: { type: Boolean, value: false },
    replyingTo: { type: Object, value: null },
    visitorInfo: { type: Object, value: null }
  },
  data: {
    supportWechat: String(supportWechat).trim(),
    currentImageIndex: 0,
    showHidden: false,
    inputFocused: false,
    keyboardHeight: 0,
    topButtonStyle: 'top: 44px;'
  },
  lifetimes: {
    attached() {
      try {
        const menu = wx.getMenuButtonBoundingClientRect();
        this.setData({
          topButtonStyle: `top:${menu.top}px;`
        });
      } catch (e) {}
    }
  },
  methods: {
    copySupportWechat() {
      if (!this.data.supportWechat) return;
      wx.setClipboardData({ data: this.data.supportWechat, success: () => wx.showToast({ title: '微信号已复制', icon: 'none' }), fail: () => wx.showToast({ title: '复制失败，请长按微信号复制', icon: 'none' }) });
    },
    onSupportError() { wx.showToast({ title: '客服暂不可用，请稍后再试', icon: 'none' }); },
    emit(e) { this.triggerEvent(e.currentTarget.dataset.event, e.detail || {}); },
    retryShare() {
      if (!this.properties.canShare && this.properties.canRetryShare) this.triggerEvent('shareretry');
    },
    onSwiperChange(e) { this.setData({ currentImageIndex: e.detail.current }); },
    previewImage(e) { wx.previewImage({ current: e.currentTarget.dataset.url, urls: this.properties.imageUrls }); },
    onKeyboardHeightChange(e) { this.setData({ keyboardHeight: Math.max(0, Number(e.detail.height) || 0) }); },
    onInputBlur() { this.setData({ keyboardHeight: 0, inputFocused: false }); },
    onInput(e) { this.triggerEvent('commentinput', { value: e.detail.value }); },
    submitComment() {
      if (this.properties.submittingComment) return;
      if (this.properties.canComment && !String(this.properties.commentText || '').trim()) {
        wx.showToast({ title: '请先输入评论内容', icon: 'none' });
        return;
      }
      this.triggerEvent(this.properties.canComment ? 'commentsubmit' : 'commentlocked');
    },
    focusComment() {
      if (this.properties.canComment) this.setData({ inputFocused: true });
      this.triggerEvent(this.properties.canComment ? 'commentfocus' : 'commentlocked');
    },
    manageWork() {
      const work = this.properties.work || {};
      this.triggerEvent('manage', { id: work.id, visible: work.isVisible !== false, pinned: !!work.isPinned, featured: !!work.isFeatured, heroSlot: work.heroSlot || null });
    },
    bookSame() { this.triggerEvent('book'); },
    replyComment(e) { this.triggerEvent(this.properties.canComment ? 'commentreply' : 'commentlocked', { comment: e.currentTarget.dataset.comment }); },
    manageComment(e) { this.triggerEvent('commentmanage', { comment: e.currentTarget.dataset.comment }); },
    toggleHidden() { this.setData({ showHidden: !this.data.showHidden }); }
  }
});

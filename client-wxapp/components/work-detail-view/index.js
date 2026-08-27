Component({
  properties: {
    work: { type: Object, value: {} },
    imageUrls: { type: Array, value: [] },
    comments: { type: Array, value: [] },
    hiddenComments: { type: Array, value: [] },
    loading: { type: Boolean, value: false },
    loadFailed: { type: Boolean, value: false },
    loadErrorText: { type: String, value: '' },
    canRetryLoad: { type: Boolean, value: false },
    isAuthor: { type: Boolean, value: false },
    showBookSame: { type: Boolean, value: true },
    canComment: { type: Boolean, value: true },
    commentText: { type: String, value: '' },
    replyingTo: { type: Object, value: null }
  },
  data: {
    currentImageIndex: 0,
    showHidden: false,
    inputFocused: false,
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
    emit(e) { this.triggerEvent(e.currentTarget.dataset.event, e.detail || {}); },
    onSwiperChange(e) { this.setData({ currentImageIndex: e.detail.current }); },
    previewImage(e) { wx.previewImage({ current: e.currentTarget.dataset.url, urls: this.properties.imageUrls }); },
    onInput(e) { this.triggerEvent('commentinput', { value: e.detail.value }); },
    submitComment() { this.triggerEvent(this.properties.canComment ? 'commentsubmit' : 'commentlocked'); },
    focusComment() {
      if (this.properties.canComment) this.setData({ inputFocused: true });
      this.triggerEvent(this.properties.canComment ? 'commentfocus' : 'commentlocked');
    },
    manageWork() {
      const work = this.properties.work || {};
      this.triggerEvent('manage', { id: work.id, visible: work.isVisible !== false, pinned: !!work.isPinned, featured: !!work.isFeatured });
    },
    bookSame() { this.triggerEvent('book'); },
    replyComment(e) { this.triggerEvent(this.properties.canComment ? 'commentreply' : 'commentlocked', { comment: e.currentTarget.dataset.comment }); },
    manageComment(e) { this.triggerEvent('commentmanage', { comment: e.currentTarget.dataset.comment }); },
    toggleHidden() { this.setData({ showHidden: !this.data.showHidden }); }
  }
});

// 统一作品卡片组件（发现 / 首页最新动态 / 作品 / 点赞 / 收藏 通用视觉）
Component({
  properties: {
    work: {
      type: Object,
      value: {}
    },
    aspectClass: {
      type: String,
      value: ''
    }
  },

  methods: {
    onTap() {
      this.triggerEvent('cardtap', { id: this.data.work && this.data.work.id });
    },
    onArtistTap() {
      this.triggerEvent('artisttap', { id: this.data.work && this.data.work.technicianId });
    },
    onLikeTap() {
      this.triggerEvent('liketap', { id: this.data.work && this.data.work.id });
    }
  }
});

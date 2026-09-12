const api = require('../../../services/api');
const { parseWorkScene } = require('../../../utils/work-share-scene');
const { trackConversion } = require('../../../utils/conversion-tracking');
const { normalizeWork, normalizeWorkDetail } = require('../../../utils/normalize-work');

Page({
  data: {
    work: { imageUrls: [], comments: [] },
    sharePath: '',
    errorDescription: '',
    loading: true,
    error: false,
    errorMessage: '',
    canRetry: false,
    imageIndex: 0,
    binding: false,
    visitorInfo: null
  },

  onLoad(options) {
    this.shareChannel = options.scene || options.channel === 'wechat_moments' ? 'wechat_moments' : 'wechat_share';
    if (options.scene) options = parseWorkScene(options.scene) || {};
    this.resumeBooking = options.book === '1';
    if (options.shareToken) {
      this.shareToken = options.shareToken;
      this.loadWork();
    } else if (options.id) {
      this.workId = options.id;
      this.loadWork();
    } else {
      this.setData({ loading: false, error: true, errorMessage: '分享链接无效', errorDescription: '链接信息不完整，请返回浏览，或请分享者重新发送作品链接。', canRetry: false });
    }
  },

  async loadWork() {
    this.setData({ loading: true, error: false, errorMessage: '', errorDescription: '', canRetry: false });
    try {
      const rawWork = this.shareToken
        ? await api.public.works.shared(this.shareToken)
        // 分享落地不依赖已有绑定：普通 ID 仅取公开作品，私密作品只认令牌。
        : await api.public.works.detail(this.workId);

      // 拉取美甲师最新详情（与美甲师主页同一接口），确保 city/experienceYears/specialtiesText 完全同步
      let techSnapshot = null;
      let visitorInfo = {
        ...(rawWork.technician || {}),
        shops: rawWork.shops || []
      };
      const techId = rawWork.technicianId || (rawWork.technician && (rawWork.technician.id || rawWork.technician.technicianId));
      if (techId) {
        try {
          const artistRes = await api.public.artists.detail(String(techId));
          const artist = artistRes.artist || artistRes || {};
          if (artist && artist.id) {
            visitorInfo = {
              ...visitorInfo,
              id: artist.id,
              name: artist.name,
              avatarUrl: artist.avatarUrl,
              city: artist.city || '',
              bio: artist.bio || '',
              acceptingBookings: artist.acceptingBookings !== false,
              shops: (artist.shopAddresses || []).filter(shop => shop && shop.enabled !== false).map(shop => ({
                name: shop.name || '服务店铺',
                address: [shop.province, shop.city, shop.district, shop.detailAddress].filter(Boolean).join(' ')
              }))
            };
            artist.styleTags = (artist.styleTags || artist.specialties || []).slice(0, 5);
            artist.specialtiesText = artist.specialtiesText || (artist.styleTags.length ? artist.styleTags.slice(0, 2).join(' · ') : '');
            techSnapshot = {
              id: String(artist.id),
              technicianId: String(artist.id),
              name: artist.name,
              avatarUrl: artist.avatarUrl,
              city: artist.city || '',
              experienceYears: Number(artist.experienceYears) || 0,
              specialtiesText: artist.specialtiesText || '',
              specialties: artist.styleTags || [],
              styleTags: artist.styleTags || []
            };
          }
        } catch (e) {
          // 美甲师详情拉取失败时，用作品自带的 technician 做 fallback
        }
      }
      // 如果没拉到美甲师详情，用作品自带的 technician 对象做快照
      if (!techSnapshot && rawWork.technician) {
        const t = rawWork.technician;
        techSnapshot = {
          id: String(t.id || techId || ''),
          name: t.name || rawWork.technicianName || '美甲师',
          avatarUrl: t.avatarUrl || rawWork.technicianAvatarUrl || '',
          city: t.city || '',
          experienceYears: Number(t.experienceYears) || 0,
          specialtiesText: t.specialtiesText || '',
          specialties: t.specialties || t.styleTags || [],
          styleTags: t.styleTags || t.specialties || []
        };
      }

      const work = normalizeWorkDetail({
        ...rawWork,
        ...normalizeWork(rawWork, techSnapshot, { index: 0 })
      });
      work.comments = (work.comments || []).map((comment) => ({
        ...comment,
        userInitial: (((comment.user && comment.user.name) || '用')).charAt(0)
      }));
      work.dateStr = this.formatDate(rawWork.createdAt);

      this.setData({
        work: work,
        visitorInfo,
        sharePath: this.shareToken ? '/pages/client/public-work/index?shareToken=' + this.shareToken : '/pages/client/public-work/index?id=' + work.id,
        loading: false,
        error: false
      });
      if (!this._viewTracked) {
        this._viewTracked = true;
        trackConversion({ eventType: 'work_view', workId: work.id, technicianId: techId, channel: this.shareChannel || 'wechat_share', touchpoint: 'work_share', shareToken: this.shareToken });
      }
      if (this.resumeBooking) {
        this.resumeBooking = false;
        this.bookSameStyle();
      }
    } catch (err) {
      console.error('Failed to load work:', err);
      const unavailable = [403, 404, 410].includes(Number(err.statusCode || err.code));
      this.setData({ loading: false, error: true,
        errorMessage: unavailable ? '暂时无法查看这件作品' : '作品暂时无法加载',
        errorDescription: unavailable ? '作品可能已下架、分享已失效，或当前链接没有访问权限。你可以返回浏览其他作品。' : '请检查网络连接后重试。如果仍无法打开，请联系开发运维反馈。',
        canRetry: !unavailable });
    }
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  onSwiperChange(e) {
    this.setData({ imageIndex: e.detail.current });
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      current: url,
      urls: this.data.work.imageUrls
    });
  },

  goBack() {
    if (getCurrentPages().length > 1) wx.navigateBack();
    else wx.reLaunch({ url: '/pages/client/discover/index' });
  },

  goToLogin() {
    wx.navigateTo({ url: '/pages/client/login/index' });
  },

  async bookSameStyle() {
    const work = this.data.work;
    if (!work || !work.id || this.data.binding || this._bookingOpening) return;
    this._bookingOpening = true;
    try {
    trackConversion({ eventType: 'booking_intent', workId: work.id, technicianId: work.technicianId || (work.technician || {}).id, channel: this.shareChannel || 'wechat_share', touchpoint: 'work_share', shareToken: this.shareToken });
    const techId = work.technicianId || (work.technician || {}).id;
    if (!techId) return wx.showToast({ title: '作品美甲师信息不完整', icon: 'none' });
    const shareQuery = this.shareToken ? '&shareToken=' + encodeURIComponent(this.shareToken) : '';
    wx.navigateTo({ url: '/pages/client/create-order/index?workId=' + work.id + '&techId=' + techId + shareQuery + '&source=work_share' });
    } finally {
      this._bookingOpening = false;
    }
  },

  goToArtist() {
    const work = this.data.work || {};
    const technicianId = work.technicianId || (work.technician && work.technician.id);
    if (technicianId) wx.navigateTo({ url: `/pages/client/artist-home/index?id=${technicianId}` });
  },

  goToCommentArtist(e) {
    const role = e.currentTarget.dataset.role;
    if (role === 'technician') this.goToArtist();
  },

  onShareAppMessage() {
    const work = this.data.work || {};
    return {
      title: work.title || '美甲作品',
      path: this.shareToken
        ? `/pages/client/public-work/index?shareToken=${this.shareToken}`
        : `/pages/client/public-work/index?id=${this.workId}`,
      imageUrl: work.imageUrls && work.imageUrls[0]
    };
  }
});

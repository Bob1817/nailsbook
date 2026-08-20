const api = require('../../../services/api');
const { buildClientLoginUrl } = require('../../../utils/artist-navigation');
const { normalizeWork } = require('../../../utils/normalize-work');

Page({
  data: {
    work: null,
    loading: true,
    error: false,
    errorMessage: '',
    canRetry: false,
    imageIndex: 0
  },

  onLoad(options) {
    if (options.shareToken) {
      this.shareToken = options.shareToken;
      this.loadWork();
    } else if (options.id) {
      this.workId = options.id;
      this.loadWork();
    } else {
      this.setData({ loading: false, error: true, errorMessage: '分享链接无效', canRetry: false });
    }
  },

  async loadWork() {
    this.setData({ loading: true, error: false, errorMessage: '', canRetry: false });
    try {
      const rawWork = this.shareToken
        ? await api.public.works.shared(this.shareToken)
        : await api.public.works.detail(this.workId);

      // 拉取美甲师最新详情（与美甲师主页同一接口），确保 city/experienceYears/specialtiesText 完全同步
      let techSnapshot = null;
      const techId = rawWork.technicianId || (rawWork.technician && (rawWork.technician.id || rawWork.technician.technicianId));
      if (techId) {
        try {
          const artistRes = await api.public.artists.detail(String(techId));
          const artist = artistRes.artist || artistRes || {};
          if (artist && artist.id) {
            artist.experienceYears = Math.max(1, Number(artist.experienceYears) || 1);
            artist.styleTags = (artist.styleTags || artist.specialties || []).slice(0, 5);
            artist.specialtiesText = artist.specialtiesText || (artist.styleTags.length ? artist.styleTags.slice(0, 2).join(' · ') : '');
            techSnapshot = {
              id: String(artist.id),
              technicianId: String(artist.id),
              name: artist.name,
              avatarUrl: artist.avatarUrl,
              city: artist.city || '',
              experienceYears: Number(artist.experienceYears) || 1,
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
          experienceYears: Number(t.experienceYears) || 1,
          specialtiesText: t.specialtiesText || '',
          specialties: t.specialties || t.styleTags || [],
          styleTags: t.styleTags || t.specialties || []
        };
      }

      const work = normalizeWork(rawWork, techSnapshot, { index: 0 });
      work.dateStr = this.formatDate(rawWork.createdAt);

      this.setData({
        work: work,
        loading: false,
        error: false
      });
    } catch (err) {
      console.error('Failed to load work:', err);
      this.setData({ loading: false, error: true, errorMessage: '作品暂时无法加载', canRetry: true });
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
    wx.navigateBack();
  },

  goToLogin() {
    wx.navigateTo({ url: '/pages/client/login/index' });
  },

  bookSameStyle() {
    const work = this.data.work;
    if (!work || !work.id) return;
    const target = `/pages/client/create-order/index?workId=${work.id}`;
    const app = getApp();
    const token = app.globalData.token || wx.getStorageSync('client_token');
    const role = app.globalData.role || wx.getStorageSync('role');
    if (token && role === 'client') {
      wx.navigateTo({ url: target });
      return;
    }
    wx.navigateTo({ url: buildClientLoginUrl(target, { source: 'public_work' }) });
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
    const work = this.data.work;
    return {
      title: work.title || '美甲作品',
      path: this.shareToken
        ? `/pages/client/public-work/index?shareToken=${this.shareToken}`
        : `/pages/client/public-work/index?id=${this.workId}`,
      imageUrl: work.imageUrls && work.imageUrls[0]
    };
  }
});

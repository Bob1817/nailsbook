const api = require('../../../services/api');
const { parseWorkScene } = require('../../../utils/work-share-scene');
const { trackConversion } = require('../../../utils/conversion-tracking');
const { normalizeWork, normalizeWorkDetail } = require('../../../utils/normalize-work');
const { buildClientLoginUrl } = require('../../../utils/artist-navigation');
const { rememberShareRegistration } = require('../../../utils/work-share-registration');
const { buildWorkShareTitle } = require('../../../utils/share-copy');

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
    visitorInfo: null,
    isLoggedIn: false,
    isOwnerView: false
  },

  onLoad(options) {
    this.shareChannel = options.channel === 'wechat_moments' ? 'wechat_moments' : 'wechat_share';
    this.entrySource = options.source || 'work_share';
    if (options.scene) options = parseWorkScene(options.scene) || {};
    this.inviteCode = options.invite ? decodeURIComponent(options.invite) : '';
    if (wx.showShareMenu) {
      wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
    }
    if (!options.shareToken && !options.id) {
      this.setData({ loading: false, error: true, errorMessage: '分享链接无效', errorDescription: '链接信息不完整，请返回浏览，或请分享者重新发送作品链接。', canRetry: false });
      return;
    }
    const token = wx.getStorageSync('token') || wx.getStorageSync('client_token') || wx.getStorageSync('technician_token');
    this.setData({ isLoggedIn: !!token });
    this._techId = null; // 缓存美甲师 ID，登录绑定时使用
    this.resumeBooking = options.book === '1';
    if (options.shareToken) {
      this.shareToken = options.shareToken;
      this.loadWork();
    } else if (options.id) {
      this.workId = options.id;
      this.loadWork();
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
      this._techId = techId || null;
      this.inviteCode = this.inviteCode || (rawWork.technician && rawWork.technician.invitationCode) || '';
      const app = getApp();
      const role = wx.getStorageSync('role') || (app.globalData && app.globalData.role);
      const currentTechnician = wx.getStorageSync('technician_userInfo') || wx.getStorageSync('userInfo') || (app.globalData && app.globalData.userInfo) || {};
      const currentTechnicianId = currentTechnician.id || currentTechnician.technicianId;
      const isOwnerView = role === 'technician' && currentTechnicianId && String(currentTechnicianId) === String(techId);
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
              invitationCode: artist.invitationCode || this.inviteCode,
              shops: (artist.shopAddresses || []).filter(shop => shop && shop.enabled !== false).map(shop => ({
                name: shop.name || '服务店铺',
                address: [shop.province, shop.city, shop.district, shop.detailAddress].filter(Boolean).join(' '),
                businessHours: shop.businessHours || null,
                latitude: shop.latitude,
                longitude: shop.longitude
              }))
            };
            this.inviteCode = this.inviteCode || artist.invitationCode || '';
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
        isOwnerView: !!isOwnerView,
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
    else wx.reLaunch({ url: '/pages/client/home/index' });
  },

  goToLogin() {
    wx.navigateTo({
      url: buildClientLoginUrl(this.publicWorkPath(false), {
        source: 'work_share',
        inviteCode: this.inviteCode
      })
    });
  },

  // 未登录：联系该美甲师 → 跳转登录，登录后自动绑定并进入对话
  contactArtist() {
    const techId = this._techId;
    if (!techId) return wx.showToast({ title: '美甲师信息不完整', icon: 'none' });
    const returnPath = `/pages/client/chat-detail/index?techId=${techId}`;
    wx.navigateTo({
      url: buildClientLoginUrl(returnPath, {
        source: 'work_share',
        inviteCode: this.inviteCode
      }) + '&techId=' + techId + '&action=chat'
    });
  },

  // 公开作品和美甲师主页允许游客继续浏览；账户操作再要求登录。
  viewMoreWorks() {
    const techId = this._techId;
    if (!techId) return wx.showToast({ title: '美甲师信息不完整', icon: 'none' });
    const invite = this.inviteCode ? '&invite=' + encodeURIComponent(this.inviteCode) : '';
    wx.navigateTo({ url: `/pages/client/artist-home/index?id=${techId}&source=${encodeURIComponent(this.entrySource || 'work_share')}${invite}` });
  },

  async bookSameStyle() {
    const work = this.data.work;
    if (!work || !work.id || this.data.binding || this._bookingOpening) return;
    if (this.data.isOwnerView) {
      this.editWork();
      return;
    }
    this._bookingOpening = true;
    try {
      trackConversion({ eventType: 'booking_intent', workId: work.id, technicianId: work.technicianId || (work.technician || {}).id, channel: this.shareChannel || 'wechat_share', touchpoint: 'work_share', shareToken: this.shareToken });
      const techId = work.technicianId || (work.technician || {}).id;
      if (!techId) return wx.showToast({ title: '作品美甲师信息不完整', icon: 'none' });
      if (this.data.visitorInfo && this.data.visitorInfo.acceptingBookings === false) {
        return wx.showToast({ title: '这位美甲师暂未接单', icon: 'none' });
      }
      const app = getApp();
      const role = app.globalData.role || wx.getStorageSync('role');
      const token = app.globalData.token || wx.getStorageSync('token');
      if (role === 'technician') {
        return wx.showToast({ title: '美甲师账号不能以客户身份预约', icon: 'none' });
      }
      if (!token || role !== 'client') {
        const redirect = this.publicWorkPath(true);
        rememberShareRegistration({
          shareWorkId: Number(work.id),
          shareToken: this.shareToken,
          shareChannel: this.shareChannel
        }, redirect);
        wx.navigateTo({
          url: buildClientLoginUrl(redirect, {
            source: 'work_share',
            inviteCode: this.inviteCode,
            quickBookingTechId: techId
          })
        });
        return;
      }
      wx.showLoading({ title: '正在关联美甲师', mask: true });
      await api.client.profile.bindSharedWork(Number(work.id), this.shareToken);
      wx.hideLoading();
      const shareQuery = this.shareToken ? '&shareToken=' + encodeURIComponent(this.shareToken) : '';
      const inviteQuery = this.inviteCode ? '&invite=' + encodeURIComponent(this.inviteCode) : '';
      wx.navigateTo({ url: '/pages/client/create-order/index?workId=' + work.id + '&techId=' + techId + shareQuery + inviteQuery + '&source=work_share' });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '关联美甲师失败，请重试', icon: 'none' });
    } finally {
      this._bookingOpening = false;
    }
  },

  publicWorkPath(book) {
    const params = [];
    if (this.shareToken) params.push('shareToken=' + encodeURIComponent(this.shareToken));
    else params.push('id=' + encodeURIComponent((this.data.work || {}).id || this.workId));
    if (this.inviteCode) params.push('invite=' + encodeURIComponent(this.inviteCode));
    if (book) params.push('book=1');
    params.push('source=' + encodeURIComponent(this.entrySource || 'work_share'));
    params.push('channel=' + encodeURIComponent(this.shareChannel || 'wechat_share'));
    return '/pages/client/public-work/index?' + params.join('&');
  },

  editWork() {
    const work = this.data.work || {};
    const workId = work.id || this.workId;
    if (workId) wx.navigateTo({ url: `/pages/technician/work-edit/index?id=${workId}` });
  },

  goToArtist() {
    const work = this.data.work || {};
    const technicianId = work.technicianId || (work.technician && work.technician.id);
    if (technicianId) {
      const invite = this.inviteCode ? '&invite=' + encodeURIComponent(this.inviteCode) : '';
      wx.navigateTo({ url: `/pages/client/artist-home/index?id=${technicianId}&source=${encodeURIComponent(this.entrySource || 'work_share')}${invite}` });
    }
  },

  goToCommentArtist(e) {
    const role = e.currentTarget.dataset.role;
    if (role === 'technician') this.goToArtist();
  },

  onShareAppMessage() {
    const work = this.data.work || {};
    trackConversion({ eventType:'work_share_intent', workId:work.id, technicianId:work.technicianId || (work.technician || {}).id, channel:'wechat_share', touchpoint:'work_share', shareToken:this.shareToken });
    return {
      title: buildWorkShareTitle(work, this.data.visitorInfo),
      path: this.publicWorkPath(false),
      imageUrl: work.imageUrls && work.imageUrls[0]
    };
  },

  onShareTimeline() {
    const work = this.data.work || {};
    trackConversion({ eventType:'work_share_intent', workId:work.id, technicianId:work.technicianId || (work.technician || {}).id, channel:'wechat_moments', touchpoint:'work_share', shareToken:this.shareToken });
    return {
      title: buildWorkShareTitle(work, this.data.visitorInfo),
      query: this.publicWorkPath(false).split('?')[1].replace(/channel=[^&]+/, 'channel=wechat_moments'),
      imageUrl: work.imageUrls && work.imageUrls[0]
    };
  }
});

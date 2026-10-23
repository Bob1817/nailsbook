const api = require('../../../services/api');
const { normalizeWork } = require('../../../utils/normalize-work');
const bookingEngine = require('../../../utils/booking-time-engine');
const { buildArtistShareTitle } = require('../../../utils/share-copy');
const { buildClientLoginUrl } = require('../../../utils/artist-navigation');
const { trackConversion } = require('../../../utils/conversion-tracking');

const QUALIFICATION_TYPE_LABEL = {
  education: '教育经历',
  training: '培训经历',
  certificate: '证书资质',
  certification: '行业认证',
  award: '获奖记录'
};

function mergeFeaturedComments(reviews, homepageComments) {
  const serviceReviews = (reviews || []).map((item) => ({ ...item, key: `review-${item.id}` }));
  const profileComments = (homepageComments || []).map((item) => ({
    ...item,
    key: `comment-${item.id}`,
    clientName: item.clientName || '匿名用户',
    clientAvatarUrl: item.clientAvatarUrl || '',
    rating: 0
  }));
  return serviceReviews.concat(profileComments).filter((item) => item.content).slice(0, 10);
}

function buildAvailabilitySummary(artist, bookingSettings) {
  if (artist.acceptingBookings === false) return { text: '已暂停接单', available: false };
  if (!bookingSettings) return { text: '', available: false };

  const dailyBookingLimit = Number(bookingSettings.dailyBookingLimit) || 2;
  const bookingCounts = bookingSettings.bookingCounts || {};
  const closedDates = (bookingSettings.days || [])
    .filter((day) => !day.accepting)
    .map((day) => day.serviceDate);
  const today = new Date();

  for (let offset = 0; offset < 21; offset += 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    const serviceDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const remaining = dailyBookingLimit - Number(bookingCounts[serviceDate] || 0);
    const isClosed = closedDates.includes(serviceDate)
      || !bookingEngine.activeScheduleForDate(artist.serviceSchedule, serviceDate);
    if (isClosed || remaining <= 0) continue;

    if (offset === 0) {
      return {
        text: remaining <= 3 ? `仅剩 ${remaining} 名额` : '今日可约',
        available: true
      };
    }
    return {
      text: offset === 1
        ? '明日可约'
        : (offset === 2 ? '后日可约' : `${date.getMonth() + 1}月${date.getDate()}日可约`),
      available: true
    };
  }
  return { text: '暂无可约档期', available: false };
}

Page({
  data: {
    artistId: '',
    previewMode: false,
    isOwner: false,
    artist: {},
    works: [],
    displayWorks: [],
    reviews: [],
    qualifications: [],
    timeline: [],
    heroImageUrl: '',
    bannerImages: [],
    environmentPhotos: [],
    environmentHeroIndex: 0,
    standards: null,
    policies: null,
    studioPolicyItems: [],
    showStudioPolicyModal: false,
    exclusiveServiceNote: '',
    privacyNote: '',
    aestheticPhilosophy: '',
    brandIntroduction: '',
    brandTagline: '',
    isLiked: false,
    likeCount: 0,
    isFavorited: false,
    favoriteCount: 0,
    commentCount: 0,
    homepageComments: [],
    featuredComments: [],
    displayComments: [],
    availabilitySummary: '',
    hasAvailableSchedule: false,
    detailModal: '',
    showCommentComposer: false,
    commentDraft: '',
    commentSubmitting: false,
    isBound: false,
    entrySource: '',
    navBarHeight: 88,
    loading: true,
    loadFailed: false,
    showOwnerMenuSheet: false
  },

  onLoad(options) {
    try {
      const systemInfo = wx.getSystemInfoSync();
      const menuButton = wx.getMenuButtonBoundingClientRect();
      const navBarHeight = menuButton.top + menuButton.height + (menuButton.top - systemInfo.statusBarHeight);
      this.setData({ navBarHeight });
    } catch (err) {
      // 保留默认导航栏高度。
    }
    const artistId = options.id || options.techId || '';
    const role = wx.getStorageSync('role') || (getApp().globalData && getApp().globalData.role);
    const user = wx.getStorageSync('technician_userInfo') || {};
    const isOwner = options.owner === '1' || (role === 'technician' && user.id && String(user.id) === String(artistId));
    const entrySource = options.source || '';
    this.inviteCode = options.invite ? decodeURIComponent(options.invite) : '';
    this.resumeBooking = options.book === '1';
    wx.hideShareMenu();
    this.setData({
      artistId,
      previewMode: options.preview === '1' || isOwner,
      isOwner,
      entrySource
    });
    this.loadHome().then(() => {
      if (!this.resumeBooking) return;
      this.resumeBooking = false;
      this.bookArtist();
    });
  },

  showOwnerMenu() {
    if (!this.data.isOwner) return;
    this.setData({ showOwnerMenuSheet: true });
  },

  closeOwnerMenu() {
    this.setData({ showOwnerMenuSheet: false });
  },

  handleOwnerMenuAction(event) {
    const action = event.currentTarget.dataset.action;
    this.closeOwnerMenu();
    if (action === 'edit') wx.navigateTo({ url: '/pages/technician/homepage-settings/index' });
    if (action === 'interactions') wx.navigateTo({ url: '/pages/technician/artist-interactions/index?type=like' });
  },

  onShow() {
    if (this._reloadOnShow) {
      this._reloadOnShow = false;
      this.loadHome();
    }
    if (this.data.artistId && !this.data.previewMode) {
      this.loadRelationship();
    }
  },

  viewWork(e) {
    const id = (e.detail && e.detail.id) || e.currentTarget.dataset.id;
    if (!id) return;
    const source = this.data.entrySource || 'artist_home';
    const invite = this.inviteCode ? '&invite=' + encodeURIComponent(this.inviteCode) : '';
    wx.navigateTo({ url: '/pages/client/public-work/index?id=' + id + invite + '&source=' + encodeURIComponent(source) + '&channel=wechat_share' });
  },

  viewAllWorks() {
    const source = this.data.entrySource || 'artist_home';
    const invite = this.inviteCode ? '&invite=' + encodeURIComponent(this.inviteCode) : '';
    wx.navigateTo({ url: '/pages/client/works/index?techId=' + this.data.artistId + invite + '&source=' + encodeURIComponent(source) + '&mode=gallery' });
  },

  async loadHome() {
    if (!this.data.artistId) return this.setData({ loading: false, loadFailed: true });
    this.setData({ loading: true, loadFailed: false });
    try {
      const results = await Promise.all([
        api.public.artists.detail(this.data.artistId),
        api.public.brands.works(this.data.artistId, {
          page: 1,
          pageSize: 50,
          imageSize: 'medium',
          content: (this.data.previewMode || this.data.isOwner) ? `owner_preview_${Date.now()}` : undefined
        }).catch(() => api.client.works.list(
          { techId: this.data.artistId },
          { silent: true }
        ).catch(() => null)),
        api.public.brands.profile(this.data.artistId, (this.data.previewMode || this.data.isOwner)
          ? { content: `owner_preview_${Date.now()}` }
          : undefined).catch(() => null),
        api.public.brands.comments(this.data.artistId, { page: 1, pageSize: 20 }).catch(() => null),
        api.public.bookingSettings(this.data.artistId).catch(() => null)
      ]);
      const res = results[0];
      const worksRes = results[1];
      const brandRes = results[2];
      const commentsRes = results[3];
      const bookingSettings = results[4];
      const artist = res.artist || res.technician || res || {};
      // 页面展示对象由公开接口按 artistId 确认，邀请码也必须以该对象的服务端值为准。
      this.inviteCode = artist.invitationCode || '';
      const brand = (brandRes && (brandRes.brand || brandRes)) || {};
      // 基础信息
      artist.initial = (artist.name || '美').charAt(0);
      artist.name = brand.name || artist.name || '';
      artist.experienceYears = Number(brand.experienceYears) || 0;
      artist.isVerified = artist.isVerified || false;
      artist.isOnline = artist.status === 'active';
      artist.city = brand.city || artist.city || '';

      // 统计数据：仅使用真实来源，无则不展示
      const stats = res.stats || {};
      artist.workCount = Number(stats.workCount) || 0;
      const ratingNum = Number(stats.rating);
      artist.rating = (stats.rating === null || stats.rating === undefined || stats.rating === '' || Number.isNaN(ratingNum)) ? null : ratingNum;
      artist.reviewCount = Number(stats.reviewCount) || 0;
      const interactionCounts = brand.interactionCounts || {};
      const favoriteCount = Number(interactionCounts.favorites || 0);
      const likeCount = Number(interactionCounts.likes || 0);
      const commentCount = Number(interactionCounts.comments || 0);
      const homepageComments = ((commentsRes && (commentsRes.items || commentsRes.list)) || []).map((item) => ({
        ...item,
        timeAgo: formatTimeAgo(item.createdAt)
      }));

      // 专业标签
      const styleTags = (artist.styleTags || brand.specialties || []).slice(0, 5);
      artist.styleTags = styleTags;
      artist.specialtiesText = styleTags.slice(0, 2).join(' · ') || '';
      artist.certificationTitle = brand.certificationTitle || '';

      // 个人简介 / 理念
      artist.bio = brand.introduction || '';
      artist.servicePhilosophy = artist.servicePhilosophy || '';
      const aestheticPhilosophy = brand.aestheticPhilosophy || '';
      const brandIntroduction = brand.introduction || '';
      const brandTagline = brand.tagline || '';

      const useHomepageDefaults = brand.featuredServiceIds == null;

      // 店铺：优先主页选定店铺；未配置时展示第一个已启用且地址完整的店铺
      const shops = artist.shopAddresses || [];
      const featuredShopKey = brand.featuredShopKey || '';
      let shop = null;
      if (featuredShopKey) {
        shop = shops.find((s) => `${s.name || ''}||${s.detailAddress || s.address || ''}` === featuredShopKey) || null;
      }
      if (!shop) {
        shop = shops.find((item) => item.enabled !== false && (item.detailAddress || item.address))
          || shops.find((item) => item.enabled !== false)
          || null;
      }
      if (!shop) shop = {};
      artist.shopName = shop.name || brand.name || '';
      artist.shopAddress = formatAddress(shop) || '';
      artist.businessHours = formatBusinessHours(shop.businessHours) || '';
      artist.phone = shop.phone || '';
      artist._shopLatitude = parseFloat(shop.latitude) || 0;
      artist._shopLongitude = parseFloat(shop.longitude) || 0;
      artist._guidance = (shop.guidance && shop.guidance.enabled) ? shop.guidance : null;

      // 资质（公开 artist 接口）
      const qualifications = (res.qualifications || []).map((q) => ({
        id: q.id,
        type: q.type,
        typeLabel: QUALIFICATION_TYPE_LABEL[q.type] || '专业资质',
        title: q.title || '',
        detail: q.detail || '',
        organization: q.organization || '',
        year: q.year || '',
        isVerified: !!q.isVerified,
        imageUrl: q.imageUrl || ''
      }));

      // 成长时间线：仅真实数据（优先品牌配置）
      const timelineSource = (brand.timeline && brand.timeline.length) ? brand.timeline : (artist.timeline || []);
      const timeline = (timelineSource || []).map(item => ({
        year: item.year || '',
        desc: item.description || item.desc || ''
      })).filter((item) => item.year || item.desc);

      // 品牌：环境、保障、规则、FAQ、一对一与流程
      // 工作室环境只展示所选店铺的实景照片
      const shopPhotos = (Array.isArray(shop.photos) ? shop.photos : [])
        .map((url) => ({
          imageUrl: url || '',
          caption: shop.name || '',
          sceneTag: '工作室'
        }))
        .filter((item) => item.imageUrl);
      const environmentPhotos = shopPhotos;
      const standardValues = brand.standards
        ? {
            hygiene: brand.standards.hygiene || '',
            materials: brand.standards.materials || '',
            allergyNotice: brand.standards.allergyNotice || ''
          }
        : null;
      const standards = standardValues && Object.values(standardValues).some(Boolean) ? standardValues : null;
      const policyValues = brand.policies
        ? {
            late: brand.policies.late || '',
            cancellation: brand.policies.cancellation || '',
            aftercare: brand.policies.aftercare || ''
          }
        : null;
      const policies = policyValues && Object.values(policyValues).some(Boolean) ? policyValues : null;
      const studioPolicyItems = [
        { key: 'hygiene', label: '卫生消毒', content: standards && standards.hygiene },
        { key: 'materials', label: '专业工具', content: standards && standards.materials },
        { key: 'allergyNotice', label: '过敏提示', content: standards && standards.allergyNotice },
        { key: 'late', label: '迟到说明', content: policies && policies.late },
        { key: 'cancellation', label: '取消规则', content: policies && policies.cancellation },
        { key: 'aftercare', label: '售后补修', content: policies && policies.aftercare }
      ].filter((item) => item.content);
      const exclusiveServiceNote = brand.exclusiveServiceNote || '';
      const privacyNote = brand.privacyNote || '';
      // 美甲师快照（统一注入到每个作品，确保作品卡/详情页/收藏列表口径与美甲师主页一致）
      const techSnapshot = {
        id: this.data.artistId,
        technicianId: this.data.artistId,
        name: artist.name,
        avatarUrl: artist.avatarUrl,
        city: artist.city,
        experienceYears: artist.experienceYears || 0,
        specialtiesText: artist.specialtiesText || '',
        specialties: artist.styleTags || [],
        styleTags: artist.styleTags || []
      };

      // 作品列表（统一口径：美甲师主页顶部信息 ↔ 作品卡 ↔ 作品详情页 完全一致）
      const isBound = !!this.data.isBound;
      const sourceWorks = worksRes
        ? (worksRes.items || worksRes.works || worksRes.list || worksRes.data || (Array.isArray(worksRes) ? worksRes : []))
        : (res.works || []);
      const savedFeaturedWorks = sourceWorks.filter((item) => item.isFeatured);
      const featuredSource = savedFeaturedWorks.length || !useHomepageDefaults
        ? savedFeaturedWorks
        : sourceWorks.slice(0, 6);
      const works = featuredSource.map((item, index) => normalizeWork(item, techSnapshot, {
        index: index,
        styleTags: techSnapshot.styleTags,
        isBound: isBound
      })).filter(item => item.coverUrl);

      // 未配置主页背景时，才以真实环境图 / 作品封面作为降级背景
      const bannerImages = [
        ...environmentPhotos.map((item) => item.imageUrl),
        ...works.map((item) => item.coverUrl)
      ].filter(Boolean).slice(0, 4);

      if (!artist.workCount) artist.workCount = works.length;

      // 评价列表
      const reviews = (res.featuredReviews || []).slice(0, 3).map(review => ({
        id: review.id,
        content: review.content,
        rating: review.rating || 5,
        clientName: review.client?.name || review.clientName || '匿名用户',
        clientAvatarUrl: review.client?.avatarUrl || review.clientAvatarUrl || '',
        initial: (review.client?.name || review.clientName || '匿').charAt(0),
        timeAgo: formatTimeAgo(review.createdAt)
      }));
      const featuredComments = mergeFeaturedComments(reviews, homepageComments);
      const availability = buildAvailabilitySummary(artist, bookingSettings);

      this.setData({
        artist,
        works,
        displayWorks: works.slice(0, 6),
        reviews,
        featuredComments,
        displayComments: featuredComments.slice(0, 2),
        availabilitySummary: availability.text,
        hasAvailableSchedule: availability.available,
        timeline,
        qualifications,
        heroImageUrl: brand.heroImageUrl || '',
        bannerImages,
        environmentPhotos,
        environmentHeroIndex: 0,
        standards,
        policies,
        studioPolicyItems,
        exclusiveServiceNote,
        privacyNote,
        aestheticPhilosophy,
        brandIntroduction,
        brandTagline,
        brandShare: brand.share || null,
        likeCount,
        favoriteCount,
        commentCount,
        homepageComments,
        loading: false
      });
      if (this.inviteCode) wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
      else wx.hideShareMenu();
      if (!this.data.isOwner && !this._viewTracked) {
        this._viewTracked = true;
        trackConversion({ eventType:'artist_view', technicianId:Number(artist.id || this.data.artistId), channel:this.data.entrySource || 'direct', touchpoint:'artist_home' });
      }
    } catch (err) {
      console.error('load artist home error:', err);
      this.setData({ loading: false, loadFailed: true });
    }
  },

  async loadRelationship() {
    const app = getApp();
    const role = app.globalData.role || wx.getStorageSync('role');
    if (!app.globalData.token || role !== 'client') {
      return;
    }
    try {
      const me = await api.auth.getUserInfo('client');
      const bindings = me.technicians || me.bindings || [];
      wx.setStorageSync('client_bindings', bindings);
      const isBound = bindings.some(b => String(b.id || b.technicianId) === String(this.data.artistId));
      const interaction = await api.client.artists.homepageInteractions(this.data.artistId);
      this.setData({
        isBound,
        isLiked: !!interaction.isLiked,
        isFavorited: !!interaction.isFavorited,
        likeCount: Number(interaction.likeCount || 0),
        favoriteCount: Number(interaction.favoriteCount || 0),
        commentCount: Number(interaction.commentCount || 0)
      });
    } catch (err) {
      // ignore
    }
  },

  openOwnInteractions(type) {
    const app = getApp();
    const role = wx.getStorageSync('role') || app.globalData.role;
    const user = wx.getStorageSync('technician_userInfo') || wx.getStorageSync('userInfo') || {};
    if (role !== 'technician' || !user.id || String(user.id) !== String(this.data.artistId)) return false;
    wx.navigateTo({ url: '/pages/technician/artist-interactions/index?type=' + type });
    return true;
  },

  async toggleLike() {
    if (this.openOwnInteractions('like')) return;
    if (!this.requireClientLogin()) return;
    try {
      const result = await api.client.artists.toggleHomepageLike(this.data.artistId);
      this.setData({ isLiked: result.liked, likeCount: Number(result.count || 0) });
      wx.vibrateShort && wx.vibrateShort({ type: 'light' });
    } catch (err) { wx.showToast({ title: err.message || '操作失败', icon: 'none' }); }
  },

  async toggleFavorite() {
    if (this.openOwnInteractions('favorite')) return;
    if (!this.requireClientLogin()) return;
    try {
      const result = await api.client.artists.toggleHomepageFavorite(this.data.artistId);
      this.setData({ isFavorited: result.favorited, favoriteCount: Number(result.count || 0) });
      wx.showToast({ title: result.favorited ? '已收藏' : '已取消收藏', icon: 'none' });
    } catch (err) { wx.showToast({ title: err.message || '操作失败', icon: 'none' }); }
  },

  openComments() {
    if (this.openOwnInteractions('comment')) return;
    if (!this.requireClientLogin()) return;
    this.setData({ showCommentComposer: true });
  },
  openAboutDetail() { this.setData({ detailModal: 'about' }); },
  openCareerDetail() { this.setData({ detailModal: 'career' }); },
  openStudioDetail() { this.setData({ detailModal: 'studio' }); },
  openReviewDetail() { this.setData({ detailModal: 'reviews' }); },
  closeDetailModal() { this.setData({ detailModal: '' }); },
  closeComments() { if (!this.data.commentSubmitting) this.setData({ showCommentComposer: false }); },
  onCommentInput(e) { this.setData({ commentDraft: e.detail.value }); },
  async submitHomepageComment() {
    const content = this.data.commentDraft.trim();
    if (!content || this.data.commentSubmitting) return;
    this.setData({ commentSubmitting: true });
    try {
      await api.client.artists.addHomepageComment(this.data.artistId, content);
      const result = await api.public.brands.comments(this.data.artistId, { page: 1, pageSize: 20 });
      const homepageComments = (result.items || []).map((item) => ({ ...item, timeAgo: formatTimeAgo(item.createdAt) }));
      const featuredComments = mergeFeaturedComments(this.data.reviews, homepageComments);
      this.setData({
        homepageComments,
        featuredComments,
        displayComments: featuredComments.slice(0, 2),
        commentCount: Number(result.total || 0),
        commentDraft: '',
        showCommentComposer: false
      });
      wx.showToast({ title: '评论已发布', icon: 'success' });
    } catch (err) { wx.showToast({ title: err.message || '评论失败', icon: 'none' }); }
    finally { this.setData({ commentSubmitting: false }); }
  },

  requireClientLogin() {
    const app = getApp();
    const role = app.globalData.role || wx.getStorageSync('role');
    if (app.globalData.token && role === 'client') return true;
    const target = '/pages/client/artist-home/index?id=' + this.data.artistId;
    wx.navigateTo({
      url: buildClientLoginUrl(target, {
        source: this.data.entrySource || 'artist_home',
        inviteCode: this.inviteCode
      })
    });
    return false;
  },

  async bookArtist() {
    if (this.data.isOwner) {
      wx.showToast({ title: '客户访问主页后可从这里发起预约', icon: 'none' });
      return;
    }
    if (this._bookingOpening) return;
    if (this.data.artist && this.data.artist.acceptingBookings === false) {
      wx.showToast({ title: '这位美甲师暂未接单', icon: 'none' });
      return;
    }
    const app = getApp();
    const token = app.globalData.token || wx.getStorageSync('token');
    const role = app.globalData.role || wx.getStorageSync('role');
    if (role === 'technician') {
      wx.showToast({ title: '美甲师账号不能以客户身份预约', icon: 'none' });
      return;
    }
    const source = this.data.entrySource || 'artist_home';
    if (!token || role !== 'client') {
      const target = this.artistSharePath(true, source);
      wx.navigateTo({
        url: buildClientLoginUrl(target, {
          source,
          inviteCode: this.inviteCode,
          quickBookingTechId: this.data.artistId
        })
      });
      return;
    }
    this._bookingOpening = true;
    wx.showLoading({ title: '正在准备预约', mask: true });
    try {
      await this.loadRelationship();
      if (!this.data.isBound) {
        const inviteCode = this.inviteCode || (this.data.artist || {}).invitationCode || '';
        if (!inviteCode) throw new Error('该美甲师邀请信息暂不可用');
        await api.client.profile.bindQuickBooking(Number(this.data.artistId), inviteCode);
        const pendingMap = wx.getStorageSync('client_binding_pending') || {};
        delete pendingMap[String(this.data.artistId)];
        wx.setStorageSync('client_binding_pending', pendingMap);
        this.setData({ isBound: true });
      }
      let quickMode = false;
      if (api.public && api.public.bookingSettings) {
        try {
          const settings = await api.public.bookingSettings(this.data.artistId);
          quickMode = !!settings.quickBookingEnabled;
        } catch (_) {}
      }
      wx.hideLoading();
      wx.navigateTo({
        url: '/pages/client/create-order/index?techId=' + this.data.artistId +
          (quickMode ? '&mode=quick' : '') +
          (this.inviteCode ? '&invite=' + encodeURIComponent(this.inviteCode) : '') +
          '&source=' + encodeURIComponent(source)
      });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '暂时无法发起预约', icon: 'none' });
    } finally {
      this._bookingOpening = false;
    }
  },

  artistSharePath(book, source) {
    const params = [
      'id=' + encodeURIComponent(this.data.artistId),
      'source=' + encodeURIComponent(source || 'artist_share')
    ];
    if (this.inviteCode) params.push('invite=' + encodeURIComponent(this.inviteCode));
    if (book) params.push('book=1');
    return '/pages/client/artist-home/index?' + params.join('&');
  },

  openNavigation() {
    const artist = this.data.artist;
    if (!artist.shopAddress) { wx.showToast({ title: '暂无地址信息', icon: 'none' }); return; }
    const lat = artist._shopLatitude || 0;
    const lng = artist._shopLongitude || 0;
    if (!lat && !lng) { wx.setClipboardData({ data: artist.shopAddress, success: () => wx.showToast({ title: '地址已复制，请手动导航', icon: 'none' }) }); return; }
    wx.openLocation({
      latitude: lat,
      longitude: lng,
      name: artist.shopName || '工作室',
      address: artist.shopAddress,
      scale: 18
    });
  },

  callPhone() {
    const phone = this.data.artist.phone;
    if (phone) {
      wx.makePhoneCall({ phoneNumber: phone });
    } else {
      wx.showToast({ title: '暂无联系电话', icon: 'none' });
    }
  },

  previewEnvPhoto(e) {
    const urls = (this.data.environmentPhotos || []).map((p) => p.imageUrl).filter(Boolean);
    if (!urls.length) return;
    const idx = Number(e.currentTarget.dataset.idx) || 0;
    const current = urls[Math.min(idx, urls.length - 1)];
    // 全屏预览，支持左右滑动切换
    wx.previewImage({ urls, current });
  },

  onEnvironmentHeroChange(e) {
    this.setData({ environmentHeroIndex: Number(e.detail.current) || 0 });
  },

  openGuidance() {
    var artist = this.data.artist;
    var techId = this.data.artistId;
    if (!techId) return;
    wx.navigateTo({
      url: '/pages/client/shop-guidance/index?techId=' + techId + '&shopName=' + encodeURIComponent(artist.shopName || '') + '&address=' + encodeURIComponent(artist.shopAddress || '')
    });
  },

  openStudioPolicies() {
    if (!this.data.studioPolicyItems.length) return;
    this.setData({ showStudioPolicyModal: true });
  },

  closeStudioPolicies() {
    this.setData({ showStudioPolicyModal: false });
  },

  onShareAppMessage() {
    const artist = this.data.artist || {};
    const share = this.data.brandShare || {};
    const title = buildArtistShareTitle(artist, share.title);
    trackConversion({ eventType:'artist_share_intent', technicianId:Number(artist.id || this.data.artistId), channel:'wechat_share', touchpoint:'artist_home' });
    return {
      title,
      path: this.artistSharePath(false, 'artist_share'),
      imageUrl: share.coverUrl || artist.avatarUrl || (this.data.bannerImages && this.data.bannerImages[0]) || ''
    };
  },

  onShareTimeline() {
    const artist = this.data.artist || {};
    const share = this.data.brandShare || {};
    trackConversion({ eventType:'artist_share_intent', technicianId:Number(artist.id || this.data.artistId), channel:'wechat_moments', touchpoint:'artist_home' });
    return {
      title: buildArtistShareTitle(artist, share.title),
      query: this.artistSharePath(false, 'artist_share').split('?')[1] + '&channel=wechat_moments',
      imageUrl: share.coverUrl || artist.avatarUrl || (this.data.bannerImages && this.data.bannerImages[0]) || ''
    };
  }
});

function formatAddress(address) {
  if (!address) return '';
  return [address.province, address.city, address.district, address.detailAddress || address.address]
    .filter(Boolean).join(' ');
}

function formatBusinessHours(hours) {
  if (!hours || !hours.length) return '';
  const open = hours.filter(item => !item.closed);
  if (!open.length) return '';
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const days = open.map(item => weekdays[Number(item.weekday)]).filter(Boolean);
  return open[0].start + ' - ' + open[0].end + '（' + days.join('、') + '）';
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 60) return minutes + '分钟前';
  if (hours < 24) return hours + '小时前';
  if (days < 7) return days + '天前';
  if (days < 30) return Math.floor(days / 7) + '周前';
  return Math.floor(days / 30) + '个月前';
}

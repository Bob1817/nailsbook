const api = require('../../../services/api');
const { normalizeWork } = require('../../../utils/normalize-work');

const DEFAULT_SERVICE_ICONS = ['/static/icons/svc-handcare.svg', '/static/icons/svc-palette.svg', '/static/icons/svc-extend.svg', '/static/icons/svc-remove.svg'];
const QUALIFICATION_TYPE_LABEL = {
  education: '教育经历',
  training: '培训经历',
  certificate: '证书资质',
  certification: '行业认证',
  award: '获奖记录'
};

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
    services: [],
    heroImageUrl: '',
    bannerImages: [],
    environmentPhotos: [],
    environmentHeroIndex: 0,
    standards: null,
    policies: null,
    studioPolicyItems: [],
    showStudioPolicyModal: false,
    faqs: [],
    exclusiveServiceNote: '',
    privacyNote: '',
    serviceProcess: [],
    aestheticPhilosophy: '',
    brandIntroduction: '',
    brandTagline: '',
    hasRealStats: false,
    isLiked: false,
    likeCount: 0,
    isFavorited: false,
    favoriteCount: 0,
    commentCount: 0,
    homepageComments: [],
    showCommentComposer: false,
    commentDraft: '',
    commentSubmitting: false,
    isBound: false,
    isReturningClient: false,
    isBindingPending: false,
    entrySource: '',
    entrySourceLabel: '',
    entryGuide: '',
    navBarHeight: 88,
    loading: true,
    loadFailed: false,
    showBindModal: false,
    bindInviteCode: '',
    bindChecking: false,
    bindCandidate: null,
    bindError: '',
    stylePhotoCards: [],
    styleTextTags: [],
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
    this.setData({
      artistId,
      previewMode: options.preview === '1' || isOwner,
      isOwner,
      entrySource
    });
    this.loadHome();
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
      this.loadRelationship().then(() => this.updateEntryGuide());
    } else {
      this.updateEntryGuide();
    }
  },

  updateEntryGuide() {
    const sourceLabels = {
      friend: '来自朋友分享',
      share: '来自分享名片',
      share_card: '来自分享名片',
      xhs: '来自小红书',
      xiaohongshu: '来自小红书',
      douyin: '来自抖音',
      inquiry: '来自咨询询价',
      artist_home: '美甲师主页',
      booking: '预约引导',
      card: '美甲师名片'
    };
    const entrySourceLabel = sourceLabels[this.data.entrySource] || '';
    let entryGuide = '';
    if (this.data.previewMode || this.data.isOwner) {
      entryGuide = '';
    } else if (!getApp().globalData.token) {
      entryGuide = '浏览作品与环境无需登录；预约或咨询时登录即可。';
    } else if (this.data.isBindingPending) {
      entryGuide = '绑定申请已提交，美甲师通过后即可预约。可先收藏作品，通过后我们会保留入口。';
    } else if (!this.data.isBound) {
      entryGuide = '预约将绑定 TA 为你的专属美甲师（一对一工作室）。';
    } else if (this.data.isReturningClient) {
      entryGuide = '欢迎回来，可直接预约或预约上次同款。';
    } else {
      entryGuide = '已绑定，选好服务与时间即可提交预约。';
    }
    this.setData({ entryGuide, entrySourceLabel });
  },

  viewWork(e) {
    const id = (e.detail && e.detail.id) || e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/client/public-work/index?id=' + id });
  },

  viewAllWorks() {
    wx.navigateTo({ url: '/pages/client/works/index?techId=' + this.data.artistId });
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
        api.public.brands.services(this.data.artistId, { page: 1, pageSize: 20 }).catch(() => null),
        api.public.brands.comments(this.data.artistId, { page: 1, pageSize: 20 }).catch(() => null)
      ]);
      const res = results[0];
      const worksRes = results[1];
      const brandRes = results[2];
      const servicesRes = results[3];
      const commentsRes = results[4];
      const artist = res.artist || res.technician || res || {};
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

      // 服务列表：仅真实数据
      const serviceSource = servicesRes
        ? (servicesRes.items || servicesRes.data || [])
        : (artist.serviceItems || []);
      const services = serviceSource.map((item, idx) => ({
        name: item.name || '',
        price: item.price && typeof item.price === 'object'
          ? (item.price.min || item.price.max || 0)
          : (item.priceCents ? item.priceCents / 100 : (item.price || 0)),
        duration: item.durationMinutes ? `${item.durationMinutes}分钟` : (item.duration || ''),
        desc: item.description || item.desc || '',
        icon: (item.icon && item.icon.indexOf && item.icon.indexOf('/') === 0)
          ? item.icon
          : DEFAULT_SERVICE_ICONS[idx % DEFAULT_SERVICE_ICONS.length]
      }));

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
      const serviceProcess = (brand.serviceProcess || []).map((item, index) => ({
        step: item.step || index + 1,
        title: item.title || '',
        description: item.description || ''
      })).filter((item) => item.title || item.description);
      const faqs = (brand.faqs || []).map((item) => ({
        question: item.question || '',
        answer: item.answer || ''
      })).filter((item) => item.question && item.answer);

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

      // 擅长风格只使用带对应真实标签的作品图；没有匹配作品时展示文字标签
      const styleShowcases = artist.styleTags.map((label) => {
        const matchedWork = sourceWorks.find((item) => {
          const tags = parseWorkTags(item.tags);
          return tags.some((tag) => tag === label || tag.indexOf(label) >= 0 || label.indexOf(tag) >= 0);
        });
        return {
          label,
          workId: matchedWork ? matchedWork.id : '',
          imageUrl: matchedWork
            ? (matchedWork.coverUrl || (Array.isArray(matchedWork.imageUrls) ? matchedWork.imageUrls[0] : '') || '')
            : ''
        };
      });
      const stylePhotoCards = styleShowcases.filter((item) => item.imageUrl);
      const styleTextTags = styleShowcases.filter((item) => !item.imageUrl);

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

      this.setData({
        artist,
        works,
        displayWorks: works.slice(0, 8),
        reviews,
        timeline,
        services,
        qualifications,
        heroImageUrl: brand.heroImageUrl || '',
        bannerImages,
        environmentPhotos,
        environmentHeroIndex: 0,
        stylePhotoCards,
        styleTextTags,
        standards,
        policies,
        studioPolicyItems,
        faqs,
        exclusiveServiceNote,
        privacyNote,
        serviceProcess,
        aestheticPhilosophy,
        brandIntroduction,
        brandTagline,
        brandShare: brand.share || null,
        hasRealStats: (
          (artist.workCount > 0 ? 1 : 0) +
          ((artist.rating != null && !Number.isNaN(artist.rating)) ? 1 : 0) +
          (artist.reviewCount > 0 ? 1 : 0)
        ) >= 2,
        likeCount,
        favoriteCount,
        commentCount,
        homepageComments,
        loading: false
      });
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
      const pendingMap = wx.getStorageSync('client_binding_pending') || {};
      const isBindingPending = !isBound && !!pendingMap[String(this.data.artistId)];
      this.setData({
        isBound,
        isLiked: !!interaction.isLiked,
        isFavorited: !!interaction.isFavorited,
        likeCount: Number(interaction.likeCount || 0),
        favoriteCount: Number(interaction.favoriteCount || 0),
        commentCount: Number(interaction.commentCount || 0),
        isBindingPending
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
  closeComments() { if (!this.data.commentSubmitting) this.setData({ showCommentComposer: false }); },
  onCommentInput(e) { this.setData({ commentDraft: e.detail.value }); },
  async submitHomepageComment() {
    const content = this.data.commentDraft.trim();
    if (!content || this.data.commentSubmitting) return;
    this.setData({ commentSubmitting: true });
    try {
      await api.client.artists.addHomepageComment(this.data.artistId, content);
      const result = await api.public.brands.comments(this.data.artistId, { page: 1, pageSize: 20 });
      this.setData({
        homepageComments: (result.items || []).map((item) => ({ ...item, timeAgo: formatTimeAgo(item.createdAt) })),
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
    wx.navigateTo({ url: '/pages/login/index?redirect=' + encodeURIComponent(target) });
    return false;
  },

  async bookArtist() {
    if (this.data.isOwner) {
      wx.showToast({ title: '客户访问主页后可从这里发起预约', icon: 'none' });
      return;
    }
    if (api.public && api.public.bookingSettings) {
      try {
        const settings = await api.public.bookingSettings(this.data.artistId);
        if (settings.quickBookingEnabled) {
          wx.navigateTo({
            url: '/pages/client/create-order/index?techId=' + this.data.artistId + '&mode=quick&source=' + (this.data.entrySource || 'artist_home')
          });
          return;
        }
      } catch (_) {}
    }
    const app = getApp();
    const token = app.globalData.token;
    const role = app.globalData.role || wx.getStorageSync('role');
    // 1. 未登录 → 跳转登录（回跳主页，保留来源）
    if (!token || role !== 'client') {
      const target = '/pages/client/artist-home/index?id=' + this.data.artistId +
        (this.data.entrySource ? '&source=' + this.data.entrySource : '');
      wx.navigateTo({ url: '/pages/login/index?redirect=' + encodeURIComponent(target) });
      return;
    }
    // 2. 已登录但未绑定 → 绑定中给状态提示，否则打开绑定弹窗
    if (!this.data.isBound) {
      if (this.data.isBindingPending) {
        wx.showToast({ title: '绑定审核中，美甲师通过后即可预约', icon: 'none' });
        return;
      }
      this.setData({ showBindModal: true });
      return;
    }
    // 3. 已绑定（新客/老客同一预约链路；老客在预约页可少填字段）
    wx.navigateTo({
      url: '/pages/client/create-order/index?techId=' + this.data.artistId +
        (this.data.entrySource ? '&source=' + this.data.entrySource : '')
    });
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

  closeBindModal() {
    if (this.data.bindChecking) return;
    this.setData({ showBindModal: false, bindInviteCode: '', bindCandidate: null, bindError: '' });
  },

  onBindInviteInput(e) {
    let raw = String(e.detail.value || '').trim();
    const match = raw.match(/[?&/](?:invite|code|referral)[=/#]([A-Za-z0-9_-]+)/i);
    if (match) raw = match[1];
    this.setData({ bindInviteCode: raw, bindCandidate: null, bindError: '' });
  },

  async verifyInviteCode() {
    const code = this.data.bindInviteCode.trim();
    if (!code) return this.setData({ bindError: '请输入邀请码或邀请链接' });
    this.setData({ bindChecking: true, bindError: '', bindCandidate: null });
    try {
      const technician = await api.client.profile.findTechByInviteCode(code);
      if (!technician || String(technician.id) !== String(this.data.artistId)) {
        this.setData({ bindError: '该邀请码不属于当前美甲师' });
        return;
      }
      this.setData({ bindCandidate: technician });
    } catch (err) {
      this.setData({ bindError: err.message || '邀请码无效，请向美甲师获取最新邀请码' });
    } finally {
      this.setData({ bindChecking: false });
    }
  },

  async submitBinding() {
    if (!this.data.bindCandidate || this.data.bindChecking) return;
    this.setData({ bindChecking: true });
    try {
      const result = await api.client.profile.bindTechnician(this.data.artistId, this.data.bindInviteCode.trim(), '从美甲师主页申请绑定', 'artist_home');
      const pendingMap = wx.getStorageSync('client_binding_pending') || {};
      pendingMap[String(this.data.artistId)] = Date.now();
      wx.setStorageSync('client_binding_pending', pendingMap);
      this.setData({
        showBindModal: false,
        bindCandidate: null,
        bindInviteCode: '',
        isBindingPending: true
      });
      this.updateEntryGuide();
      wx.showModal({
        title: '绑定申请已提交',
        content: '美甲师通过后，主页会开放可约日期和预约入口。你仍可先浏览作品，通过后再来预约。',
        showCancel: false,
        confirmText: '知道了'
      });
    } catch (err) {
      this.setData({ bindError: err.message || '绑定申请失败，请重试' });
    } finally {
      this.setData({ bindChecking: false });
    }
  },

  onShareAppMessage() {
    const artist = this.data.artist || {};
    const share = this.data.brandShare || {};
    const title = share.title || [artist.name, artist.specialtiesText].filter(Boolean).join(' · ') || '美甲师主页';
    return {
      title,
      path: '/pages/client/artist-home/index?id=' + this.data.artistId + (this.data.entrySource ? '&source=' + this.data.entrySource : ''),
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

function parseWorkTags(value) {
  let tags = value || [];
  if (typeof tags === 'string') {
    try {
      tags = JSON.parse(tags);
    } catch (error) {
      tags = tags.split(/[、，,]/);
    }
  }
  return (Array.isArray(tags) ? tags : [])
    .flatMap((tag) => String(tag || '').split(/[、，,]/))
    .map((tag) => tag.trim())
    .filter(Boolean);
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

const api = require('../../../services/api');
const { normalizeWork } = require('../../../utils/normalize-work');

const DEFAULT_TIMELINE = [
  { year: '2019', desc: '入行学习，师从日本JNA认证导师' },
  { year: '2021', desc: '获得高级美甲师认证，作品登上行业杂志' },
  { year: '2024', desc: '创立个人工作室「晴日美甲」，专注高端定制服务' }
];
const DEFAULT_SERVICES = [
  { name: '基础护理与修形', price: 128, duration: '约45分钟', desc: '甲面修整、死皮处理、指缘护理、手部滋养', icon: '/static/icons/svc-handcare.svg' },
  { name: '色彩与款式制作', price: 268, duration: '约75-120分钟', desc: '纯色/渐变/法式/晕染/贴片等多种款式可选', icon: '/static/icons/svc-palette.svg' },
  { name: '指甲延长与加固', price: 358, duration: '约90-150分钟', desc: '水晶延长/光疗延长，加固修复薄软甲面', icon: '/static/icons/svc-extend.svg' },
  { name: '卸甲服务', price: 68, duration: '约30分钟', desc: '专业安全卸甲，保护甲面不受损伤', icon: '/static/icons/svc-remove.svg' }
];
const DEFAULT_SERVICE_ICONS = ['/static/icons/svc-handcare.svg', '/static/icons/svc-palette.svg', '/static/icons/svc-extend.svg', '/static/icons/svc-remove.svg'];

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
    isFollowed: false,
    isLiked: false,
    likeCount: 0,
    isFavorited: false,
    followerCount: 0,
    favoriteCount: 0,
    isBound: false,
    loading: true,
    loadFailed: false,
    showBindModal: false,
    bindInviteCode: '',
    bindChecking: false,
    bindCandidate: null,
    bindError: '',
    bannerImages: [
      'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=300&h=200&fit=crop&auto=format&q=60',
      'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=300&h=200&fit=crop&auto=format&q=60',
      'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=300&h=200&fit=crop&auto=format&q=60',
      'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=300&h=200&fit=crop&auto=format&q=60'
    ],
    styleBgs: [
      'var(--nb-action)',
      'var(--nb-page)',
      'var(--nb-action)',
      'var(--nb-action)',
      'var(--nb-page)'
    ]
  },

  onLoad(options) {
    const artistId = options.id || options.techId || '';
    const role = wx.getStorageSync('role') || (getApp().globalData && getApp().globalData.role);
    const user = wx.getStorageSync('technician_userInfo') || {};
    const isOwner = options.owner === '1' || (role === 'technician' && user.id && String(user.id) === String(artistId));
    this.setData({ artistId, previewMode: options.preview === '1' || isOwner, isOwner });
    this.loadHome();
  },

  editHomepage() { wx.navigateTo({ url: '/pages/technician/homepage-settings/index' }); },

  onShow() {
    if (this.data.artistId && !this.data.previewMode) this.loadRelationship();
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
        api.client.works.list(
          { techId: this.data.artistId },
          { needAuth: false, silent: true }
        ).catch(() => null)
      ]);
      const res = results[0];
      const worksRes = results[1];
      const artist = res.artist || res.technician || res || {};
      
      // 基础信息
      artist.initial = (artist.name || '美').charAt(0);
      artist.experienceYears = Math.max(1, Number(artist.experienceYears) || 6);
      artist.isVerified = artist.isVerified || false;
      artist.isOnline = artist.status === 'active';
      artist.city = artist.city || '上海';
      
      // 统计数据
      artist.serviceCount = artist.serviceCount || (res.stats && res.stats.serviceCount) || 1280;
      artist.satisfactionRate = artist.satisfactionRate || (res.stats && res.stats.satisfactionRate) || 99.2;
      const followerCount = Number(artist.followerCount || (res.stats && res.stats.followerCount) || 0);
      const favoriteCount = Number(artist.favoriteCount || (res.stats && res.stats.favoriteCount) || 0);
      const likeCount = Number(artist.likeCount || (res.stats && res.stats.likeCount) || 0);
      
      // 专业标签
      artist.styleTags = (artist.styleTags || artist.specialties || []).slice(0, 5);
      artist.specialtiesText = artist.styleTags.slice(0, 2).join(' · ') || '日式专攻';
      
      // 个人简介
      artist.bio = artist.bio || '';
      
      // 店铺信息
      const shop = (artist.shopAddresses || [])[0] || {};
      artist.shopName = shop.name || artist.shopName || '晴日美甲工作室';
      artist.shopAddress = formatAddress(shop) || artist.shopAddress || '';
      artist.businessHours = formatBusinessHours(shop.businessHours) || artist.businessHours || '';
      artist.phone = shop.phone || artist.phone || '';
      artist._shopLatitude = parseFloat(shop.latitude) || 0;
      artist._shopLongitude = parseFloat(shop.longitude) || 0;
      artist._guidance = (shop.guidance && shop.guidance.enabled) ? shop.guidance : null;
      
      // 服务信息
      artist.servicePhilosophy = artist.servicePhilosophy || '';
      
      // 成长时间线
      const timeline = (artist.timeline || []).map(item => ({
        year: item.year || '',
        desc: item.description || item.desc || ''
      }));
      if (!timeline.length) timeline.push(...DEFAULT_TIMELINE);
      
      // 服务列表
      const services = (artist.serviceItems || []).map((item, idx) => ({
        name: item.name || '',
        price: item.priceCents ? item.priceCents / 100 : (item.price || 0),
        duration: item.duration || '',
        desc: item.description || item.desc || '',
        icon: (item.icon && item.icon.indexOf && item.icon.indexOf('/') === 0)
          ? item.icon
          : DEFAULT_SERVICE_ICONS[idx % DEFAULT_SERVICE_ICONS.length]
      }));
      if (!services.length) services.push(...DEFAULT_SERVICES);
      
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
        ? (worksRes.list || worksRes.data || (Array.isArray(worksRes) ? worksRes : []))
        : (res.works || []);
      const featuredSource = sourceWorks.some((item) => item.isFeatured)
        ? sourceWorks.filter((item) => item.isFeatured)
        : sourceWorks;
      const works = featuredSource.map((item, index) => normalizeWork(item, techSnapshot, {
        index: index,
        styleTags: techSnapshot.styleTags,
        isBound: isBound
      })).filter(item => item.coverUrl);
      
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
        likeCount,
        followerCount,
        favoriteCount,
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
      const follows = me.followedTechnicians || me.follows || [];
      const isFollowed = follows.some(f => String(f.id || f.technicianId) === String(this.data.artistId));
      const favs = me.favorites || me.favoritedTechnicians || [];
      const isFavorited = this.data.isFavorited || favs.some(f => String(f.id || f.technicianId) === String(this.data.artistId));
      this.setData({ isBound, isFollowed, isFavorited });
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

  toggleFollow() {
    if (this.openOwnInteractions('follow')) return;
    const app = getApp();
    if (!app.globalData.token) {
      wx.showToast({ title: '登录后即可关注', icon: 'none' });
      return;
    }
    const isFollowed = !this.data.isFollowed;
    this.setData({ isFollowed });
    wx.showToast({ title: isFollowed ? '关注成功' : '已取消关注', icon: 'none' });
  },

  toggleLike() {
    if (this.openOwnInteractions('like')) return;
    // 点赞无需登录，本地乐观更新；同时累计点赞计数
    const isLiked = !this.data.isLiked;
    const delta = isLiked ? 1 : -1;
    const likeCount = Math.max(0, Number(this.data.likeCount || 0) + delta);
    this.setData({ isLiked, likeCount });
    wx.vibrateShort && wx.vibrateShort({ type: 'light' });
  },

  toggleFavorite() {
    if (this.openOwnInteractions('favorite')) return;
    const app = getApp();
    if (!app.globalData.token) {
      wx.showToast({ title: '登录后即可收藏', icon: 'none' });
      return;
    }
    const isFavorited = !this.data.isFavorited;
    this.setData({ isFavorited });
    wx.showToast({ title: isFavorited ? '已收藏' : '已取消收藏', icon: 'none' });
  },

  async bookArtist() {
    if (api.public && api.public.bookingSettings) {
      try {
        const settings = await api.public.bookingSettings(this.data.artistId);
        if (settings.quickBookingEnabled) { wx.navigateTo({ url: '/pages/client/create-order/index?techId=' + this.data.artistId + '&mode=quick&source=artist_home' }); return; }
      } catch (_) {}
    }
    const app = getApp();
    const token = app.globalData.token;
    const role = app.globalData.role || wx.getStorageSync('role');
    // 1. 未登录 → 跳转登录
    if (!token || role !== 'client') {
      const target = '/pages/client/artist-home/index?id=' + this.data.artistId;
      wx.navigateTo({ url: '/pages/login/index?redirect=' + encodeURIComponent(target) });
      return;
    }
    // 2. 已登录但未绑定 → 打开绑定预约弹窗
    if (!this.data.isBound) {
      this.setData({ showBindModal: true });
      return;
    }
    // 3. 已绑定 → 直接进入预约下单页
    wx.navigateTo({ url: '/pages/client/create-order/index?techId=' + this.data.artistId });
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

  openGuidance() {
    var artist = this.data.artist;
    var techId = this.data.artistId;
    if (!techId) return;
    wx.navigateTo({
      url: '/pages/client/shop-guidance/index?techId=' + techId + '&shopName=' + encodeURIComponent(artist.shopName || '') + '&address=' + encodeURIComponent(artist.shopAddress || '')
    });
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
      this.setData({ showBindModal: false, bindCandidate: null, bindInviteCode: '' });
      wx.showModal({ title: '绑定申请已提交', content: '美甲师通过后，主页会开放可约日期和预约入口。', showCancel: false, confirmText: '知道了' });
    } catch (err) {
      this.setData({ bindError: err.message || '绑定申请失败，请重试' });
    } finally {
      this.setData({ bindChecking: false });
    }
  },

  onShareAppMessage() {
    const artist = this.data.artist || {};
    return {
      title: artist.name || '美甲师主页',
      path: '/pages/client/artist-home/index?id=' + this.data.artistId,
      imageUrl: artist.avatarUrl || ''
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

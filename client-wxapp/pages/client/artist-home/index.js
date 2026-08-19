const api = require('../../../services/api');

const QUAL_ICONS = { education:'🎓', training:'📚', certificate:'📜', certification:'✅', award:'🏆' };

Page({
  data: {
    artistId: '', previewMode:false, artist: {}, works: [], reviews:[], qualifications:[],
    leftCol: [], rightCol: [], isLiked:false, isFavorited:false,
    serviceCount: 0, loading: true, loadFailed: false, followed: false, followLoading: false,
    bindingStatus: 'unbound', showBindModal:false, bindInviteCode:'', bindChecking:false,
    bindCandidate:null, bindError:''
  },

  onLoad(options) {
    this.setData({ artistId: options.id || options.techId || '', previewMode:options.preview === '1' });
    this.loadHome();
  },

  onShow() {
    if (this.data.artistId && !this.data.previewMode) this.loadRelationship();
  },

  async loadHome() {
    if (!this.data.artistId) return this.setData({ loading: false, loadFailed: true });
    this.setData({ loading: true, loadFailed: false });
    try {
      const results = await Promise.all([
        api.public.artists.detail(this.data.artistId),
        api.public.brands.profile(this.data.artistId,{imageSize:'original'}).catch(() => ({})),
        api.public.brands.reviews(this.data.artistId,{page:1,pageSize:6}).catch(() => ({items:[],summary:{}})),
        api.public.brands.availability(this.data.artistId,{}).catch(() => ({}))
      ]);
      const res = results[0];
      const brand = (results[1] && results[1].brand) || {};
      const reviewData = results[2] || {};
      const artist = res.artist || res.technician || res || {};
      artist.name = brand.name || artist.name;
      artist.heroUrl = brand.heroImageUrl || (brand.share && brand.share.coverUrl) || artist.coverUrl || artist.profileCoverUrl || '';
      artist.shareTitle = brand.shareTitle || artist.name || '美甲师主页';
      artist.shareDescription = brand.shareDescription || brand.tagline || artist.bio || '发现一位值得预约的美甲师';
      artist.shareCoverUrl = brand.shareCoverUrl || artist.heroUrl || '';
      artist.positioning = brand.tagline || artist.positioning || artist.specialty || artist.title || '独立美甲设计师';
      artist.manifesto = brand.aestheticPhilosophy || artist.aestheticPhilosophy || artist.designPhilosophy || artist.bio || '让每一次指尖设计，都成为安静而有力量的自我表达。';
      artist.bio = brand.introduction || artist.bio || '';
      artist.city = brand.city || artist.city;
      artist.serviceArea = brand.serviceArea || artist.serviceArea;
      artist.experienceYears = Math.max(1, Number(brand.experienceYears || artist.experienceYears) || 1);
      artist.certificationTitle = brand.certificationTitle || '平台实名与作品认证';
      artist.specialties = brand.specialties || [];
      artist.environmentPhotos = brand.environmentPhotos || [];
      artist.serviceModes = brand.serviceModes || {};
      artist.shopAddresses = (artist.shopAddresses || []).map((shop) => ({
        ...shop,
        displayName: shop.name || '工作室',
        displayAddress: formatAddress(shop),
        businessHoursText: formatBusinessHours(shop.businessHours)
      }));
      artist.serviceHoursText = formatSchedule(artist.serviceSchedule)
        || (artist.shopAddresses[0] && artist.shopAddresses[0].businessHoursText)
        || '时间灵活，预约后确认';
      artist.serviceHoursLines = splitServiceHours(artist.serviceHoursText);
      artist.serviceModeLines = [];
      if (artist.serviceModes.home || artist.homeService) artist.serviceModeLines.push('上门美甲');
      if (artist.serviceModes.studio || artist.shopService) artist.serviceModeLines.push('到店美甲');
      if (!artist.serviceModeLines.length) artist.serviceModeLines.push('待完善');
      artist.availabilityText = results[3].summary || results[3].label || '本月可预约';
      artist.rating = reviewData.summary && reviewData.summary.averageRating;
      artist.reviewCount = reviewData.summary && reviewData.summary.count;
      artist.initial = (artist.name || '美').charAt(0);
      artist.experienceText = artist.experienceYears + '年';
      artist.reviewText = artist.rating ? artist.rating + (artist.reviewCount ? ' · ' + artist.reviewCount + '条' : '') : '暂无评价';
      artist.specialtiesText = artist.specialties.length ? artist.specialties.slice(0,3).join(' / ') : (normalizeSpecialties(artist) || '-');
      artist.priceText = getStartingPrice(artist.serviceItems || res.services || []);
      // 新增字段
      artist.coverImageUrl = artist.coverImageUrl || brand.heroImageUrl || artist.heroUrl || '';
      artist.subtitle = [artist.city || '', artist.experienceYears ? artist.experienceYears + '年从业' : ''].filter(Boolean).join(' · ') || '专业美甲师';
      artist.styleTags = (artist.styleTags || brand.specialties || artist.specialties || []).slice(0, 4);
      artist.followerCount = artist.followerCount || res.stats?.followerCount || 0;
      artist.likeCount = artist.likeCount || res.stats?.likeCount || 0;
      artist.favoriteCount = artist.favoriteCount || res.stats?.favoriteCount || 0;
      artist.servicePhilosophy = artist.servicePhilosophy || brand.aestheticPhilosophy || '';
      artist.bookingNotes = artist.bookingNotes || '';
      artist.isVerified = artist.isVerified || false;
      const works = (res.works || []).map((item, index) => ({
        id: item.id,
        title: item.title || '美甲作品',
        coverUrl: item.coverUrl || (item.imageUrls && item.imageUrls[0]) || '',
        technicianId: artist.id || this.data.artistId,
        technicianName: artist.name || '',
        technicianAvatarUrl: artist.avatarUrl || '',
        techInitial: artist.initial,
        tags: Array.isArray(item.tags) ? item.tags : String(item.tags || '').split(',').filter(Boolean),
        isLiked: !!item.isLiked,
        likeCount: item.likeCount || 0,
        isFavorited: !!item.isFavorited,
        favoriteCount: item.favoriteCount || 0,
        commentCount: item.commentCount || 0,
        experienceYears:artist.experienceYears,
        specialtiesText:artist.specialtiesText,
        expertiseText:artist.experienceYears + '年 · ' + artist.specialtiesText,
        tagsText: (Array.isArray(item.tags) ? item.tags : String(item.tags || '').split(',').filter(Boolean)).slice(0, 2).map((tag) => '#' + tag).join(' '),
        aspect: ['work-tall', 'work-standard', 'work-wide'][index % 3]
      })).filter((item) => item.coverUrl);
      if (!artist.heroUrl && works.length) artist.heroUrl = works[0].coverUrl;
      // 处理资质数据
      const qualifications = (res.qualifications || []).map((q) => ({
        ...q,
        icon: QUAL_ICONS[q.type] || '📄'
      }));

      // 处理精选评价
      const reviews = (res.featuredReviews || reviewData.items || [])
        .filter((review) => !brand.featuredReviewIds || !brand.featuredReviewIds.length || brand.featuredReviewIds.map(String).indexOf(String(review.id)) !== -1)
        .slice(0, 3)
        .map((review) => ({
          id: review.id,
          content: review.content,
          rating: review.rating || 5,
          clientName: review.client?.name || review.clientName || '匿名用户',
          clientAvatarUrl: review.client?.avatarUrl || review.clientAvatarUrl || ''
        }));

      this.setData({
        artist,
        works,
        qualifications,
        leftCol: works.filter((_, index) => index % 2 === 0),
        rightCol: works.filter((_, index) => index % 2 === 1),
        serviceCount: (artist.serviceItems || []).length,
        reviews,
        loading: false
      });
      if (getApp().globalData.token && (getApp().globalData.role || wx.getStorageSync('role')) === 'client') {
        api.client.artists.followStatus(this.data.artistId).then((state) => {
          this.setData({ followed: Boolean(state && state.followed) });
        }).catch(() => {});
        this.loadRelationship();
      }
    } catch (err) {
      console.error('load artist home error:', err);
      this.setData({ loading: false, loadFailed: true });
    }
  },

  async loadRelationship() {
    const app = getApp();
    if (!app.globalData.token || (app.globalData.role || wx.getStorageSync('role')) !== 'client') {
      this.setData({ bindingStatus:'unbound' });
      return;
    }
    try {
      const me = await api.auth.getUserInfo('client');
      const bindings = me.technicians || me.bindings || [];
      wx.setStorageSync('client_bindings', bindings);
      const bound = bindings.some((binding) => String((binding.technician && binding.technician.id) || binding.id || binding.techId) === String(this.data.artistId));
      const serverPendingIds = me.pendingTechnicianIds || [];
      const pendingIds = Array.from(new Set((wx.getStorageSync('pending_artist_bindings') || []).concat(serverPendingIds)));
      wx.setStorageSync('pending_artist_bindings', pendingIds);
      if (bound) {
        wx.setStorageSync('pending_artist_bindings', pendingIds.filter((id) => String(id) !== String(this.data.artistId)));
        this.setData({ bindingStatus:'bound' });
      } else {
        this.setData({ bindingStatus:pendingIds.some((id) => String(id) === String(this.data.artistId)) ? 'pending' : 'unbound' });
      }
    } catch (err) {
      const bindings = wx.getStorageSync('client_bindings') || [];
      const bound = bindings.some((binding) => String((binding.technician && binding.technician.id) || binding.id || binding.techId) === String(this.data.artistId));
      this.setData({ bindingStatus:bound ? 'bound' : this.data.bindingStatus });
    }
  },

  viewWork(e) {
    const id = (e.detail && e.detail.id) || e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/client/public-work/index?id=' + id });
  },

  viewAllWorks() {
    wx.navigateTo({ url: '/pages/client/works/index?techId=' + this.data.artistId });
  },

  toggleLike() {
    const app = getApp();
    if (!app.globalData.token) {
      wx.showToast({ title: '登录后即可点赞', icon: 'none' });
      return;
    }
    const isLiked = !this.data.isLiked;
    this.setData({ isLiked });
    wx.showToast({ title: isLiked ? '已点赞' : '已取消点赞', icon: 'none' });
  },

  toggleFavorite() {
    const app = getApp();
    if (!app.globalData.token) {
      wx.showToast({ title: '登录后即可收藏', icon: 'none' });
      return;
    }
    const isFavorited = !this.data.isFavorited;
    this.setData({ isFavorited });
    wx.showToast({ title: isFavorited ? '已收藏' : '已取消收藏', icon: 'none' });
  },

  onShareTap() {
    // 触发转发
  },

  editSection(e) {
    const section=e.currentTarget.dataset.section || 'profile';
    wx.navigateTo({url:'/pages/technician/homepage-settings/index?section='+section});
  },

  async toggleFollow() {
    if (this.data.followLoading) return;
    const app = getApp();
    if (!app.globalData.token || (app.globalData.role || wx.getStorageSync('role')) !== 'client') {
      const target = '/pages/client/artist-home/index?id=' + this.data.artistId;
      wx.navigateTo({ url: '/pages/login/index?redirect=' + encodeURIComponent(target) });
      return;
    }
    this.setData({ followLoading: true });
    try {
      const result = this.data.followed
        ? await api.client.artists.unfollow(this.data.artistId)
        : await api.client.artists.follow(this.data.artistId);
      const followed = Boolean(result && result.followed);
      const delta = followed ? 1 : -1;
      this.setData({ followed, 'artist.followerCount': Math.max(0, (this.data.artist.followerCount || 0) + delta) });
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败，请重试', icon: 'none' });
    } finally { this.setData({ followLoading: false }); }
  },

  bookArtist() {
    const target = '/pages/client/create-order/index?techId=' + this.data.artistId;
    if (getApp().globalData.token && (getApp().globalData.role || wx.getStorageSync('role')) === 'client') {
      if (this.data.bindingStatus !== 'bound') {
        this.openBindModal();
        return;
      }
      wx.navigateTo({ url: target });
    } else {
      wx.navigateTo({ url: '/pages/login/index?redirect=' + encodeURIComponent(target) });
    }
  },

  openBindModal() {
    const app = getApp();
    if (!app.globalData.token || (app.globalData.role || wx.getStorageSync('role')) !== 'client') {
      const target = '/pages/client/artist-home/index?id=' + this.data.artistId;
      wx.navigateTo({ url:'/pages/login/index?redirect=' + encodeURIComponent(target) });
      return;
    }
    if (this.data.bindingStatus === 'pending') {
      wx.showToast({ title:'绑定申请审核中', icon:'none' });
      return;
    }
    this.setData({ showBindModal:true, bindInviteCode:'', bindCandidate:null, bindError:'' });
  },

  closeBindModal() {
    if (this.data.bindChecking) return;
    this.setData({ showBindModal:false, bindInviteCode:'', bindCandidate:null, bindError:'' });
  },

  onBindInviteInput(e) {
    let raw = String(e.detail.value || '').trim();
    const match = raw.match(/[?&/](?:invite|code|referral)[=/#]([A-Za-z0-9_-]+)/i);
    if (match) raw = match[1];
    this.setData({ bindInviteCode:raw, bindCandidate:null, bindError:'' });
  },

  async verifyInviteCode() {
    const code = this.data.bindInviteCode.trim();
    if (!code) return this.setData({ bindError:'请输入邀请码或邀请链接' });
    this.setData({ bindChecking:true, bindError:'', bindCandidate:null });
    try {
      const technician = await api.client.profile.findTechByInviteCode(code);
      if (!technician || String(technician.id) !== String(this.data.artistId)) {
        this.setData({ bindError:'该邀请码不属于当前美甲师' });
        return;
      }
      this.setData({ bindCandidate:technician });
    } catch (err) {
      this.setData({ bindError:err.message || '邀请码无效，请向美甲师获取最新邀请码' });
    } finally { this.setData({ bindChecking:false }); }
  },

  async submitBinding() {
    if (!this.data.bindCandidate || this.data.bindChecking) return;
    this.setData({ bindChecking:true });
    try {
      const result = await api.client.profile.bindTechnician(this.data.artistId, this.data.bindInviteCode.trim(), '从美甲师主页申请绑定', 'artist_home');
      const pendingIds = wx.getStorageSync('pending_artist_bindings') || [];
      if (!pendingIds.some((id) => String(id) === String(this.data.artistId))) pendingIds.push(this.data.artistId);
      wx.setStorageSync('pending_artist_bindings', pendingIds);
      this.setData({ bindingStatus:result && result.status === 'active' ? 'bound' : 'pending', showBindModal:false, bindCandidate:null, bindInviteCode:'' });
      wx.showModal({ title:'绑定申请已提交', content:'美甲师通过后，主页会开放可约日期和预约入口。', showCancel:false, confirmText:'知道了' });
    } catch (err) {
      this.setData({ bindError:err.message || '绑定申请失败，请重试' });
    } finally { this.setData({ bindChecking:false }); }
  },

  onShareAppMessage() {
    const artist=this.data.artist || {};
    return {
      title:artist.shareTitle || artist.name || '美甲师主页',
      path:'/pages/client/artist-home/index?id='+this.data.artistId,
      imageUrl:artist.shareCoverUrl || artist.heroUrl || ''
    };
  }
});

function normalizeSpecialties(artist) {
  const raw = artist.specialties || artist.styleTags || artist.tags || [];
  const list = Array.isArray(raw) ? raw : String(raw).split(',').map((item) => item.trim()).filter(Boolean);
  return list.slice(0, 3).join(' / ');
}

function formatAddress(address) {
  return [address.province, address.city, address.district, address.detailAddress || address.address]
    .filter(Boolean).join(' ');
}

function formatSchedule(schedule) {
  if (!schedule) return '';
  const schemes = schedule.schemes || [];
  const active = schemes.find((item) => item.id === schedule.activeSchemeId);
  if (!active || !active.days || !active.days.length) return '';
  return formatDays(active.days) + ' ' + formatTimeRange(active.startTime, active.endTime);
}

function formatBusinessHours(hours) {
  const open = (hours || []).filter((item) => !item.closed);
  if (!open.length) return '';
  const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const days = open.map((item) => weekdays[Number(item.weekday)]).filter(Boolean);
  return formatDays(days) + ' ' + formatTimeRange(open[0].start, open[0].end);
}

function formatDays(days) {
  const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const labels = { mon:'一', tue:'二', wed:'三', thu:'四', fri:'五', sat:'六', sun:'日' };
  const normalized = order.filter((day) => days.indexOf(day) !== -1);
  if (normalized.length === 7) return '周一～周日';
  if (normalized.length > 1 && normalized.every((day, index) => order.indexOf(day) === order.indexOf(normalized[0]) + index)) {
    return '周' + labels[normalized[0]] + '～周' + labels[normalized[normalized.length - 1]];
  }
  return normalized.map((day) => '周' + labels[day]).join('、');
}

function formatTimeRange(start, end) {
  if (!start || !end) return '预约后确认';
  return start + ' ～ ' + end;
}

function splitServiceHours(text) {
  const value = String(text || '').trim();
  const match = value.match(/^(周[^\s]+)\s+(.+)$/);
  return match ? [match[1], match[2]] : [value || '待完善'];
}

function getStartingPrice(services) {
  const prices = services.map((service) => {
    if (service.priceCents) return service.priceCents / 100;
    return Number(service.price || 0);
  }).filter((price) => price > 0);
  return prices.length ? '¥' + Math.round(Math.min.apply(null, prices)) + ' 起' : '';
}

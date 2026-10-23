const api = require('../../../services/api');
const { parseWorkScene } = require('../../../utils/work-share-scene');
const { buildClientLoginUrl } = require('../../../utils/artist-navigation');
function pad(n) { return String(n).padStart(2, '0'); }
function formatDateTime(value) { if (!value) return ''; const d = new Date(value); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function phoneMask(value) { const phone = String(value || ''); return phone.length === 11 ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone; }
const invitationMessages = [
  { title: '让喜欢，落在指尖。', subtitle: '愿这次相见，为日常添上一点精致与愉悦。' },
  { title: '今天也值得被认真装点。', subtitle: '把喜欢的灵感，慢慢做成适合你的样子。' },
  { title: '为自己，留一段闪光的时间。', subtitle: '期待与你一起完成这一次专属创作。' },
  { title: '愿你的每一次选择，都更像自己。', subtitle: '从这一刻开始，期待一场关于美的相见。' },
  { title: '把日常，过得更有光。', subtitle: '一双精心完成的指尖，也是一份温柔的自我表达。' }
];
function stableIndex(value, length) {
  let hash = 0;
  for (const char of String(value || '')) hash = ((hash * 31) + char.charCodeAt(0)) >>> 0;
  return length ? hash % length : 0;
}
function buildInvitation(quote) {
  const order = quote && quote.order ? quote.order : {};
  const seed = order.orderNo || quote.quoteNo || '';
  const message = invitationMessages[stableIndex(seed, invitationMessages.length)];
  const start = order.startTime ? new Date(order.startTime) : null;
  const validStart = start && !Number.isNaN(start.getTime());
  return {
    ...message,
    heroImage: '',
    date: validStart ? `${start.getMonth() + 1}月${start.getDate()}日` : '',
    weekday: validStart ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][start.getDay()] : '',
    time: validStart ? `${pad(start.getHours())}:${pad(start.getMinutes())}` : '',
    amount: (Number(quote.finalPriceFen || 0) / 100).toFixed(2).replace(/\.00$/, '')
  };
}
Page({
  data: { loading: true, submitting: false, quote: null, owner: false, feedbackSent: false, showReasons: false, customReason: false, reasonText: '', downloading: false, reasons: ['太贵了', '距离太远了', '最近没空', '只是问问而已', '款式还没决定', '其他原因'], client: null, invitation: null, accepted: false, booked: false, error: '', coverImage: '' },
  onLoad(options) {
    if (options.scene) {
      // 扫描报价单下载图中的小程序码进入
      const scene = parseWorkScene(options.scene) || {};
      if (scene.shareToken) options = { ...options, token: scene.shareToken };
    }
    this.token = String(options.token || '');
    this.quoteId = Number(options.id || 0);
    this.inviteCode = options.invite ? decodeURIComponent(options.invite) : '';
    this.autoAccept = options.autoAccept === '1';
    this.load();
  },
  async load() {
    if (!this.quoteId && !/^[a-f0-9]{48}$/.test(this.token)) return this.setData({ loading: false, error: '报价链接无效' });
    try {
      let quote;
      let owner = false;
      if (this.quoteId) {
        quote = await api.technician.bookingQuotes.detail(this.quoteId);
        owner = true;
        this.token = quote.publicToken;
      } else {
        quote = await api.public.bookingQuotes.detail(this.token);
        const user = wx.getStorageSync('technician_userInfo') || wx.getStorageSync('userInfo') || {};
        if (wx.getStorageSync('role') === 'technician' && Number(user.id) === Number(quote.technicianId)) {
          quote = await api.technician.bookingQuotes.detail(quote.id);
          owner = true;
        }
      }
      quote = this.decorateQuote(quote);
      if (quote.order) quote.order.displayTime = formatDateTime(quote.order.startTime);
      this.inviteCode = quote.invitationCode || this.inviteCode;
      const booked = quote.status === 'booked';
      this.setData({ quote, owner, invitation: booked ? buildInvitation(quote) : null, loading: false, accepted: quote.status === 'accepted_pending_schedule', booked, error: '' });
      this.loadCover(quote);
      wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
      if (this.loggedIn() && (quote.status === 'accepted_pending_schedule' || quote.status === 'booked')) await this.loadClient();
      if (this.autoAccept && this.loggedIn() && (quote.status === 'issued' || quote.status === 'viewed')) {
        this.autoAccept = false;
        await this.accept();
      }
    } catch (err) { this.setData({ loading: false, error: err.message || '报价加载失败' }); }
  },
  decorateQuote(quote) {
    const minutes = Number(quote.totalDurationMinutes || 0);
    const linesTotalFen = (quote.lines || []).reduce((sum, line) => sum + Number(line.subtotalFen || 0), 0);
    return { ...quote, avatarInitial: String(quote.technicianName || '美').slice(0, 1), priceText: (Number(quote.finalPriceFen || 0) / 100).toFixed(2), durationText: minutes % 60 === 0 ? `${minutes / 60}小时` : `${minutes}分钟`, linesTotalText: (linesTotalFen / 100).toFixed(2), discountFen: linesTotalFen - Number(quote.finalPriceFen || 0), discountText: ((linesTotalFen - Number(quote.finalPriceFen || 0)) / 100).toFixed(2), lines: (quote.lines || []).map(line => ({ ...line, priceText: (Number(line.subtotalFen || 0) / 100).toFixed(2) })) };
  },
  async loadCover(quote) {
    try {
      const res = await api.public.artists.detail(quote.technicianId);
      const shops = Array.isArray(res && res.artist && res.artist.shopAddresses) ? res.artist.shopAddresses : [];
      const photosOf = (shop) => (Array.isArray(shop && shop.photos) ? shop.photos : []).filter(Boolean);
      const shop = shops.find(item => item.name && item.name === quote.shopName && photosOf(item).length)
        || shops.find(item => item.enabled !== false && photosOf(item).length)
        || shops.find(item => photosOf(item).length);
      const cover = shop ? photosOf(shop)[0] : '';
      if (cover) {
        // 环境主图同时用于报价预览封面与已预约邀请卡背景
        this.setData(this.data.booked && this.data.invitation ? { coverImage: cover, 'invitation.heroImage': cover } : { coverImage: cover });
      }
    } catch (err) { /* 封面图仅用于展示，加载失败不阻断报价预览 */ }
  },
  returnToEdit() {
    if (!this.data.owner) return;
    const pages = getCurrentPages();
    const previous = pages[pages.length - 2];
    if (previous && previous.route === 'pages/technician/quick-quote/index') return wx.navigateBack();
    wx.navigateTo({ url: `/pages/technician/quick-quote/index?quoteId=${this.data.quote.id}` });
  },
  async downloadQuote() {
    if (this.data.downloading || !this.data.quote) return;
    this.setData({ downloading: true });
    wx.showLoading({ title: '正在生成报价单', mask: true });
    try {
      const result = await api.technician.bookingQuotes.image(this.data.quote.id);
      const filePath = `${wx.env.USER_DATA_PATH}/${result.fileName || `quote-${this.data.quote.id}.png`}`;
      wx.getFileSystemManager().writeFileSync(filePath, result.imageBase64, 'base64');
      wx.hideLoading();
      this.setData({ downloading: false });
      wx.showActionSheet({
        itemList: ['下载到相册', '转发给好友'],
        success: (res) => {
          if (res.tapIndex === 0) this.saveQuoteImage(filePath);
          else this.shareQuoteImage(filePath);
        }
      });
    } catch (err) {
      wx.hideLoading();
      this.setData({ downloading: false });
      wx.showToast({ title: err.message || '报价单生成失败，请重试', icon: 'none' });
    }
  },
  async saveQuoteImage(filePath) {
    try {
      await new Promise((resolve, reject) => wx.saveImageToPhotosAlbum({ filePath, success: resolve, fail: reject }));
      wx.showToast({ title: '已下载到相册', icon: 'success' });
    } catch (err) {
      if (err && /auth|denied/i.test(String(err.errMsg || ''))) {
        wx.showModal({ title: '需要相册权限', content: '请允许保存图片到相册后重试', confirmText: '去设置', success: (res) => { if (res.confirm) wx.openSetting(); } });
      } else {
        wx.showToast({ title: '下载失败，请重试', icon: 'none' });
      }
    }
  },
  shareQuoteImage(filePath) {
    if (typeof wx.showShareImageMenu === 'function') return wx.showShareImageMenu({ path: filePath });
    this.saveQuoteImage(filePath);
  },
  async downloadInvitation() {
    if (this.data.downloading || !this.data.booked) return;
    this.setData({ downloading: true });
    wx.showLoading({ title: '正在生成邀请卡', mask: true });
    try {
      const result = await api.public.bookingQuotes.invitation(this.token);
      const filePath = `${wx.env.USER_DATA_PATH}/${result.fileName || `invitation-${this.token.slice(0, 8)}.png`}`;
      wx.getFileSystemManager().writeFileSync(filePath, result.imageBase64, 'base64');
      wx.hideLoading();
      this.setData({ downloading: false });
      wx.showActionSheet({
        itemList: ['下载到相册', '转发给好友'],
        success: (res) => {
          if (res.tapIndex === 0) this.saveQuoteImage(filePath);
          else this.shareQuoteImage(filePath);
        }
      });
    } catch (err) {
      wx.hideLoading();
      this.setData({ downloading: false });
      wx.showToast({ title: err.message || '邀请卡生成失败，请重试', icon: 'none' });
    }
  },
  viewArtist() {
    const quote = this.data.quote;
    wx.navigateTo({ url: `/pages/client/artist-home/index?id=${quote.technicianId}&invite=${encodeURIComponent(this.inviteCode)}&source=booking_quote` });
  },
  viewShop() {
    const quote = this.data.quote;
    wx.navigateTo({ url: `/pages/client/shop-guidance/index?techId=${quote.technicianId}&shopName=${encodeURIComponent(quote.shopName || '')}&address=${encodeURIComponent(quote.shopAddress || '')}` });
  },
  thinkLater() { if (!this.data.owner && !this.data.submitting) this.setData({ showReasons: true }); },
  closeReasons() { if (!this.data.submitting) this.setData({ showReasons: false, customReason: false, reasonText: '' }); },
  noop() {},
  onReasonInput(e) { this.setData({ reasonText: e.detail.value }); },
  async selectReason(e) {
    const reason = e.currentTarget.dataset.reason;
    if (this.data.submitting || !this.data.reasons.includes(reason)) return;
    if (reason === '其他原因') return this.setData({ customReason: true });
    this.setData({ submitting: true });
    try {
      await api.public.bookingQuotes.decline(this.token, reason);
      this.setData({ showReasons: false, feedbackSent: true });
      wx.showToast({ title: '已记录，随时可以回来预约', icon: 'none' });
    } catch (err) { wx.showToast({ title: err.message || '提交失败，请重试', icon: 'none' }); }
    finally { this.setData({ submitting: false }); }
  },
  async submitCustomReason() {
    const reason = String(this.data.reasonText || '').trim();
    if (this.data.submitting || !reason) return;
    this.setData({ submitting: true });
    try {
      await api.public.bookingQuotes.decline(this.token, reason);
      this.setData({ showReasons: false, customReason: false, reasonText: '', feedbackSent: true });
      wx.showToast({ title: '已记录，随时可以回来预约', icon: 'none' });
    } catch (err) { wx.showToast({ title: err.message || '提交失败，请重试', icon: 'none' }); }
    finally { this.setData({ submitting: false }); }
  },
  loggedIn() {
    const app = getApp();
    if ((wx.getStorageSync('role') || app.globalData.role) !== 'client') return false;
    const token = wx.getStorageSync('client_token') || app.globalData.token;
    if (!token) return false;
    // 过期登录态视为未登录：走登录跳转并保留报价回跳，避免请求层 401 清态后丢失报价上下文
    const expiresAt = typeof app.getTokenExpiresAt === 'function' ? app.getTokenExpiresAt(token) : 0;
    return !(expiresAt > 0 && expiresAt <= Date.now());
  },
  goHome() {
    // 分享进入时页面栈深度为 1，返回键失效，必须用 reLaunch 提供直达出口
    const role = wx.getStorageSync('role') || getApp().globalData.role;
    wx.reLaunch({ url: role === 'technician' ? '/pages/technician/home/index' : '/pages/client/home/index' });
  },
  goBooking() {
    if (this.data.owner || this.data.submitting) return;
    const url = `/pages/client/quote-booking/index?token=${this.token}`;
    wx.navigateTo({ url, fail: () => wx.reLaunch({ url }) });
  },
  async loadClient() {
    if (this.data.client) return this.data.client;
    const result = await api.auth.getUserInfo('client');
    const client = result.client || result;
    const decorated = { ...client, displayName: client.nickname || client.phone || '客户', phoneText: phoneMask(client.phone) };
    this.setData({ client: decorated });
    return decorated;
  },
  async accept() {
    if (this.data.owner || this.data.submitting) return;
    if (!this.loggedIn()) {
      const path = `/pages/client/quote-confirm/index?token=${this.token}${this.inviteCode ? `&invite=${encodeURIComponent(this.inviteCode)}` : ''}&autoAccept=1`;
      const loginUrl = buildClientLoginUrl(path, { inviteCode: this.inviteCode, source: 'booking_quote' });
      // navigateTo 失败（如页面栈异常）时用 reLaunch 兜底，确保登录页总能唤起
      return wx.navigateTo({ url: loginUrl, fail: () => wx.reLaunch({ url: loginUrl }) });
    }
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    try {
      const quote = await api.client.bookingQuotes.accept(this.token);
      await this.loadClient();
      this.setData({ quote: this.decorateQuote(quote), accepted: true, submitting: false });
      wx.navigateTo({ url: `/pages/client/quote-booking/index?token=${this.token}` });
    } catch (err) { this.setData({ submitting: false }); wx.showToast({ title: err.message || '确认失败', icon: 'none' }); }
  },
  openNavigation() {
    const q = this.data.quote || {};
    if (!Number.isFinite(Number(q.shopLatitude)) || !Number.isFinite(Number(q.shopLongitude))) return wx.showToast({ title: '工作室暂未配置导航坐标', icon: 'none' });
    wx.openLocation({ name: q.shopName || '美甲工作室', address: q.shopAddress || '', latitude: Number(q.shopLatitude), longitude: Number(q.shopLongitude), scale: 16 });
  },
  onShareAppMessage() { const q = this.data.quote || {}; return { title: this.data.booked ? `${q.technicianName} · 专属预约邀请卡` : `${q.technicianName || '美甲师'} 为你准备了专属报价`, path: `/pages/client/quote-confirm/index?token=${this.token}${this.inviteCode ? `&invite=${encodeURIComponent(this.inviteCode)}` : ''}` }; },
  onShareTimeline() { const q = this.data.quote || {}; return { title: this.data.booked ? `${q.technicianName || 'OnlyNail'} · 专属预约邀请卡` : `${q.technicianName || 'OnlyNail'} · 专属报价确认函`, query: `token=${this.token}${this.inviteCode ? `&invite=${encodeURIComponent(this.inviteCode)}` : ''}` }; }
});

const api = require('../../../services/api');

// 图片上传约束：类型 / 单张大小 / 数量
var IMAGE_MAX_COUNT = 9;
var IMAGE_MAX_SIZE = 10 * 1024 * 1024; // 10MB
var IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];

Page({
  data: {
    conversationId: null,
    techId: null,
    techName: '',
    techAvatar: '',
    messages: [],
    groupedMessages: [],
    inputText: '',
    loading: true,
    sending: false,
    scrollToId: '',
    showAddMenu: false,
    showBookingSheet: false,
    recentOrders: [],
    chatNavHeight: 64,
    /* 滚动策略 */
    isAtBottom: true,
    keyboardHeight: 0
  },

  pollingTimer: null,
  _resizeHandler: null,

  onLoad(options) {
    this.calcNavHeight();
    var { conversationId, techId, techName } = options;
    this.setData({
      conversationId: conversationId ? parseInt(conversationId) : null,
      techId: techId ? parseInt(techId) : null
    });
    if (techName) {
      wx.setNavigationBarTitle({ title: decodeURIComponent(techName) });
      this.setData({ techName: decodeURIComponent(techName) });
    }
    this.loadMessages();

    /* 横竖屏 / 分屏适配 */
    this._resizeHandler = () => {
      this.calcNavHeight();
      if (this.data.isAtBottom) {
        this.scrollToBottom(true);
      }
    };
    wx.onWindowResize(this._resizeHandler);
  },

  onShow() { this.startPolling(); },
  onHide() { this.stopPolling(); },
  onUnload() {
    this.stopPolling();
    if (this._resizeHandler) wx.offWindowResize(this._resizeHandler);
  },

  /* ===== 轮询 ===== */
  startPolling() {
    this.stopPolling();
    this.pollingTimer = setInterval(() => {
      if (this.data.conversationId) this.loadMessages(false, true);
    }, 3000);
  },

  stopPolling() {
    if (this.pollingTimer) { clearInterval(this.pollingTimer); this.pollingTimer = null; }
  },

  /* ===== 消息加载 ===== */
  async loadMessages(showLoading = true, isPolling = false) {
    if (showLoading) this.setData({ loading: true });
    try {
      const reqOpts = isPolling ? { timeout: 10000, silent: true } : {};
      if (this.data.conversationId) {
        var res = await api.chat.messages({ conversationId: this.data.conversationId }, 'client', reqOpts);
        var messages = this.formatMessages(res.messages || res.data || res || []);
        var tech = res.technician;
        if (tech) {
          wx.setNavigationBarTitle({ title: tech.name });
          // 捕获对话对象的美甲师 id，供「快速发起预约」锁定使用
          this.setData({ techName: tech.name, techAvatar: tech.avatarUrl || "", techId: tech.id || this.data.techId });
        }
        var isFirst = this.data.messages.length === 0;
        this.setData({ messages, loading: false });
        this.groupByDate();
        api.chat.markRead(this.data.conversationId, 'client').catch(() => {});
        if (isFirst || this.data.isAtBottom) {
          this.scrollToBottom(true);
        }
      } else if (this.data.techId) {
        var bindings = wx.getStorageSync('client_bindings') || [];
        var t = bindings.find(b => b.technician?.id === this.data.techId)?.technician || bindings[0]?.technician;
        if (t) {
          wx.setNavigationBarTitle({ title: t.name });
          this.setData({ techName: t.name, techAvatar: t.avatarUrl || "", loading: false });
        } else {
          this.setData({ loading: false });
        }
      } else {
        this.setData({ loading: false });
      }
    } catch (err) {
      if (!isPolling) {
        console.error('Load messages error:', err);
        this.setData({ loading: false });
      }
    }
  },


  formatMessages(msgs) {
    return msgs.map(m => ({
      ...m,
      timeStr: formatTime(m.createdAt),
      isClient: m.senderType === 'client',
      isSystem: ['system','booking','quote','order'].includes(m.messageType),
      isOrderCard: m.messageType === 'booking' || m.messageType === 'order' || m.relatedType === 'order'
    }));
  },

  groupByDate() {
    var msgs = this.data.messages;
    var groups = [];
    for (var i = 0; i < msgs.length; i++) {
      var msg = msgs[i];
      var dateKey = getDateKey(msg.createdAt);
      var dateLabel = formatDateLabel(msg.createdAt);
      if (groups.length === 0 || groups[groups.length - 1].dateKey !== dateKey) {
        groups.push({ dateKey: dateKey, dateLabel: dateLabel, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }
    this.setData({ groupedMessages: groups });
  },

  /* ===== 滚动策略 ===== */
  onScroll(e) {
    var detail = e.detail;
    var remaining = detail.scrollHeight - detail.scrollTop - detail.clientHeight;
    this.setData({ isAtBottom: remaining < 80 });
  },

  scrollToBottom(force) {
    var msgs = this.data.messages;
    if (!msgs.length) return;
    if (!force && !this.data.isAtBottom) return;
    var targetId = 'msg-' + msgs[msgs.length - 1].id;
    this.setData({ scrollToId: '' });
    wx.nextTick(() => { this.setData({ scrollToId: targetId }); });
  },

  onInputFocus() {
    wx.nextTick(() => this.scrollToBottom(true));
  },

  /* ===== 导航高度 ===== */
  calcNavHeight() {
    try {
      var systemInfo = wx.getSystemInfoSync();
      var menuButton = wx.getMenuButtonBoundingClientRect();
      var navBarHeight = menuButton.top + menuButton.height + (menuButton.top - systemInfo.statusBarHeight);
      this.setData({ chatNavHeight: Math.round(navBarHeight) });
    } catch (e) {}
  },

  onInputChange(e) { this.setData({ inputText: e.detail.value }); },

  /* ===== 发送文字 ===== */
  async sendText() {
    var text = this.data.inputText.trim();
    if (!text || this.data.sending) return;
    if (!this.data.techId && !this.data.conversationId) { wx.showToast({ title: '无法发送消息', icon: 'none' }); return; }
    this.setData({ sending: true, inputText: '' });
    try {
      var payload = { messageType: 'text', content: text };
      if (this.data.conversationId) payload.conversationId = this.data.conversationId;
      else payload.techId = this.data.techId;
      var res = await api.chat.sendMessage(payload, 'client');
      if (res.conversationId && !this.data.conversationId) this.setData({ conversationId: res.conversationId });
      if (res.message) {
        var msgs = [...this.data.messages, { ...res.message, timeStr: formatTime(res.message.createdAt), isClient: true, isSystem: false, isOrderCard: false }];
        this.setData({ messages: msgs }); this.groupByDate(); this.scrollToBottom(true);
      }
    } catch (err) {
      wx.showToast({ title: err.message || '发送失败', icon: 'none' });
      this.setData({ inputText: text });
    } finally { this.setData({ sending: false }); }
  },

  /* ===== + 下拉菜单 ===== */
  toggleAddMenu() {
    this.setData({ showAddMenu: !this.data.showAddMenu });
  },

  closeAddMenu() {
    if (this.data.showAddMenu) this.setData({ showAddMenu: false });
  },

  /* 菜单项：发送预约（发送自己已创建的预约卡片）*/
  onSendBooking() {
    this.setData({ showAddMenu: false });
    this.openBookingSheet();
  },

  /* ===== 菜单项：上传图片（约束类型 / 大小 / 数量）===== */
  onPickImage() {
    this.setData({ showAddMenu: false });
    if (this.data.sending) return;
    wx.chooseMedia({
      count: IMAGE_MAX_COUNT,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed', 'original'],
      success: (res) => {
        var files = res.tempFiles || [];
        var paths = [];
        var rejected = false;
        for (var i = 0; i < files.length; i++) {
          var f = files[i];
          var path = f.tempFilePath || '';
          var ext = (path.split('?')[0].split('.').pop() || '').toLowerCase();
          if (IMAGE_EXTS.indexOf(ext) === -1) { rejected = true; continue; }      // 类型约束
          if (f.size && f.size > IMAGE_MAX_SIZE) { rejected = true; continue; }    // 大小约束
          paths.push(path);
        }
        if (rejected) {
          wx.showToast({ title: '仅支持 10MB 内的 JPG/PNG 图片', icon: 'none' });
        }
        if (paths.length === 0) return;
        this.uploadAndSendImages(paths);
      }
    });
  },

  async uploadAndSendImages(paths) {
    this.setData({ sending: true });
    try {
      for (var i = 0; i < paths.length; i++) {
        var uploadRes = await api.upload.image(paths[i], 'client');
        var payload = { messageType: 'image', imageUrl: uploadRes.url };
        if (this.data.conversationId) payload.conversationId = this.data.conversationId;
        else payload.techId = this.data.techId;
        var msgRes = await api.chat.sendMessage(payload, 'client');
        if (msgRes.conversationId && !this.data.conversationId) this.setData({ conversationId: msgRes.conversationId });
        if (msgRes.message) {
          var msgs = this.data.messages.concat([{ ...msgRes.message, timeStr: formatTime(msgRes.message.createdAt), isClient: true, isSystem: false, isOrderCard: false }]);
          this.setData({ messages: msgs }); this.groupByDate(); this.scrollToBottom(true);
        }
      }
    } catch (err) {
      wx.showToast({ title: '图片发送失败', icon: 'none' });
    } finally {
      this.setData({ sending: false });
    }
  },

  /* ===== 快速发起预约（美甲师固定为对话对象，复用创建预约页）===== */
  goCreateBooking() {
    if (!this.data.techId) {
      wx.showToast({ title: '暂无法获取美甲师信息', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/client/create-order/index?techId=' + this.data.techId });
  },

  previewImage(e) {
    var url = e.currentTarget.dataset.url;
    wx.previewImage({ urls: [url], current: url });
  },

  /* ===== 预约卡片 ===== */
  async openBookingSheet() {
    this.setData({ showBookingSheet: true });
    try {
      var res = await api.client.orders.list({ limit: 10 });
      var orders = (res.list || res.data || res || []).map(o => ({
        id: o.id, orderNo: o.orderNo, status: o.status,
        statusText: getStatusLabel(o.status),
        dateStr: formatDateStr(o.startTime),
        timeStr: formatTime(o.startTime),
        serviceName: o.customTitle || o.serviceType || '预约服务',
        techName: o.technician?.name || '美甲师'
      }));
      this.setData({ recentOrders: orders });
    } catch(e) { this.setData({ recentOrders: [] }); }
  },

  closeBookingSheet() { this.setData({ showBookingSheet: false }); },

  async sendOrderCard(e) {
    var orderId = e.currentTarget.dataset.id;
    var order = this.data.recentOrders.find(o => o.id === orderId);
    if (!order) return;
    this.setData({ showBookingSheet: false, sending: true });
    try {
      var content = '预约 #' + order.orderNo + '\n' + order.serviceName + '\n' + order.dateStr + ' ' + order.timeStr + '\n状态：' + order.statusText;
      var payload = { messageType: 'booking', content, relatedType: 'order', relatedId: orderId };
      if (this.data.conversationId) payload.conversationId = this.data.conversationId;
      else payload.techId = this.data.techId;
      var res = await api.chat.sendMessage(payload, 'client');
      if (res.conversationId && !this.data.conversationId) this.setData({ conversationId: res.conversationId });
      if (res.message) {
        var msgs = [...this.data.messages, { ...res.message, timeStr: formatTime(res.message.createdAt), isClient: true, isSystem: false, isOrderCard: true }];
        this.setData({ messages: msgs }); this.groupByDate(); this.scrollToBottom(true);
      }
    } catch (err) { wx.showToast({ title: '发送失败', icon: 'none' }); }
    finally { this.setData({ sending: false }); }
  },

  viewOrder(e) {
    var id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/client/order-detail/index?id=' + id });
  },

  goBooking() {
    wx.navigateTo({ url: '/pages/client/create-order/index' });
  }
});

function formatTime(time) {
  if (!time) return '';
  var d = new Date(time);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function formatDateStr(time) {
  if (!time) return '';
  var d = new Date(time);
  var months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  return months[d.getMonth()] + d.getDate() + '日';
}

function getStatusLabel(status) {
  var map = { pending_quote:'待报价', pending_agree:'待同意', pending_confirm:'待确认', pending_home:'待上门', pending_shop:'待到店', in_progress:'服务中', completed:'已完成', cancelled:'已取消' };
  return map[status] || status;
}

function getDateKey(time) {
  if (!time) return '';
  var d = new Date(time);
  return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
}

function formatDateLabel(time) {
  if (!time) return '';
  var d = new Date(time);
  var now = new Date();
  var todayKey = now.getFullYear() + '-' + now.getMonth() + '-' + now.getDate();
  var dateKey = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
  if (todayKey === dateKey) return '今天';
  var yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  var yKey = yesterday.getFullYear() + '-' + yesterday.getMonth() + '-' + yesterday.getDate();
  if (yKey === dateKey) return '昨天';
  var months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  return months[d.getMonth()] + d.getDate() + '日';
}

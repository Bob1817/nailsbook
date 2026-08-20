const api = require('../../../services/api');

Page({
  data: {
    conversationId: null,
    clientName: '',
    clientAvatar: '',
    clientAvatarFailed: false,
    messages: [],
    groupedMessages: [],
    inputText: '',
    loading: true,
    sending: false,
    scrollToId: '',
    clientId: null,
    chatNavHeight: 64,
    /* 滚动策略 */
    isAtBottom: true,
    /* 键盘 */
    keyboardHeight: 0
  },

  pollingTimer: null,
  _resizeHandler: null,

  onLoad(options) {
    this._pageActive = true;
    this.calcNavHeight();
    const { conversationId, clientName, clientId, clientAvatar } = options;
    this.setData({
      conversationId: conversationId ? parseInt(conversationId) : null,
      clientId: clientId ? parseInt(clientId) : null,
      clientAvatar: clientAvatar ? decodeURIComponent(clientAvatar) : ''
    });
    if (clientName) {
      const name = decodeURIComponent(clientName);
      wx.setNavigationBarTitle({ title: name });
      this.setData({ clientName: name });
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

  onShow() {
    this._pageActive = true;
    if (this._sendFinishedWhileHidden) {
      this.setData({ sending: false, inputText: this._failedDraft || this.data.inputText });
      this._sendFinishedWhileHidden = false;
      this._failedDraft = '';
    }
    this.startPolling();
  },
  onHide() { this._pageActive = false; this.stopPolling(); },
  onUnload() {
    this._pageActive = false;
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
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  },

  /* ===== 消息加载 ===== */
  async loadMessages(showLoading = true, isPolling = false) {
    if (showLoading) this.setData({ loading: true });
    try {
      const reqOpts = isPolling ? { timeout: 10000, silent: true } : {};
      const res = await api.chat.technician.messages({ conversationId: this.data.conversationId }, reqOpts);
      const messages = this.formatMessages(res.messages || res.data || res || []);
      const client = res.client;
      if (client) {
        wx.setNavigationBarTitle({ title: client.nickname || client.phone || '客户' });
        this.setData({
          clientName: client.nickname || client.phone || '客户',
          clientAvatar: client.avatarUrl || '',
          clientAvatarFailed: false
        });
      }
      const isFirst = this.data.messages.length === 0;
      this.setData({ messages, loading: false });
      this.groupByDate();
      api.chat.technician.markRead(this.data.conversationId).catch(() => {});
      if (isFirst || this.data.isAtBottom) {
        this.scrollToBottom(true);
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
      isMe: m.senderType === 'technician',
      isSystem: ['system', 'booking', 'quote', 'order'].includes(m.messageType),
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
        groups.push({ dateKey, dateLabel, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }
    this.setData({ groupedMessages: groups });
  },

  /* ===== 滚动策略 ===== */
  onScroll(e) {
    var d = e.detail;
    var remaining = d.scrollHeight - d.scrollTop - d.clientHeight;
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

  /* ===== 键盘 ===== */
  onKeyboardChange(e) {
    var h = Math.max(0, Math.round(e.detail.height));
    this.setData({ keyboardHeight: h });
    if (h > 0) {
      wx.nextTick(() => this.scrollToBottom(true));
    }
  },

  onInputFocus() {
    /* focus 时如果 keyboardHeight 还没回来，先用 setTimeout 兜底滚底 */
    setTimeout(() => this.scrollToBottom(true), 100);
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

  /* ===== 发送 ===== */
  async sendText() {
    var text = this.data.inputText.trim();
    if (!text || this.data.sending || (!this.data.conversationId && !this.data.clientId)) return;
    this.setData({ sending: true, inputText: '' });
    try {
      var payload = { messageType: 'text', content: text };
      if (this.data.conversationId) payload.conversationId = this.data.conversationId;
      else payload.clientId = this.data.clientId;
      var res = await api.chat.technician.sendMessage(payload);
      if (!this._pageActive) { this._sendFinishedWhileHidden = true; return; }
      if (res.conversationId && !this.data.conversationId) this.setData({ conversationId: res.conversationId });
      if (res.message) {
        var msgs = [...this.data.messages, {
          ...res.message,
          timeStr: formatTime(res.message.createdAt),
          isMe: true,
          isSystem: false,
          isOrderCard: false
        }];
        this.setData({ messages: msgs });
        this.groupByDate();
        this.scrollToBottom(true);
      }
    } catch (err) {
      if (!this._pageActive) { this._failedDraft = text; this._sendFinishedWhileHidden = true; return; }
      wx.showToast({ title: err.message || '发送失败', icon: 'none' });
      this.setData({ inputText: text });
    } finally {
      if (this._pageActive) this.setData({ sending: false });
      else this._sendFinishedWhileHidden = true;
    }
  },

  async sendImage() {
    if (this.data.sending || (!this.data.conversationId && !this.data.clientId)) return;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: async (res) => {
        this.setData({ sending: true });
        try {
          var uploadRes = await api.upload.image(res.tempFiles[0].tempFilePath, 'technician');
          var payload = { messageType: 'image', imageUrl: uploadRes.url };
          if (this.data.conversationId) payload.conversationId = this.data.conversationId;
          else payload.clientId = this.data.clientId;
          var msgRes = await api.chat.technician.sendMessage(payload);
          if (!this._pageActive) { this._sendFinishedWhileHidden = true; return; }
          if (msgRes.conversationId && !this.data.conversationId) this.setData({ conversationId: msgRes.conversationId });
          if (msgRes.message) {
            var msgs = [...this.data.messages, {
              ...msgRes.message,
              timeStr: formatTime(msgRes.message.createdAt),
              isMe: true,
              isSystem: false,
              isOrderCard: false
            }];
            this.setData({ messages: msgs });
            this.groupByDate();
            this.scrollToBottom(true);
          }
        } catch {
          if (this._pageActive) wx.showToast({ title: '图片发送失败', icon: 'none' });
          else this._sendFinishedWhileHidden = true;
        } finally {
          if (this._pageActive) this.setData({ sending: false });
          else this._sendFinishedWhileHidden = true;
        }
      }
    });
  },

  previewImage(e) {
    wx.previewImage({ urls: [e.currentTarget.dataset.url], current: e.currentTarget.dataset.url });
  },

  onClientAvatarError() {
    this.setData({ clientAvatarFailed: true });
  },

  viewOrder(e) {
    var id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/technician/order-detail/index?id=' + id });
  }
});

function formatTime(time) {
  if (!time) return '';
  var d = new Date(time);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
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

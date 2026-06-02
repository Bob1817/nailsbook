const api = require('../../../services/api');

Page({
  data: {
    conversationId: null,
    clientName: '',
    clientAvatar: '',
    messages: [],
    inputText: '',
    loading: true,
    sending: false,
    scrollToId: ''
  },

  pollingTimer: null,

  onLoad(options) {
    const { conversationId, clientName } = options;
    this.setData({
      conversationId: conversationId ? parseInt(conversationId) : null
    });
    if (clientName) {
      const name = decodeURIComponent(clientName);
      wx.setNavigationBarTitle({ title: name });
      this.setData({ clientName: name });
    }
    this.loadMessages();
  },

  onShow() { this.startPolling(); },
  onHide() { this.stopPolling(); },
  onUnload() { this.stopPolling(); },

  startPolling() {
    this.stopPolling();
    this.pollingTimer = setInterval(() => {
      if (this.data.conversationId) this.loadMessages(false);
    }, 3000);
  },

  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  },

  async loadMessages(showLoading = true) {
    if (showLoading) this.setData({ loading: true });
    try {
      const res = await api.chat.messages({ conversationId: this.data.conversationId }, 'technician');
      const messages = (res.messages || res.data || res || [])
        .filter(m => !['quote', 'booking', 'system'].includes(m.messageType))
        .map(m => ({
          ...m,
          timeStr: formatTime(m.createdAt),
          isMe: m.senderType === 'technician'
        }));

      const client = res.client;
      if (client) {
        wx.setNavigationBarTitle({ title: client.nickname || client.phone || '客户' });
        this.setData({ clientName: client.nickname || client.phone || '客户', clientAvatar: client.avatarUrl || '' });
      }

      this.setData({ messages, loading: false });
      api.chat.markRead(this.data.conversationId, 'technician').catch(() => {});
      this.scrollToBottom();
    } catch (err) {
      console.error('Load messages error:', err);
      this.setData({ loading: false });
    }
  },

  scrollToBottom() {
    const msgs = this.data.messages;
    if (msgs.length > 0) {
      this.setData({ scrollToId: `msg-${msgs[msgs.length - 1].id}` });
    }
  },

  onInputChange(e) { this.setData({ inputText: e.detail.value }); },

  async sendText() {
    const text = this.data.inputText.trim();
    if (!text || this.data.sending || !this.data.conversationId) return;

    this.setData({ sending: true, inputText: '' });
    try {
      const res = await api.chat.sendMessage({
        conversationId: this.data.conversationId,
        messageType: 'text',
        content: text
      }, 'technician');

      if (res.message) {
        const msgs = [...this.data.messages, {
          ...res.message,
          timeStr: formatTime(res.message.createdAt),
          isMe: true
        }];
        this.setData({ messages: msgs });
        this.scrollToBottom();
      }
    } catch (err) {
      wx.showToast({ title: err.message || '发送失败', icon: 'none' });
      this.setData({ inputText: text });
    } finally {
      this.setData({ sending: false });
    }
  },

  async sendImage() {
    if (this.data.sending) return;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: async (res) => {
        this.setData({ sending: true });
        try {
          const uploadRes = await api.upload.image(res.tempFiles[0].tempFilePath, 'technician');
          const msgRes = await api.chat.sendMessage({
            conversationId: this.data.conversationId,
            messageType: 'image',
            imageUrl: uploadRes.url
          }, 'technician');

          if (msgRes.message) {
            const msgs = [...this.data.messages, {
              ...msgRes.message,
              timeStr: formatTime(msgRes.message.createdAt),
              isMe: true
            }];
            this.setData({ messages: msgs });
            this.scrollToBottom();
          }
        } catch {
          wx.showToast({ title: '图片发送失败', icon: 'none' });
        } finally {
          this.setData({ sending: false });
        }
      }
    });
  },

  previewImage(e) {
    wx.previewImage({ urls: [e.currentTarget.dataset.url], current: e.currentTarget.dataset.url });
  }
});

function formatTime(time) {
  if (!time) return '';
  const d = new Date(time);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

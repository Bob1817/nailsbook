const api = require('../../../services/api');

Page({
  data: {
    conversationId: null,
    techId: null,
    techName: '',
    techAvatar: '',
    messages: [],
    inputText: '',
    loading: true,
    sending: false,
    scrollToId: ''
  },

  pollingTimer: null,

  onLoad(options) {
    const { conversationId, techId, techName } = options;
    this.setData({
      conversationId: conversationId ? parseInt(conversationId) : null,
      techId: techId ? parseInt(techId) : null
    });

    if (techName) {
      wx.setNavigationBarTitle({ title: decodeURIComponent(techName) });
      this.setData({ techName: decodeURIComponent(techName) });
    }

    this.loadMessages();
  },

  onShow() {
    this.startPolling();
  },

  onHide() {
    this.stopPolling();
  },

  onUnload() {
    this.stopPolling();
  },

  startPolling() {
    this.stopPolling();
    this.pollingTimer = setInterval(() => {
      if (this.data.conversationId) {
        this.loadMessages(false);
      }
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
      if (this.data.conversationId) {
        const res = await api.chat.messages({ conversationId: this.data.conversationId }, 'client');
        const messages = this.formatMessages(res.messages || res.data || res || []);
        const tech = res.technician;
        if (tech) {
          wx.setNavigationBarTitle({ title: tech.name });
          this.setData({ techName: tech.name, techAvatar: tech.avatarUrl || '' });
        }
        this.setData({ messages, loading: false });
        api.chat.markRead(this.data.conversationId, 'client').catch(() => {});
        this.scrollToBottom();
      } else if (this.data.techId) {
        const bindings = wx.getStorageSync('client_bindings') || [];
        const tech = bindings.find(b => b.technician?.id === this.data.techId)?.technician
          || bindings[0]?.technician;
        if (tech) {
          wx.setNavigationBarTitle({ title: tech.name });
          this.setData({ techName: tech.name, techAvatar: tech.avatarUrl || '', loading: false });
        } else {
          this.setData({ loading: false });
        }
      } else {
        this.setData({ loading: false });
      }
    } catch (err) {
      console.error('Load messages error:', err);
      this.setData({ loading: false });
    }
  },

  formatMessages(msgs) {
    return msgs
      .filter(m => !['system', 'quote', 'booking'].includes(m.messageType))
      .map(m => ({
        ...m,
        timeStr: formatTime(m.createdAt),
        isClient: m.senderType === 'client'
      }));
  },

  scrollToBottom() {
    const msgs = this.data.messages;
    if (msgs.length > 0) {
      this.setData({ scrollToId: `msg-${msgs[msgs.length - 1].id}` });
    }
  },

  onInputChange(e) {
    this.setData({ inputText: e.detail.value });
  },

  async sendText() {
    const text = this.data.inputText.trim();
    if (!text || this.data.sending) return;
    if (!this.data.techId && !this.data.conversationId) {
      wx.showToast({ title: '无法发送消息', icon: 'none' });
      return;
    }

    this.setData({ sending: true, inputText: '' });

    try {
      const payload = {
        messageType: 'text',
        content: text
      };
      if (this.data.conversationId) {
        payload.conversationId = this.data.conversationId;
      } else {
        payload.techId = this.data.techId;
      }

      const res = await api.chat.sendMessage(payload, 'client');

      if (res.conversationId && !this.data.conversationId) {
        this.setData({ conversationId: res.conversationId });
      }

      if (res.message) {
        const msgs = [...this.data.messages, {
          ...res.message,
          timeStr: formatTime(res.message.createdAt),
          isClient: true
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
        const filePath = res.tempFiles[0].tempFilePath;
        this.setData({ sending: true });

        try {
          const uploadRes = await api.upload.image(filePath, 'client');
          const payload = {
            messageType: 'image',
            imageUrl: uploadRes.url
          };
          if (this.data.conversationId) {
            payload.conversationId = this.data.conversationId;
          } else {
            payload.techId = this.data.techId;
          }

          const msgRes = await api.chat.sendMessage(payload, 'client');
          if (msgRes.conversationId && !this.data.conversationId) {
            this.setData({ conversationId: msgRes.conversationId });
          }
          if (msgRes.message) {
            const msgs = [...this.data.messages, {
              ...msgRes.message,
              timeStr: formatTime(msgRes.message.createdAt),
              isClient: true
            }];
            this.setData({ messages: msgs });
            this.scrollToBottom();
          }
        } catch (err) {
          wx.showToast({ title: '图片发送失败', icon: 'none' });
        } finally {
          this.setData({ sending: false });
        }
      }
    });
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({ urls: [url], current: url });
  },

  goBooking() {
    wx.navigateTo({ url: '/pages/client/create-order/index' });
  }
});

function formatTime(time) {
  if (!time) return '';
  const d = new Date(time);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

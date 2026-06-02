const api = require('../../../services/api');

Page({
  data: {
    conversations: [],
    loading: true
  },

  onLoad() {
    this.loadConversations();
  },

  onShow() {
    this.loadConversations();
  },

  async loadConversations() {
    this.setData({ loading: true });
    try {
      const res = await api.chat.conversations('technician');
      const list = (res.list || res.data || res || []).map(item => ({
        id: item.id,
        clientId: item.client?.id,
        clientName: item.client?.nickname || item.client?.phone || '客户',
        clientAvatar: item.client?.avatarUrl || '',
        lastMessage: item.lastMessage?.messageType === 'image' ? '[图片]' : (item.lastMessage?.content || ''),
        lastTime: item.lastMessage?.createdAt ? formatTime(item.lastMessage.createdAt) : '',
        unreadCount: item.unreadCount || 0
      }));
      this.setData({ conversations: list, loading: false });
    } catch (err) {
      console.error('Load conversations error:', err);
      this.setData({ loading: false });
    }
  },

  openChat(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/technician/chat-detail/index?conversationId=${id}` });
  },

  onPullDownRefresh() {
    this.loadConversations().finally(() => wx.stopPullDownRefresh());
  }
});

function formatTime(time) {
  const d = new Date(time);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

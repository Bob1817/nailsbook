const api = require('../../services/api');

const CLIENT_TABS = [
  { key: 'home',     icon: 'home', label: '首页',  path: '/pages/client/home/index' },
  { key: 'orders',   icon: 'calendar', label: '预约',  path: '/pages/client/orders/index' },
  { key: 'discover', icon: 'compass', label: '作品',  path: '/pages/client/discover/index' },
  { key: 'chat',     icon: 'chat', label: '消息',  path: '/pages/client/chat/index' },
  { key: 'profile',  icon: 'profile', label: '我的',  path: '/pages/client/profile/index' }
];

const TECHNICIAN_TABS = [
  { key: 'home',      icon: 'home', label: '首页',  path: '/pages/technician/home/index' },
  { key: 'orders',    icon: 'calendar', label: '行程',  path: '/pages/technician/orders/index' },
  { key: 'customers', icon: 'customers', label: '客户',  path: '/pages/technician/customers/index' },
  { key: 'chat',      icon: 'chat', label: '消息',  path: '/pages/technician/chat/index' },
  { key: 'profile',   icon: 'profile', label: '我的',  path: '/pages/technician/profile/index' }
];

Component({
  properties: {
    selected: { type: String, value: 'home' },
    unreadCount: {
      type: Number,
      value: -1,
      observer(value) {
        if (value >= 0) this.setMessageBadge(value);
      }
    }
  },

  data: {
    tabs: [],
    messageBadge: ''
  },

  lifetimes: {
    attached() {
      const role = wx.getStorageSync('role') || 'client';
      const tabs = role === 'technician' ? TECHNICIAN_TABS : CLIENT_TABS;
      const cachedUnreadCount = this.getCachedUnreadCount(role);
      this.setData({ tabs });
      if (cachedUnreadCount > 0) this.setMessageBadge(cachedUnreadCount, role);
      if (this.data.unreadCount < 0) this.refreshUnreadCount();
    }
  },

  pageLifetimes: {
    show() {
      if (this.data.unreadCount < 0) this.refreshUnreadCount();
    }
  },

  methods: {
    getCachedUnreadCount(role) {
      const app = getApp();
      const currentRole = role || app.globalData.role || wx.getStorageSync('role') || 'client';
      const appCount = Number((app.globalData.messageUnreadCounts || {})[currentRole]);
      const storedCount = Number(wx.getStorageSync(`${currentRole}_message_unread_count`));
      return Math.max(0, appCount || 0, storedCount || 0);
    },

    setMessageBadge(count, role) {
      const app = getApp();
      const normalized = Math.max(0, Number(count) || 0);
      const currentRole = role || app.globalData.role || wx.getStorageSync('role') || 'client';
      app.globalData.messageUnreadCounts = Object.assign({}, app.globalData.messageUnreadCounts, { [currentRole]: normalized });
      wx.setStorageSync(`${currentRole}_message_unread_count`, normalized);
      this.setData({ messageBadge: normalized > 99 ? '99+' : (normalized ? String(normalized) : '') });
    },

    refreshUnreadCount() {
      if (this._loadingUnread) return this._loadingUnread;

      const app = getApp();
      const role = app.globalData.role || wx.getStorageSync('role') || 'client';
      const token = app.globalData.token || wx.getStorageSync(`${role}_token`) || wx.getStorageSync('token');
      if (!token) {
        this.setMessageBadge(0);
        return Promise.resolve();
      }

      const request = role === 'technician'
        ? api.chat.technician.conversations({ timeout: 10000, silent: true })
        : api.chat.conversations('client', { timeout: 10000, silent: true });

      this._loadingUnread = request.then((response) => {
        const conversations = Array.isArray(response)
          ? response
          : ((response && (response.list || response.data)) || []);
        const count = conversations.reduce((total, item) => total + (Number(item.unreadCount) || 0), 0);
        this.setMessageBadge(Math.max(count, this.getCachedUnreadCount(role)), role);
      }).catch(() => {}).then(() => {
        this._loadingUnread = null;
      });
      return this._loadingUnread;
    },

    onTabTap(e) {
      const key = e.currentTarget.dataset.key;
      const tab = this.data.tabs.find(t => t.key === key);
      if (!tab || key === this.data.selected) return;

      const app = getApp();
      const role = app.globalData.role || wx.getStorageSync('role') || 'client';
      const token = app.globalData.token || wx.getStorageSync(`${role}_token`) || wx.getStorageSync('token');
      if (!token) {
        wx.navigateTo({ url: '/pages/login/index?redirect=' + encodeURIComponent(tab.path) });
        return;
      }

      wx.reLaunch({ url: tab.path });
    }
  }
});

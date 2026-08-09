const CLIENT_TABS = [
  { key: 'home',     icon: 'home', label: '首页',  path: '/pages/client/home/index' },
  { key: 'orders',   icon: 'calendar', label: '预约',  path: '/pages/client/orders/index' },
  { key: 'discover', icon: 'compass', label: '发现',  path: '/pages/client/discover/index' },
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
    selected: { type: String, value: 'home' }
  },

  data: {
    tabs: []
  },

  lifetimes: {
    attached() {
      const role = wx.getStorageSync('role') || 'client';
      const tabs = role === 'technician' ? TECHNICIAN_TABS : CLIENT_TABS;
      this.setData({ tabs });
    }
  },

  methods: {
    onTabTap(e) {
      const key = e.currentTarget.dataset.key;
      const tab = this.data.tabs.find(t => t.key === key);
      if (!tab || key === this.data.selected) return;

      const app = getApp();
      const token = app.globalData.token || wx.getStorageSync('client_token');
      if (!token && key !== 'discover') {
        wx.navigateTo({ url: '/pages/login/index?redirect=' + encodeURIComponent(tab.path) });
        return;
      }

      wx.reLaunch({ url: tab.path });
    }
  }
});

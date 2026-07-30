var api = require('../../../services/api');

function formatTime(time) {
  if (!time) return '';
  var d = new Date(time);
  var now = new Date();
  var diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) {
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  if (diffDays === 1) return '昨天';
  return (d.getMonth() + 1) + '-' + String(d.getDate()).padStart(2, '0');
}

function getBadgeClass(type) {
  if (type === 'chat') return 'badge-chat';
  if (type === 'booking') return 'badge-booking';
  if (type === 'service') return 'badge-service';
  return 'badge-system';
}

function categorizeNotification(m) {
  if (m.messageType === 'booking' || m.relatedType === 'booking') return 'booking';
  if (m.content && (m.content.indexOf('即将开始') >= 0 || m.content.indexOf('服务完成') >= 0)) return 'service';
  return 'system';
}

function getNotificationName(type) {
  if (type === 'booking') return '预约提醒';
  if (type === 'service') return '服务提醒';
  return '系统通知';
}

var TAB_LIST = [
  { value: 'unread', label: '未读' },
  { value: 'all', label: '全部' },
  { value: 'chat', label: '聊天' },
  { value: 'booking', label: '预约提醒' },
  { value: 'service', label: '服务提醒' },
  { value: 'system', label: '系统通知' }
];

Page({
  data: {
    allItems: [],
    filteredItems: [],
    activeTab: 'all',
    tabs: [],
    unreadCount: 0,
    loading: true,
    loadFailed: false,
    selectedNotification: null
  },

  onLoad: function() {
    this.loadInbox();
  },

  onShow: function() {
    if (this._loaded) this.loadInbox();
  },

  onPullDownRefresh: function() {
    var self = this;
    this.loadInbox().then(function() {
      wx.stopPullDownRefresh();
    }).catch(function() {
      wx.stopPullDownRefresh();
    });
  },

  loadInbox: function() {
    var self = this;
    self.setData({ loading: true, loadFailed: false });
    self._loaded = true;

    return api.chat.conversations('client', { timeout: 15000, silent: true }).then(function(conversations) {
      var convList = [];
      if (Array.isArray(conversations)) {
        convList = conversations;
      } else if (conversations && conversations.list) {
        convList = conversations.list;
      } else if (conversations && conversations.data) {
        convList = conversations.data;
      }

      var chatItems = [];
      for (var i = 0; i < convList.length; i++) {
        var c = convList[i];
        var tech = c.technician || {};
        var last = c.lastMessage || {};
        var preview = '';
        if (last.messageType === 'image') {
          preview = '[图片]';
        } else if (last.content) {
          preview = last.content;
        } else {
          preview = '点击进入会话，开始一对一沟通';
        }
        chatItems.push({
          id: 'chat-' + c.id,
          type: 'chat',
          name: tech.name || '美甲师',
          preview: preview,
          time: last.createdAt || new Date().toISOString(),
          unread: (c.unreadCount || 0) > 0,
          unreadCount: c.unreadCount || 0,
          conversationId: c.id,
          techId: tech.id,
          techName: tech.name || '美甲师',
          techAvatar: tech.avatarUrl || '',
          badge: '聊天',
          _avatarChar: (tech.name || '美')[0]
        });
      }

      var unreadCount = 0;
      for (var u = 0; u < chatItems.length; u++) {
        if (chatItems[u].unread) unreadCount++;
      }

      for (var t = 0; t < chatItems.length; t++) {
        chatItems[t]._timeText = formatTime(chatItems[t].time);
        chatItems[t]._badgeClass = getBadgeClass(chatItems[t].type);
      }

      var tabs = [];
      for (var w = 0; w < TAB_LIST.length; w++) {
        var tabDef = TAB_LIST[w];
        var show = true;
        if (tabDef.value === 'unread' && unreadCount <= 0) show = false;
        if (tabDef.value === 'booking') show = false;
        if (tabDef.value === 'service') show = false;
        if (tabDef.value === 'system') show = false;
        if (show) {
          var count = 0;
          if (tabDef.value === 'unread') count = unreadCount;
          else if (tabDef.value === 'all') count = chatItems.length;
          else if (tabDef.value === 'chat') count = chatItems.length;
          tabs.push({ value: tabDef.value, label: tabDef.label, count: count });
        }
      }

      self.setData({
        allItems: chatItems,
        tabs: tabs,
        unreadCount: unreadCount,
        loading: false,
        loadFailed: false
      });
      self._applyFilter();
    }).catch(function(err) {
      console.error('Load inbox error:', err);
      self.setData({ loading: false, loadFailed: true });
    });
  },

  _applyFilter: function() {
    var allItems = this.data.allItems;
    var activeTab = this.data.activeTab;
    var filtered = [];
    for (var i = 0; i < allItems.length; i++) {
      var item = allItems[i];
      if (activeTab === 'unread' && !item.unread) continue;
      if (activeTab !== 'all' && activeTab !== 'unread' && item.type !== activeTab) continue;
      filtered.push(item);
    }
    this.setData({ filteredItems: filtered });
  },

  onTabChange: function(e) {
    var tab = e.currentTarget.dataset.tab;
    if (tab === this.data.activeTab) return;
    this.setData({ activeTab: tab });
    this._applyFilter();
  },

  onItemClick: function(e) {
    var index = e.currentTarget.dataset.index;
    var item = this.data.filteredItems[index];
    if (!item) return;

    if (item.type === 'chat') {
      wx.navigateTo({ url: '/pages/client/chat-detail/index?conversationId=' + item.conversationId });
    } else {
      this.setData({ selectedNotification: item });
    }
  },

  closeNotification: function() {
    var self = this;
    var selected = self.data.selectedNotification;
    if (selected && selected.unread) {
      api.chat.markRead(selected.conversationId, 'client').catch(function() {});
      var allItems = self.data.allItems;
      var updated = [];
      for (var i = 0; i < allItems.length; i++) {
        var n = allItems[i];
        if (n.id === selected.id) {
          updated.push(Object.assign({}, n, { unread: false, unreadCount: 0 }));
        } else {
          updated.push(n);
        }
      }
      var unreadCount = 0;
      for (var j = 0; j < updated.length; j++) {
        if (updated[j].unread) unreadCount++;
      }
      self.setData({ allItems: updated, unreadCount: unreadCount, selectedNotification: null });
      self._applyFilter();
      self._rebuildTabs();
    } else {
      self.setData({ selectedNotification: null });
    }
  },

  _rebuildTabs: function() {
    var allItems = this.data.allItems;
    var unreadCount = this.data.unreadCount;
    var hasBooking = false, hasService = false, hasSystem = false;
    for (var i = 0; i < allItems.length; i++) {
      if (allItems[i].type === 'booking') hasBooking = true;
      if (allItems[i].type === 'service') hasService = true;
      if (allItems[i].type === 'system') hasSystem = true;
    }
    var tabs = [];
    for (var w = 0; w < TAB_LIST.length; w++) {
      var tabDef = TAB_LIST[w];
      var show = true;
      if (tabDef.value === 'unread' && unreadCount <= 0) show = false;
      if (tabDef.value === 'booking' && !hasBooking) show = false;
      if (tabDef.value === 'service' && !hasService) show = false;
      if (tabDef.value === 'system' && !hasSystem) show = false;
      if (show) {
        var count = 0;
        if (tabDef.value === 'unread') count = unreadCount;
        else if (tabDef.value === 'all') count = allItems.length;
        else {
          for (var c = 0; c < allItems.length; c++) {
            if (allItems[c].type === tabDef.value) count++;
          }
        }
        tabs.push({ value: tabDef.value, label: tabDef.label, count: count });
      }
    }
    this.setData({ tabs: tabs });
  },

  viewRelatedOrder: function() {
    var selected = this.data.selectedNotification;
    if (selected && selected.relatedId) {
      this.setData({ selectedNotification: null });
      wx.navigateTo({ url: '/pages/client/order-detail/index?id=' + selected.relatedId });
    }
  },

  viewRelatedWork: function() {
    var selected = this.data.selectedNotification;
    if (selected && selected.relatedId) {
      this.setData({ selectedNotification: null });
      wx.navigateTo({ url: '/pages/client/work-detail/index?id=' + selected.relatedId });
    }
  },

  noop: function() {}
});

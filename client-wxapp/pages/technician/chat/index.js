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

function categorizeNotification(m) {
  if (m.messageType === 'booking' || m.relatedType === 'booking') return 'pending';
  if (m.content && (m.content.indexOf('即将开始') >= 0 || m.content.indexOf('服务完成') >= 0)) return 'service';
  return 'system';
}

function getNotificationName(type) {
  if (type === 'pending') return '待确认预约';
  if (type === 'service') return '服务提醒';
  return '系统通知';
}

function getBadgeClass(type) {
  if (type === 'chat') return 'badge-chat';
  if (type === 'pending') return 'badge-pending';
  if (type === 'service') return 'badge-service';
  return 'badge-system';
}

function getAvatarBgClass(type) {
  if (type === 'chat') return 'avatar-chat';
  if (type === 'pending') return 'avatar-pending';
  if (type === 'service') return 'avatar-service';
  return 'avatar-system';
}

var TAB_LIST = [
  { value: 'unread', label: '未读' },
  { value: 'all', label: '全部' },
  { value: 'chat', label: '聊天' },
  { value: 'pending', label: '待确认预约' },
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
    searchText: '',
    selectedNotification: null,
    showNewChat: false,
    customers: [],
    filteredCustomers: [],
    customerSearch: '',
    customerLoading: true,
    customerLoadFailed: false
  },

  onLoad: function() {
    this.loadInbox();
    this.loadCustomers();
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

    return api.chat.technician.conversations({ timeout: 15000, silent: true }).then(function(conversations) {
      var convList = [];
      if (Array.isArray(conversations)) convList = conversations;
      else if (conversations && conversations.list) convList = conversations.list;
      else if (conversations && conversations.data) convList = conversations.data;

      // Build chat items
      var chatItems = [];
      for (var i = 0; i < convList.length; i++) {
        var c = convList[i];
        var client = c.client || {};
        var last = c.lastMessage || {};
        var preview = '';
        if (last.messageType === 'image') preview = '[图片]';
        else if (last.content) preview = last.content;
        else preview = '点击进入会话，开始沟通';

        var clientName = client.nickname || client.phone || '客户';
        chatItems.push({
          id: 'chat-' + c.id,
          type: 'chat',
          name: clientName,
          preview: preview,
          time: last.createdAt || new Date().toISOString(),
          unread: (c.unreadCount || 0) > 0,
          unreadCount: c.unreadCount || 0,
          conversationId: c.id,
          clientId: client.id,
          clientName: clientName,
          clientAvatar: client.avatarUrl || '',
          badge: '聊天',
          _avatarChar: clientName[0] || '客',
          _avatarBgClass: 'avatar-chat',
          _actionLabel: '',
          _actionClass: ''
        });
      }

      // Fetch messages to extract notifications
      var notifItems = [];
      var msgResults = [];
      var fetchPromises = [];
      for (var j = 0; j < convList.length; j++) {
        (function(idx) {
          var p = api.chat.technician.messages({ conversation_id: convList[idx].id }, { timeout: 10000, silent: true }).then(function(res) {
            msgResults.push({ conv: convList[idx], res: res });
          }).catch(function() {});
          fetchPromises.push(p);
        })(j);
      }

      return Promise.all(fetchPromises).then(function() {
        for (var k = 0; k < msgResults.length; k++) {
          var conv = msgResults[k].conv;
          var msgData = msgResults[k].res;
          var messages = msgData.messages || msgData || [];
          var client2 = conv.client || {};
          var clientName2 = client2.nickname || client2.phone || '客户';

          for (var n = 0; n < messages.length; n++) {
            var m = messages[n];
            var isNotifType = m.messageType === 'system' || m.messageType === 'booking' || m.messageType === 'quote' || m.messageType === 'order';
            var isNotifRelated = m.relatedType === 'order' || m.relatedType === 'booking' || m.relatedType === 'comment' || m.relatedType === 'work_comment' || m.relatedType === 'binding' || m.relatedType === 'service_review';
            if (isNotifType && isNotifRelated) {
              var nType = categorizeNotification(m);
              var actionLabel = '';
              var actionClass = '';
              if (nType === 'pending') { actionLabel = '去确认'; actionClass = 'action-pending'; }
              else if (nType === 'service') { actionLabel = '查看行程'; actionClass = 'action-service'; }
              else { actionLabel = '查看预约'; actionClass = 'action-system'; }

              notifItems.push({
                id: 'notif-' + conv.id + '-' + m.id,
                type: nType,
                name: m.relatedType === 'service_review' ? '客户评价' : getNotificationName(nType),
                preview: m.content || '系统通知',
                time: m.createdAt,
                unread: !m.isRead,
                unreadCount: m.isRead ? 0 : 1,
                conversationId: conv.id,
                clientId: client2.id,
                clientName: clientName2,
                clientAvatar: client2.avatarUrl || '',
                relatedType: m.relatedType,
                relatedId: m.relatedId,
                badge: getNotificationName(nType),
                _avatarChar: clientName2[0] || '客',
                _avatarBgClass: getAvatarBgClass(nType),
                _actionLabel: m.relatedType === 'service_review' ? '查看评价' : actionLabel,
                _actionClass: actionClass
              });
            }
          }
        }

        // Merge and sort
        var allItems = chatItems.concat(notifItems);
        allItems.sort(function(a, b) {
          return new Date(b.time).getTime() - new Date(a.time).getTime();
        });

        var unreadCount = 0;
        for (var u = 0; u < allItems.length; u++) {
          allItems[u]._timeText = formatTime(allItems[u].time);
          allItems[u]._badgeClass = getBadgeClass(allItems[u].type);
          if (allItems[u].unread) unreadCount++;
        }

        // Auto-select unread tab if there are unread items
        var activeTab = self.data.activeTab;
        if (!self._tabInitialized) {
          activeTab = unreadCount > 0 ? 'unread' : 'all';
          self._tabInitialized = true;
        }

        // Build tabs
        var hasPending = false, hasService = false, hasSystem = false;
        for (var v = 0; v < allItems.length; v++) {
          if (allItems[v].type === 'pending') hasPending = true;
          if (allItems[v].type === 'service') hasService = true;
          if (allItems[v].type === 'system') hasSystem = true;
        }

        var tabs = [];
        for (var w = 0; w < TAB_LIST.length; w++) {
          var tabDef = TAB_LIST[w];
          var show = true;
          if (tabDef.value === 'unread' && unreadCount <= 0) show = false;
          if (tabDef.value === 'pending' && !hasPending) show = false;
          if (tabDef.value === 'service' && !hasService) show = false;
          if (tabDef.value === 'system' && !hasSystem) show = false;
          if (show) {
            var count = 0;
            if (tabDef.value === 'unread') count = unreadCount;
            else if (tabDef.value === 'all') count = allItems.length;
            else {
              for (var c2 = 0; c2 < allItems.length; c2++) {
                if (allItems[c2].type === tabDef.value) count++;
              }
            }
            tabs.push({ value: tabDef.value, label: tabDef.label, count: count });
          }
        }

        self.setData({
          allItems: allItems,
          tabs: tabs,
          unreadCount: unreadCount,
          loading: false,
          loadFailed: false,
          activeTab: activeTab
        });
        self._applyFilter();
      });
    }).catch(function(err) {
      console.error('Load inbox error:', err);
      self.setData({ loading: false, loadFailed: true });
    });
  },

  _applyFilter: function() {
    var allItems = this.data.allItems;
    var activeTab = this.data.activeTab;
    var searchText = this.data.searchText.toLowerCase();
    var filtered = [];
    for (var i = 0; i < allItems.length; i++) {
      var item = allItems[i];
      if (activeTab === 'unread' && !item.unread) continue;
      if (activeTab !== 'all' && activeTab !== 'unread' && item.type !== activeTab) continue;
      if (searchText && item.name.toLowerCase().indexOf(searchText) < 0 && item.preview.toLowerCase().indexOf(searchText) < 0) continue;
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

  onSearchInput: function(e) {
    this.setData({ searchText: e.detail.value });
    this._applyFilter();
  },

  onItemClick: function(e) {
    var index = e.currentTarget.dataset.index;
    var item = this.data.filteredItems[index];
    if (!item) return;

    if (item.relatedType === 'binding') {
      api.chat.technician.markRead(item.conversationId).catch(function() {});
      wx.navigateTo({ url: '/pages/technician/binding-applications/index' });
    } else if (item.relatedType === 'service_review') {
      api.chat.technician.markRead(item.conversationId).catch(function() {});
      wx.navigateTo({ url: '/pages/technician/order-detail/index?id=' + item.relatedId });
    } else if (item.type === 'chat') {
      wx.navigateTo({
        url: '/pages/technician/chat-detail/index?conversationId=' + item.conversationId
          + '&clientName=' + encodeURIComponent(item.clientName || item.name || '')
          + '&clientAvatar=' + encodeURIComponent(item.clientAvatar || '')
      });
    } else {
      // Mark as read
      if (item.unread) {
        api.chat.technician.markRead(item.conversationId).catch(function() {});
        var allItems = this.data.allItems;
        var updated = [];
        for (var i = 0; i < allItems.length; i++) {
          if (allItems[i].id === item.id) {
            updated.push(Object.assign({}, allItems[i], { unread: false, unreadCount: 0 }));
          } else {
            updated.push(allItems[i]);
          }
        }
        var unreadCount = 0;
        for (var j = 0; j < updated.length; j++) {
          if (updated[j].unread) unreadCount++;
        }
        this.setData({ allItems: updated, unreadCount: unreadCount, selectedNotification: Object.assign({}, item, { unread: false, unreadCount: 0 }) });
        this._applyFilter();
        this._rebuildTabs();
      } else {
        this.setData({ selectedNotification: item });
      }
    }
  },

  closeNotification: function() {
    this.setData({ selectedNotification: null });
  },

  _rebuildTabs: function() {
    var allItems = this.data.allItems;
    var unreadCount = this.data.unreadCount;
    var hasPending = false, hasService = false, hasSystem = false;
    for (var i = 0; i < allItems.length; i++) {
      if (allItems[i].type === 'pending') hasPending = true;
      if (allItems[i].type === 'service') hasService = true;
      if (allItems[i].type === 'system') hasSystem = true;
    }
    var tabs = [];
    for (var w = 0; w < TAB_LIST.length; w++) {
      var tabDef = TAB_LIST[w];
      var show = true;
      if (tabDef.value === 'unread' && unreadCount <= 0) show = false;
      if (tabDef.value === 'pending' && !hasPending) show = false;
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
      wx.navigateTo({ url: '/pages/technician/order-detail/index?id=' + selected.relatedId });
    }
  },

  viewBindingApplications: function() {
    this.setData({ selectedNotification: null });
    wx.navigateTo({ url: '/pages/technician/binding-applications/index' });
  },

  // ---- 新建对话 ----
  loadCustomers: function() {
    var self = this;
    self.setData({ customerLoading: true, customerLoadFailed: false });
    api.technician.customers.list().then(function(res) {
      var list = [];
      if (Array.isArray(res)) list = res;
      else if (res && res.list) list = res.list;
      else if (res && res.data) list = res.data;

      var customers = [];
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        var name = c.nickname || c.name || c.phone || '客户';
        customers.push({
          id: c.id,
          name: name,
          phone: c.phone || '',
          _avatarChar: name[0] || '客',
          hasConversation: false
        });
      }
      self.setData({ customers: customers, filteredCustomers: customers, customerLoading: false, customerLoadFailed: false });
    }).catch(function() {
      self.setData({ customerLoading: false, customerLoadFailed: true });
    });
  },

  openNewChat: function() {
    // Mark customers with existing conversations
    var customers = this.data.customers.slice();
    var allItems = this.data.allItems;
    for (var i = 0; i < customers.length; i++) {
      var hasConv = false;
      for (var j = 0; j < allItems.length; j++) {
        if (allItems[j].type === 'chat' && allItems[j].clientId === customers[i].id) {
          hasConv = true;
          break;
        }
      }
      customers[i].hasConversation = hasConv;
    }
    this.setData({ showNewChat: true, customers: customers, filteredCustomers: customers, customerSearch: '' });
  },

  closeNewChat: function() {
    this.setData({ showNewChat: false });
  },

  onCustomerSearch: function(e) {
    var keyword = e.detail.value.toLowerCase();
    var customers = this.data.customers;
    if (!keyword) {
      this.setData({ filteredCustomers: customers, customerSearch: '' });
      return;
    }
    var filtered = [];
    for (var i = 0; i < customers.length; i++) {
      if (customers[i].name.toLowerCase().indexOf(keyword) >= 0 || customers[i].phone.indexOf(keyword) >= 0) {
        filtered.push(customers[i]);
      }
    }
    this.setData({ filteredCustomers: filtered, customerSearch: e.detail.value });
  },

  selectCustomer: function(e) {
    var index = e.currentTarget.dataset.index;
    var customer = this.data.filteredCustomers[index];
    if (!customer) return;
    this.setData({ showNewChat: false });
    // Find existing conversation or create new one
    var allItems = this.data.allItems;
    for (var i = 0; i < allItems.length; i++) {
      if (allItems[i].type === 'chat' && allItems[i].clientId === customer.id) {
        wx.navigateTo({ url: '/pages/technician/chat-detail/index?conversationId=' + allItems[i].conversationId });
        return;
      }
    }
    wx.navigateTo({ url: '/pages/technician/chat-detail/index?clientId=' + customer.id + '&clientName=' + encodeURIComponent(customer.name) });
  },

  noop: function() {}
});

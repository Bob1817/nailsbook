Component({
  properties: {
    type: { type: String, value: 'empty' },
    icon: { type: String, value: '' },
    title: { type: String, value: '' },
    description: { type: String, value: '' },
    actionText: { type: String, value: '' },
    actionVariant: { type: String, value: 'primary' },
    secondaryActionText: { type: String, value: '' },
    compact: { type: Boolean, value: false },
    fullHeight: { type: Boolean, value: false }
  },

  data: {
    displayTitle: '',
    displayDescription: '',
    resolvedIcon: '',
    displayActionText: ''
  },

  observers: {
    'type, icon, title, description, actionText': function(type, icon, title, description, actionText) {
      let resolvedIcon = icon || '';
      let displayTitle = title || '';
      let displayDescription = description || '';
      let displayActionText = actionText || '';

      if (type === 'loading') {
        resolvedIcon = '';
        displayTitle = title || '正在加载…';
        displayActionText = '';
      } else if (type === 'error') {
        if (!displayTitle) displayTitle = '加载失败';
        if (!displayDescription) displayDescription = '请检查网络连接后重试';
        if (!resolvedIcon) resolvedIcon = '/static/icons/info.svg';
        if (actionText === undefined || actionText === '') displayActionText = '重新加载';
      } else if (type === 'search-empty') {
        if (!displayTitle) displayTitle = '没有找到相关内容';
        if (!displayDescription) displayDescription = '换个关键词或筛选条件试试';
        if (!resolvedIcon) resolvedIcon = '/static/icons/search.svg';
      } else if (type === 'offline') {
        if (!displayTitle) displayTitle = '网络连接异常';
        if (!displayDescription) displayDescription = '请检查网络设置后重试';
        if (!resolvedIcon) resolvedIcon = '/static/icons/unlink.svg';
        if (actionText === undefined || actionText === '') displayActionText = '重新连接';
      } else {
        // empty / custom
        if (!displayTitle) displayTitle = '暂无内容';
        if (!resolvedIcon) resolvedIcon = '/static/icons/document.svg';
      }

      this.setData({
        displayTitle,
        displayDescription,
        resolvedIcon,
        displayActionText
      });
    }
  },

  methods: {
    onAction() {
      this.triggerEvent('action');
      if (this.properties.type === 'error' || this.properties.type === 'offline') {
        this.triggerEvent('retry');
      }
    },

    onSecondaryAction() {
      this.triggerEvent('secondaryaction');
    }
  }
});

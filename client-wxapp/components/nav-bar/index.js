// 模块级缓存：wx.getSystemInfoSync 和 getMenuButtonBoundingClientRect
// 在同一设备上结果不变，只需计算一次
let _navBarInfoCache = null;
const { goHome } = require('../../utils/entry-navigation');
function getNavBarInfo() {
  if (!_navBarInfoCache) {
    const si = wx.getSystemInfoSync();
    const mb = wx.getMenuButtonBoundingClientRect();
    _navBarInfoCache = {
      statusBarHeight: si.statusBarHeight,
      menuButtonHeight: mb.height,
      menuButtonTop: mb.top,
      menuButtonRightOffset: si.windowWidth - mb.left,
      navBarHeight: mb.top + mb.height + (mb.top - si.statusBarHeight)
    };
  }
  return _navBarInfoCache;
}

Component({
  options: {
    multipleSlots: true
  },

  properties: {
    title: {
      type: String,
      value: ''
    },
    subtitle: {
      type: String,
      value: ''
    },
    showBack: {
      type: Boolean,
      value: false
    },
    backUrl: {
      type: String,
      value: ''
    },
    customBack: {
      type: Boolean,
      value: false
    },
    transparent: {
      type: Boolean,
      value: false
    },
    light: {
      type: Boolean,
      value: false
    },
    titleCenter: {
      type: Boolean,
      value: false
    },
    backTitleLeft: {
      type: Boolean,
      value: false
    }
  },

  data: {
    hasHistory: false,
    statusBarHeight: 0,
    navBarHeight: 0,
    menuButtonHeight: 0,
    menuButtonTop: 0,
    menuButtonRightOffset: 0
  },

  lifetimes: {
    attached() {
      const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
      this.setData({ ...getNavBarInfo(), hasHistory: pages.length > 1 });
    }
  },

  pageLifetimes: {
    show() {
      const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
      this.setData({ hasHistory: pages.length > 1 });
    }
  },

  methods: {
    onBack() {
      this.triggerEvent('back');
    },
    navigateBack() {
      const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
      if (pages.length > 1) {
        wx.navigateBack({ delta: 1, fail: () => this.goSafeHome() });
        return;
      }
      this.goSafeHome();
    },
    goSafeHome() {
      goHome();
    }
  }
});

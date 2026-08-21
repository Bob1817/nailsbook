// 模块级缓存：wx.getSystemInfoSync 和 getMenuButtonBoundingClientRect
// 在同一设备上结果不变，只需计算一次
let _navBarInfoCache = null;
function getNavBarInfo() {
  if (!_navBarInfoCache) {
    const si = wx.getSystemInfoSync();
    const mb = wx.getMenuButtonBoundingClientRect();
    _navBarInfoCache = {
      statusBarHeight: si.statusBarHeight,
      menuButtonHeight: mb.height,
      menuButtonTop: mb.top,
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
    }
  },

  data: {
    statusBarHeight: 0,
    navBarHeight: 0,
    menuButtonHeight: 0,
    menuButtonTop: 0
  },

  lifetimes: {
    attached() {
      this.setData(getNavBarInfo());
    }
  },

  methods: {
    onBack() {
      this.triggerEvent('back');
    }
  }
});

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
      value: 'NailArt'
    },
    showBack: {
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
      const systemInfo = wx.getSystemInfoSync();
      const menuButton = wx.getMenuButtonBoundingClientRect();
      
      this.setData({
        statusBarHeight: systemInfo.statusBarHeight,
        menuButtonHeight: menuButton.height,
        menuButtonTop: menuButton.top,
        navBarHeight: menuButton.top + menuButton.height + (menuButton.top - systemInfo.statusBarHeight)
      });
    }
  },

  methods: {
    onBack() {
      wx.navigateBack();
    }
  }
});

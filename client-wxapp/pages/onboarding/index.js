const { consumePostAuthRedirect, normalizeInternalPath } = require('../../utils/artist-navigation');
const { startClientGuide } = require('../../utils/onboarding-plan');

// Compatibility bridge for registration routes. Guidance lives in the working pages.
Page({
  data: { failed: false },
  onLoad(options = {}) {
    const technician = options.role === 'technician';
    let redirect = '';
    try { redirect = normalizeInternalPath(decodeURIComponent(options.redirect || '')); } catch (_) {}
    if (!technician) startClientGuide();
    this.destination = technician ? '/pages/technician/home/index'
      : consumePostAuthRedirect(redirect || '/pages/client/home/index');
    this.enter();
  },
  enter() {
    this.setData({ failed: false });
    wx.reLaunch({ url: this.destination, fail: () => this.setData({ failed: true }) });
  }
});

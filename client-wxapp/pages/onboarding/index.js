const { consumePostAuthRedirect, normalizeInternalPath } = require('../../utils/artist-navigation');
const {
  normalizeOnboardingRole,
  getOnboardingPlan,
  getOnboardingCompletionKey
} = require('../../utils/onboarding-plan');

Page({
  data: {
    role: 'client',
    roleLabel: '客户',
    navigationTitle: '客户使用引导',
    currentIndex: 0,
    stepCount: 0,
    step: {},
    isFirst: true,
    isLast: false,
    primaryLabel: '下一步',
    navigating: false
  },

  onLoad(options = {}) {
    const role = normalizeOnboardingRole(options.role);
    this.plan = getOnboardingPlan(role);
    this.redirect = normalizeInternalPath(options.redirect ? decodeURIComponent(options.redirect) : '');
    this.setData({
      role,
      roleLabel: this.plan.roleLabel,
      navigationTitle: this.plan.navigationTitle,
      stepCount: this.plan.steps.length
    });
    this._showStep(0);
  },

  _showStep(index) {
    const safeIndex = Math.max(0, Math.min(index, this.plan.steps.length - 1));
    const isLast = safeIndex === this.plan.steps.length - 1;
    this.setData({
      currentIndex: safeIndex,
      step: this.plan.steps[safeIndex],
      isFirst: safeIndex === 0,
      isLast,
      primaryLabel: isLast ? this.plan.finishLabel : '下一步'
    });
  },

  previousStep() {
    if (this.data.navigating || this.data.isFirst) return;
    this._showStep(this.data.currentIndex - 1);
  },

  nextStep() {
    if (this.data.navigating) return;
    if (this.data.isLast) {
      this.finishOnboarding();
      return;
    }
    this._showStep(this.data.currentIndex + 1);
  },

  skipOnboarding() {
    this._completeOnboarding(true);
  },

  finishOnboarding() {
    this._completeOnboarding(false);
  },

  _completeOnboarding(skipped) {
    if (this.data.navigating) return;
    this.setData({ navigating: true });
    wx.setStorageSync(getOnboardingCompletionKey(this.data.role), {
      completedAt: Date.now(),
      skipped: !!skipped
    });
    const destination = this.data.role === 'client'
      ? consumePostAuthRedirect(this.redirect || this.plan.destination)
      : this.plan.destination;
    wx.reLaunch({ url: destination });
  }
});

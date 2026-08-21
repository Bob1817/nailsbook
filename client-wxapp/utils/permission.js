/**
 * 权限检查工具
 *
 * 用于游客美甲师的权限校验：
 * - 游客可以浏览（GET），但不能写操作（POST/PUT/PATCH/DELETE）
 * - 激活后（设置密码）即可解除限制
 */

/**
 * 获取当前是否为游客模式
 */
function isTourist() {
  return getApp().getIsTourist();
}

/**
 * 检查是否为游客美甲师
 * 仅在当前 role === 'technician' 且 isTourist === true 时返回 true
 */
function isTouristTechnician() {
  const app = getApp();
  return app.globalData.role === 'technician' && app.getIsTourist();
}

/**
 * 游客拦截：如果是游客，弹出提示并阻止操作
 * @param {string} actionName - 操作名称（用于提示文案），如"发布作品"
 * @returns {boolean} true 表示被拦截（应停止操作），false 表示可继续
 */
function guardTourist(actionName) {
  if (isTouristTechnician()) {
    wx.showModal({
      title: '游客模式限制',
      content: `游客模式下无法${actionName}，请先激活美甲师账户`,
      showCancel: false,
      confirmText: '去激活',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/technician/activate/index' });
        }
      }
    });
    return true; // 被拦截
  }
  return false; // 可继续
}

/**
 * 轻量游客提示（Toast，不阻断流程）
 * @param {string} actionName - 操作名称
 * @returns {boolean} true 表示是游客
 */
function toastIfTourist(actionName) {
  if (isTouristTechnician()) {
    wx.showToast({
      title: `游客模式下无法${actionName}`,
      icon: 'none',
      duration: 2000
    });
    return true;
  }
  return false;
}

module.exports = {
  isTourist,
  isTouristTechnician,
  guardTourist,
  toastIfTourist
};

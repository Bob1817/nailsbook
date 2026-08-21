const api = require('../services/api');

function getLoginCode() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (result) => result.code
        ? resolve(result.code)
        : reject(new Error('未获取到微信登录凭证')),
      fail: () => reject(new Error('微信登录失败'))
    });
  });
}

async function silentWechatLogin(role) {
  const code = await getLoginCode();
  const result = await api.auth.wechatLogin(code, role);
  if (result.wechatSessionToken) {
    wx.setStorageSync('wechat_session_token', result.wechatSessionToken);
  }
  return result;
}

module.exports = { silentWechatLogin };

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const api = fs.readFileSync(path.join(__dirname, '..', 'services/api.js'), 'utf8');

assert(api.includes("wx.getStorageSync(`${role}_token`)"), '上传必须读取当前上传身份对应的令牌');
assert(api.includes("currentRole === role ? app.globalData.token : ''"), '上传不得回退使用另一身份的全局令牌');
assert(api.includes("message:role === 'technician' ? '美甲师登录状态已失效，请重新登录'"), '缺少美甲师令牌时必须在发起上传前给出明确错误');
assert(api.includes('uploadFile 合法域名'), '域名校验拦截时必须指出需要配置 uploadFile 合法域名');
assert(api.includes('timeout: 30000'), '图片上传必须设置超时边界');

console.log('图片上传身份隔离、域名提示与超时检查通过');

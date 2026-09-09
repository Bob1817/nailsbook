// Read-only inventory: imports indicate adoption, not visual acceptance.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
const routes = [...app.pages, ...app.subPackages.flatMap(pkg => pkg.pages.map(page => pkg.root + '/' + page))];
console.log('# 已注册页面治理清单\n');
console.log('以 app.json 为准，共 ' + routes.length + ' 页。导入公共样式不等于整页完成；未导入不等于存在缺陷。\n');
console.log('本表为静态接入清单，视觉和真机状态需要逐页验收，不能由脚本推断。\n');
console.log('| 页面 | 公共按钮 | 公共表单 | 导航 | 视觉／真机 |\n|---|---|---|---|---|');
for (const route of routes) {
  const css = fs.readFileSync(path.join(root, route + '.wxss'), 'utf8');
  const wxml = fs.readFileSync(path.join(root, route + '.wxml'), 'utf8');
  console.log('| ' + route + ' | ' + (css.includes('booking-actions.wxss') ? '已接入' : '待核对其他组件') + ' | ' + (css.includes('booking-form.wxss') ? '已接入' : '待核对本地样式') + ' | ' + (wxml.includes('<nav-bar') ? 'nav-bar' : '其他／原生') + ' | 待逐页验收 |');
}
console.log('\n推荐基金与宣传物料页面已纳入注册页面清单；业务闭环仍以实际验收为准。');

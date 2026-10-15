const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const homepageJs = read('pages/technician/homepage-settings/index.js');
const homepageWxml = read('pages/technician/homepage-settings/index.wxml');
assert(homepageJs.includes('refreshCompletion()'));
assert(homepageWxml.includes('主页完善度'));
for (const label of ['主页形象', '专业介绍', '服务项目', '服务地点', '精选作品', '公开主页']) {
  assert(homepageJs.includes(`label:'${label}'`), `主页完善度缺少 ${label}`);
}

const profileJs = read('pages/technician/profile/index.js');
const profileWxml = read('pages/technician/profile/index.wxml');
assert(profileWxml.includes('经营成长路径'));
for (const label of ['建立个人品牌', '管理并宣传作品', '管理客户与预约']) {
  assert(profileJs.includes(`label: '${label}'`), `经营成长路径缺少 ${label}`);
}

const customers = read('pages/technician/customers/index.wxml');
assert(customers.includes('邀请客户后会直接建立关系，无需审批'));
assert(customers.includes('客户提交预约后，你完成报价，客户确认即创建预约'));

const workEditor = read('pages/technician/work-edit/index.js');
assert(workEditor.includes("title: isEdit ? '作品已更新' : '作品已提交审核'"));
assert(workEditor.includes("confirmText: '查看作品'"));
assert(workEditor.includes("cancelText: '返回管理'"));

const business = read('pages/technician/business-data/index.wxml');
assert(business.includes('主页获客路径'));
assert(business.includes('作品传播路径'));
assert(business.includes('分享发起不代表') || business.includes('“分享发起”不代表'));

const binding = read('pages/client/my-technicians/index.wxml');
assert(binding.includes('验证邀请码后立即绑定，无需等待美甲师确认'));
assert(binding.includes('label="确认绑定"'));

console.log('三项经营成长路径、主页完善、作品宣传、客户预约、直接绑定与转化反馈闭环检查通过');

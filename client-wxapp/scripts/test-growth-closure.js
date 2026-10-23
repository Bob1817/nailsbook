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

const profileWxml = read('pages/technician/profile/index.wxml');
assert(!profileWxml.includes('经营成长路径'), '经营成长路径不应占用我的页面核心位置');
const marketingWxml = read('pages/technician/marketing-materials/index.wxml');
for (const label of ['美甲师主页', '作品管理', '邀请客户']) assert(marketingWxml.includes(label), `营销工具缺少 ${label}`);
for (const label of ['营销配置', '品牌与内容', '客户增长', '宣传物料']) assert(marketingWxml.includes(label), `营销工具缺少 ${label} 分区`);
assert(marketingWxml.includes('completionPercent'), '营销工具缺少配置完成度');
assert(marketingWxml.indexOf('营销配置') < marketingWxml.indexOf('品牌与内容'), '配置完成度应先于工具分类展示');

const customers = read('pages/technician/customers/index.wxml');
assert(customers.includes('邀请客户后会直接建立关系，无需审批'));
assert(customers.includes('showInviteGuide'), '客户邀请说明应在邀请弹窗中显示');
assert(!customers.includes('customer-flow-card'), '客户页首屏不应常驻流程说明卡');

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

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const cardWxml = read('components/technician-booking-card/index.wxml');
const cardWxss = read('components/technician-booking-card/index.wxss');
const clientWxss = read('pages/client/orders/index.wxss');
const scheduleWxss = read('pages/technician/schedule/index.wxss');

assert(cardWxml.includes('hero-status-badge {{order._heroStatusTone || order._statusTone || order._stateTone}}'), '首页预约状态标签应绑定状态色');
for (const styles of [cardWxss, clientWxss, scheduleWxss]) {
  assert(styles.includes('var(--nb-success-surface)') && styles.includes('var(--nb-success)'), '已确认或待到店应使用成功色');
  assert(styles.includes('var(--nb-soft-surface)') && styles.includes('var(--nb-text-link)'), '待处理或进行中应使用提示色');
  assert(styles.includes('var(--nb-danger-surface)') && styles.includes('var(--nb-danger)'), '取消或拒绝应使用危险色');
}
assert(/tone-gray[^}]*var\(--nb-(page|secondary)/s.test(cardWxss), '完成和过期状态应保持中性');

console.log('预约状态语义色检查通过');

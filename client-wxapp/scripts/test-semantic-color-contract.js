const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const assertClassNeverUses = (css, className, forbiddenTokens, message) => {
  const blocks = css.match(new RegExp(`\\.${className}(?=[\\s,.:{])[^{}]*\\{[^}]*\\}`, 'g')) || [];
  for (const block of blocks) {
    for (const token of forbiddenTokens) {
      assert(!block.includes(`color:var(--${token})`) && !block.includes(`color: var(--${token})`), message);
    }
  }
};
const tokens = read('styles/tokens.wxss');
assert(tokens.includes('--text-error: var(--nb-danger)'), '错误文字必须使用危险语义');
for (const [tone, text, bg] of [
  ['amber', 'text-link', 'soft-surface'], ['blue', 'text-link', 'soft-surface'],
  ['purple', 'text-link', 'soft-surface'], ['sky', 'text-link', 'soft-surface'],
  ['yellow', 'text-link', 'soft-surface'], ['emerald', 'success', 'success-surface'],
  ['teal', 'success', 'success-surface'], ['rose', 'danger', 'danger-surface'],
  ['gray', 'secondary', 'page'],
]) {
  assert(tokens.includes(`--tone-${tone}-text: var(--nb-${text})`));
  assert(tokens.includes(`--tone-${tone}-bg: var(--nb-${bg})`));
}
const actions = read('styles/semantic-actions.wxss');
assert(!/\.semantic-primary\s+text\b/.test(actions), '隔离组件不使用标签选择器');
assert(actions.includes('.semantic-primary.is-disabled'), '主按钮提供禁用覆盖');
assert(actions.indexOf('.semantic-primary.is-disabled') > actions.indexOf('.semantic-primary:active'));
const form = read('pages/client/create-order/index.wxss');
assert(/\.service-card \.service-price\s*\{[^}]*var\(--nb-money\)/.test(form));
assert(/\.service-card-active \.service-price\s*\{[^}]*var\(--nb-inverse\)/.test(form));
assertClassNeverUses(form, 'tag', ['brand-primary', 'nb-link'], '普通标签不得伪装为主操作或文字链接');
assertClassNeverUses(form, 'badge-default', ['brand-primary', 'nb-link'], '默认徽标必须保持中性');
for (const [page, required] of [
  ['client/home', ['--nb-success-surface', '--nb-text-link']],
  ['client/orders', ['--nb-money', '--nb-text-link']],
  ['client/order-detail', ['--nb-money', '--nb-danger-surface', '--nb-text-link']],
  ['technician/order-detail', ['--nb-money', '--nb-danger-surface']],
  ['client/design-detail', ['--nb-money', '--nb-success-surface', '--nb-danger-surface']],
  ['client/trade-orders', ['--nb-money', '--nb-success', '--nb-danger']],
  ['technician/trade-orders', ['--nb-money', '--nb-success', '--nb-danger']],
]) {
  const css = read(`pages/${page}/index.wxss`);
  for (const token of required) assert(css.includes(token), `${page} 缺少 ${token} 语义色`);
}
for (const page of ['client/create-order', 'client/artist-home', 'client/works', 'technician/shop-management']) {
  const css = read(`pages/${page}/index.wxss`);
  assert(!/\.[\w-]*guidance[\w-]*\s*\{[^}]*color: var\(--nb-link\)/.test(css), `${page} 指引链接不得使用旧灰蓝`);
}
const orderDetail = read('pages/client/order-detail/index.wxss');
for (const className of ['actual-payment-value', 'deposit-amount', 'price-discount', 'payment-remaining', 'price-subtotal']) {
  assertClassNeverUses(orderDetail, className, ['nb-ink', 'brand-primary'], `${className} 不得覆盖回普通正文色`);
}
const technicianOrderDetail = read('pages/technician/order-detail/index.wxss');
assert(/\.required\s*\{[^}]*var\(--nb-danger\)/.test(technicianOrderDetail), '必填提示必须使用危险语义色');
const services = read('pages/technician/services/index.wxss');
assert(/\.svc-name\s*\{[^}]*var\(--nb-ink\)/.test(services), '服务名称必须使用正文色');
assert(/\.svc-price\s*\{[^}]*var\(--nb-money\)/.test(services), '服务价格必须使用金额色');
assert(/\.badge-active\s*\{[^}]*var\(--nb-success\)[^}]*var\(--nb-success-surface\)/.test(services), '上架状态必须使用成功语义');
assert(/\.action-menu \.action-delete\s*\{[^}]*var\(--nb-danger\)/.test(services), '删除操作必须使用危险语义');
const leads = read('pages/technician/leads/index.wxss');
for (const token of ['--nb-text-link', '--nb-success', '--nb-danger']) assert(leads.includes(token), `咨询线索缺少 ${token} 状态语义`);
assert(read('pages/technician/leads/index.wxml').includes('status-{{item.status}}'), '咨询线索必须按真实状态着色');
const businessDataWxml = read('pages/technician/business-data/index.wxml');
assert(/averageTicket === '待积累' \? 'text-muted' : 'semantic-money'/.test(businessDataWxml), '平均客单价占位不得使用金额红');
for (const [page, className] of [
  ['client/manual', 'more-btn'],
  ['client/profile', 'followed-status'],
  ['client/profile', 'hero-edit-text'],
  ['client/home', 'address-nav-action'],
  ['client/orders', 'footer-action'],
  ['technician/business-data', 'section-link'],
  ['technician/customer-detail', 'card-action'],
  ['technician/customer-detail', 'inline-action'],
]) {
  assertClassNeverUses(read(`pages/${page}/index.wxss`), className, ['nb-link', 'brand-primary'], `${page} 的 ${className} 必须使用文字链接语义色`);
}
console.log('共享语义色、链接迁移、金额选中态及禁用优先级契约通过');

const { execFileSync } = require('child_process');
const { join } = require('path');

const root = join(__dirname, '..');
// 首期发布只验收已纳入的单店小程序范围。其余脚本对应未发布的品牌页、
// 连续录入和旧信息架构，不应阻断本次发布。
const checks = [
  'test-request-throttling.js',
  'test-artist-navigation.js',
  'test-complete-publish-flow.js',
  'test-booking-review.js',
  'test-booking-time-engine.js',
  'test-conversion-tracking.js',
  'test-launch-compliance.js',
  'test-icon-system.js',
  'test-technician-home-todos.js',
  'test-technician-booking-card.js',
  'test-shop-management.js',
  'test-shop-guidance-blocks.js',
  'test-technician-order-actions.js',
  'test-work-card-role-actions.js',
];

execFileSync(process.execPath, [join(__dirname, 'validate-miniprogram.js')], {
  cwd: root,
  stdio: 'inherit'
});
for (const check of checks) {
  execFileSync(process.execPath, [join(__dirname, check)], {
    cwd: root,
    stdio: 'inherit'
  });
}
console.log(`发布门禁通过：1 项全量静态检查，${checks.length} 项专项检查。`);

const { execFileSync } = require('child_process');
const { join } = require('path');

const root = join(__dirname, '..');
for (const args of [['sync-colors.py', '--check'], ['check-colors.py']]) {
  execFileSync('python3', [join(root, '..', 'scripts', args[0]), ...args.slice(1)], {
    cwd: root,
    stdio: 'inherit'
  });
}
// 首期发布只验收已纳入的单店小程序范围。其余脚本对应未发布的品牌页、
// 连续录入和旧信息架构，不应阻断本次发布。
const checks = [
  'check-component-standards.js',
  'check-secondary-page-hierarchy.js',
  'check-style-imports.js',
  'test-profile-accepting-switch.js',
  'test-client-profile-layout.js',
  'test-role-account-switch.js',
  'test-client-binding-flow.js',
  'test-hero-binding-limits.js',
  'test-beauty-archive.js',
  'test-share-booking.js',
  'test-share-registration.js',
  'test-work-share-poster.js',
  'test-customer-card-status.js',
  'test-customer-action-style.js',
  'test-customer-booking-entry.js',
  'test-order-confirm-reentry.js',
  'test-order-detail-style.js',
  'check-calendar-status.js',
  'test-request-throttling.js',
  'test-upload-auth.js',
  'test-session-expiry.js',
  'test-orders-auth.js',
  'test-artist-navigation.js',
  'test-complete-publish-flow.js',
  'test-booking-review.js',
  'test-booking-status-colors.js',
  'test-booking-shop-selection.js',
  'test-create-order-entry.js',
  'test-create-order-custom-form.js',
  'test-booking-time-engine.js',
  'test-booking-availability.js',
  'test-quick-booking.js',
  'test-quick-booking-share.js',
  'test-booking-api-capability.js',
  'test-conversion-tracking.js',
  'test-launch-compliance.js',
  'test-icon-system.js',
  'test-checkbox-sizing.js',
  'test-avatar-consistency.js',
  'test-technician-home-todos.js',
  'test-technician-booking-day-control.js',
  'test-technician-booking-card.js',
  'test-chat-detail-consistency.js',
  'test-technician-chat-conversation.js',
  'test-artist-interactions.js',
  'test-business-data-month.js',
  'test-shop-management.js',
  'test-shop-guidance-blocks.js',
  'test-guidance-editor-recovery.js',
  'test-customer-search-race.js',
  'test-customer-follow-up.js',
  'test-customer-tags-save.js',
  'test-customer-maintenance.js',
  'test-binding-applications-state.js',
  'test-customer-detail-refresh.js',
  'test-edit-booking-time-state.js',
  'test-create-order-location-presentation.js',
  'test-technician-order-actions.js',
  'test-work-card-role-actions.js',
  'test-work-image-upload-controls.js',
  'test-work-save-retry.js',
  'test-work-create-recovery.js',
  'test-work-editor-style.js',
  'test-tag-save-input.js',
  'test-marketing-material-state.js',
  'test-settings-governance.js',
  'test-auth-entry-style.js',
  'test-secondary-page-style.js',
  'test-work-comment-submit.js',
  'test-work-list-actions.js',
  'test-service-review-notification.js',
  'test-account-deletion.js',
  'test-work-error-state.js',
  'test-work-promotion.js',
  'test-discover-work-navigation.js',
  'test-page-governance.js',
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

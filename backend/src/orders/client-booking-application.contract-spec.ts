import * as fs from 'fs';
import * as path from 'path';
describe('P0-14 booking application contract', () => {
  const root = path.resolve(__dirname, '../../../client-wxapp');
  const js = fs.readFileSync(
    path.join(root, 'pages/client/create-order/index.js'),
    'utf8',
  );
  const wxml = fs.readFileSync(
    path.join(root, 'pages/client/create-order/index.wxml'),
    'utf8',
  );
  it('persists drafts and submits an idempotency key', () => {
    expect(js).toContain("DRAFT_KEY='client_booking_application_draft'");
    expect(js).toContain('applicationKey:self.applicationKey');
    expect(js).toContain('wx.setStorageSync(DRAFT_KEY');
  });
  it('requires rules and opens a review modal', () => {
    expect(js).toContain('bookingRulesAgreed');
    expect(wxml).toContain('核对预约申请');
    expect(wxml).toContain('美甲师确认后生效');
  });
  it('reserves the requested slot as soon as the application is created', () => {
    const service = fs.readFileSync(
      path.resolve(__dirname, 'client-orders.service.ts'),
      'utf8',
    );
    const createBlock = service.slice(
      service.indexOf('async create(clientUserId'),
      service.indexOf('async createFromDesign'),
    );
    expect(createBlock).toContain('blockedTimeSlot.create');
    expect(createBlock).toContain('await this.assertNoBlockedConflict(');
    expect(createBlock).toContain('blockEndTime');
    expect(createBlock).toContain('totalDurationMinutes || DEFAULT_BOOKING_DURATION_MINUTES');
    expect(createBlock).toContain("bookingPhase: 'application'");
  });
});

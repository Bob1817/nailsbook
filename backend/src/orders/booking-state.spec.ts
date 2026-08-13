import { BadRequestException } from '@nestjs/common';
import { assertBookingTransition, bookingPhase } from './booking-state';
describe('P0-13 booking state machine', () => {
  it.each([
    ['pending_quote', 'application'],
    ['pending_home', 'booking'],
    ['in_progress', 'in_service'],
    ['completed', 'finished'],
    ['cancelled', 'closed'],
    ['no_show', 'closed'],
  ])('maps legacy %s to %s', (status, phase) =>
    expect(bookingPhase(status)).toBe(phase),
  );
  it('does not treat an application as a confirmed booking', () => {
    expect(bookingPhase('pending_confirm')).toBe('application');
    expect(bookingPhase('pending_confirm')).not.toBe('booking');
  });
  it('rejects illegal skip to completed', () =>
    expect(() => assertBookingTransition('pending_quote', 'completed')).toThrow(
      BadRequestException,
    ));
  it.each(['cancelled', 'rejected', 'no_show'])(
    'requires a reason for %s',
    (status) =>
      expect(() =>
        assertBookingTransition(
          status === 'no_show' ? 'pending_home' : 'pending_quote',
          status,
        ),
      ).toThrow(BadRequestException),
  );
  it('allows confirmed booking to be marked no-show with reason', () =>
    expect(() =>
      assertBookingTransition('pending_shop', 'no_show', '客户未到店'),
    ).not.toThrow());
});

import { BadRequestException } from '@nestjs/common';

export const BOOKING_PHASE_BY_STATUS: Record<string, string> = {
  pending_quote: 'application',
  pending_agree: 'application',
  pending_confirm: 'application',
  pending_client_confirm: 'application',
  pending_home: 'booking',
  pending_shop: 'booking',
  in_progress: 'in_service',
  completed: 'finished',
  cancelled: 'closed',
  expired: 'closed',
  rejected: 'closed',
  no_show: 'closed',
};
export const BOOKING_TRANSITIONS: Record<string, string[]> = {
  pending_quote: ['pending_agree', 'cancelled', 'rejected', 'expired'],
  pending_agree: [
    'pending_confirm',
    'pending_quote',
    'cancelled',
    'rejected',
    'expired',
  ],
  pending_confirm: [
    'pending_home',
    'pending_shop',
    'cancelled',
    'rejected',
    'expired',
  ],
  pending_client_confirm: [
    'pending_confirm',
    'cancelled',
    'rejected',
    'expired',
  ],
  pending_home: ['in_progress', 'cancelled', 'no_show'],
  pending_shop: ['in_progress', 'cancelled', 'no_show'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
  rejected: [],
  no_show: [],
  expired: [
    'pending_quote',
    'pending_agree',
    'pending_confirm',
    'pending_client_confirm',
  ],
};
export function bookingPhase(status: string) {
  return BOOKING_PHASE_BY_STATUS[status] || 'application';
}
export function assertBookingTransition(
  from: string,
  to: string,
  reason?: string,
) {
  if (!(BOOKING_TRANSITIONS[from] || []).includes(to))
    throw new BadRequestException(`预约不能从 ${from} 变更为 ${to}`);
  if (['cancelled', 'rejected', 'no_show'].includes(to) && !reason?.trim())
    throw new BadRequestException('取消、拒绝或爽约必须填写原因');
}

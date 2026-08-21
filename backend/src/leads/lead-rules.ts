import { BadRequestException } from '@nestjs/common';

export const LEAD_STATUSES = [
  'new',
  'following_up',
  'paused',
  'won',
  'lost',
] as const;
export const LOST_REASONS = [
  'price',
  'schedule',
  'style_mismatch',
  'location',
  'no_response',
  'competitor',
  'other',
] as const;
const TRANSITIONS: Record<string, string[]> = {
  new: ['following_up', 'paused', 'won', 'lost'],
  following_up: ['paused', 'won', 'lost'],
  paused: ['following_up', 'won', 'lost'],
  won: [],
  lost: ['following_up'],
};

export function assertLeadTransition(
  from: string,
  to: string,
  lostReason?: string,
) {
  if (from === to || !(TRANSITIONS[from] || []).includes(to))
    throw new BadRequestException(`线索不能从 ${from} 变更为 ${to}`);
  if (to === 'lost' && !LOST_REASONS.includes(lostReason as never))
    throw new BadRequestException('未成交必须填写标准原因');
}

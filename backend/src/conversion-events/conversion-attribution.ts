export const CONVERSION_EVENT_TYPES = [
  'homepage_view',
  'work_view',
  'price_view',
  'consult_click',
  'booking_click',
  'booking_submit',
  'consult_submit',
  'artist_view',
  'booking_intent',
] as const;

export const ATTRIBUTION_CHANNELS = [
  'direct',
  'xiaohongshu',
  'douyin',
  'wechat_moments',
  'wechat_share',
  'repeat_customer',
  'customer_referral',
  'offline_qr',
  'organic',
  'unknown',
] as const;

export type AttributionChannel = (typeof ATTRIBUTION_CHANNELS)[number];

const CHANNEL_ALIASES: Record<string, AttributionChannel> = {
  xhs: 'xiaohongshu',
  red: 'xiaohongshu',
  tiktok_cn: 'douyin',
  moments: 'wechat_moments',
  share_card: 'wechat_share',
  wechat_friend: 'wechat_share',
  repurchase: 'repeat_customer',
  referral: 'customer_referral',
  qr: 'offline_qr',
};

export function normalizeChannel(value?: string): AttributionChannel {
  const normalized = String(value || 'direct').trim().toLowerCase();
  const aliased = CHANNEL_ALIASES[normalized] || normalized;
  return (ATTRIBUTION_CHANNELS as readonly string[]).includes(aliased)
    ? aliased
    : 'direct';
}

export function safeAttributionToken(value?: string, maxLength = 64) {
  const normalized = String(value || '').trim().toLowerCase();
  return /^[a-z0-9_-]+$/.test(normalized)
    ? normalized.slice(0, maxLength)
    : null;
}

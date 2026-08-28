type Event = { eventType: string; workId?: number | null; visitorId?: string | null; clientUserId?: number | null; source?: string | null };

// 匿名与登录身份未串联，只报告阶段计数，不计算跨身份转化率。
export function workShareFunnel(events: Event[]) {
  const visits = events.filter(e => e.workId && ['wechat_share', 'wechat_moments'].includes(e.source || ''));
  const unique = (type: string) => new Set(visits.filter(e => e.eventType === type && e.visitorId).map(e => `${e.visitorId}:${e.workId}`)).size;
  const attributed = events.filter(e => e.workId && e.source === 'work_share');
  return {
    periodDays: 90,
    views: visits.filter(e => e.eventType === 'work_view').length,
    uniqueWorkVisitors: unique('work_view'),
    bookingIntents: unique('booking_intent'),
    postersSaved: visits.filter(e => e.eventType === 'poster_saved').length,
    postersGenerated: visits.filter(e => e.eventType === 'poster_generated').length,
    registeredCustomers: new Set(visits.filter(e => e.eventType === 'registration_completed' && e.clientUserId).map(e => e.clientUserId)).size,
    boundCustomers: new Set(attributed.filter(e => e.eventType === 'binding_created' && e.clientUserId).map(e => e.clientUserId)).size,
    ordersCreated: attributed.filter(e => e.eventType === 'order_created').length,
    channels: ['wechat_share', 'wechat_moments'].map(source => ({
      source,
      views: visits.filter(e => e.source === source && e.eventType === 'work_view').length,
    })),
  };
}

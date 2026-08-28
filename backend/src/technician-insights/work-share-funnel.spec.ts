import { workShareFunnel } from './work-share-funnel';

describe('作品分享阶段统计', () => {
  it('按访客作品去重，不把保存当发布，不混入普通预约', () => {
    const view = { eventType: 'work_view', visitorId: 'v1', workId: 7, source: 'wechat_share' };
    const bind = { eventType: 'binding_created', clientUserId: 5, workId: 7, source: 'work_share' };
    const result = workShareFunnel([
      view, view, { ...view, source: 'wechat_moments' },
      { ...view, eventType: 'booking_intent' }, { ...view, eventType: 'booking_intent' },
      { ...view, eventType: 'poster_saved', source: 'wechat_moments' },
      { ...view, eventType: 'poster_generated', source: 'wechat_moments' },
      { ...view, eventType: 'registration_completed', clientUserId: 5 },
      { ...view, eventType: 'registration_completed', clientUserId: 5 },
      bind, bind,
      { ...bind, eventType: 'order_created' },
      { ...bind, eventType: 'order_created', source: 'work_detail' },
    ]);
    expect(result).toMatchObject({ views: 3, uniqueWorkVisitors: 1, bookingIntents: 1, postersSaved: 1, postersGenerated: 1, registeredCustomers: 1, boundCustomers: 1, ordersCreated: 1 });
    expect(result.channels).toEqual([{ source: 'wechat_share', views: 2 }, { source: 'wechat_moments', views: 1 }]);
    expect(result).not.toHaveProperty('publishCount');
    expect(result).not.toHaveProperty('conversionRate');
  });
  it('空数据返回零而不是虚构转化率', () => {
    expect(workShareFunnel([])).toMatchObject({ views: 0, boundCustomers: 0, ordersCreated: 0 });
  });
});

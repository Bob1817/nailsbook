import { WechatSubscribeMessagesService } from './wechat-subscribe-messages.service';

describe('WechatSubscribeMessagesService', () => {
  const order = {
    id: 18,
    clientUserId: 7,
    technicianId: 55,
    customTitle: '高级定制美甲',
    address: '杭州市西湖区奥莱金街4号楼421室',
    customer: { name: '心心' },
    startTime: new Date('2026-10-12T14:00:00+08:00'),
  };

  function createService() {
    const prisma = {
      $transaction: jest.fn(async (operations) => Promise.all(operations)),
      wechatSubscriptionAuthorization: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          status: 'accept',
          availableCount: 1,
        }),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
        upsert: jest.fn().mockResolvedValue({}),
      },
      wechatIdentity: {
        findFirst: jest.fn().mockResolvedValue({ openId: 'openid-1' }),
      },
      notificationEvent: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({ id: 9 }),
        update: jest.fn().mockResolvedValue({}),
      },
      notificationDelivery: {
        count: jest.fn().mockResolvedValue(2),
        upsert: jest.fn().mockResolvedValue({ id: 10, status: 'pending' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      order: { findUnique: jest.fn() },
      orderReminder: { updateMany: jest.fn() },
      message: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const platform = {
      getBookingReminderTemplateIds: jest.fn().mockResolvedValue({
        dayBefore: 'day-template',
        hourBefore: 'hour-template',
      }),
      getBookingEventTemplateIds: jest.fn().mockResolvedValue({
        clientSuccess: 'client-success-template',
        technicianNew: 'technician-new-template',
      }),
      getNotificationTemplateIds: jest.fn().mockResolvedValue({
        clientStatus: 'client-status-template',
        technicianStatus: 'technician-status-template',
        consultationReply: 'consultation-template',
      }),
      getPublicLaunchConfig: jest.fn().mockResolvedValue({
        storeName: '杭州听栖美甲工作室',
        storeAddress: '杭州市西湖区奥莱金街4号楼421室',
      }),
      getLoginCredentials: jest
        .fn()
        .mockResolvedValue({ appId: 'wx-app', appSecret: 'secret' }),
    };
    return {
      service: new WechatSubscribeMessagesService(
        prisma as never,
        platform as never,
      ),
      prisma,
      platform,
    };
  }

  beforeEach(() => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token', expires_in: 7200 }),
      } as Response)
      .mockResolvedValue({
        ok: true,
        json: async () => ({ errcode: 0 }),
      } as Response);
  });

  afterEach(() => jest.restoreAllMocks());

  it('通知只写入传入事务，写入失败必须向上抛出', async () => {
    const { service, prisma } = createService();
    const tx = { notificationEvent: { upsert: jest.fn().mockResolvedValue({ id: 42 }) } };
    await service.enqueueBookingEvent(tx as never, { ...order, status: 'pending_shop' }, 'client_success');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(prisma.notificationEvent.upsert).not.toHaveBeenCalled();
    const saved = tx.notificationEvent.upsert.mock.calls[0][0].create;
    expect(saved.recipientId).toBe(7);
    expect(JSON.parse(saved.payloadSnapshot).kind).toBe('booking_event');
    tx.notificationEvent.upsert.mockRejectedValue(new Error('db unavailable'));
    await expect(service.enqueueBookingEvent(tx as never, order, 'client_success')).rejects.toThrow('db unavailable');
  });

  it('重启后从数据库恢复通知，复用事件键并隔离重复执行', async () => {
    const { service, prisma } = createService();
    const liveOrder = { ...order, status: 'pending_shop', startTime: new Date(Date.now() + 3600000) };
    prisma.order.findUnique.mockResolvedValue(liveOrder);
    prisma.notificationEvent.findMany.mockResolvedValue([{
      id: 42, eventKey: 'persisted-event', orderId: order.id, recipientRole: 'client', recipientId: 7,
      createdAt: new Date(), payloadSnapshot: JSON.stringify({ kind: 'booking_event', type: 'client_success', order: liveOrder }),
    }] as never);
    await service.processBookingOutbox();
    expect(prisma.notificationEvent.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { eventKey: 'persisted-event' } }));
    const calls = (global.fetch as jest.Mock).mock.calls.length;
    prisma.notificationEvent.findUnique.mockResolvedValue({ status: 'delivered', deliveries: [{ status: 'sent' }] } as never);
    await service.processBookingOutbox();
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(calls);
  });

  it.each([false, true])('使用已发布名称及唯一匹配门店，歧义地址不猜测（%s）', async ambiguous => {
    const { service, prisma } = createService();
    const current = { ...order, status: 'pending_shop', startTime: new Date(Date.now() + 3600000),
      technician: { name: '登录名', brandProfile: { publicationStatus: 'published', brandName: '客户绑定的美甲师' },
        shopAddresses: JSON.stringify([{ name: '实际预约门店', address: order.address }, ...(ambiguous ? [{ name: '另一门店', address: order.address }] : [])]) } };
    prisma.order.findUnique.mockResolvedValue(current);
    prisma.notificationEvent.findMany.mockResolvedValue([{ id: 42, eventKey: 'name-check', orderId: order.id,
      recipientRole: 'client', recipientId: 7, createdAt: new Date(),
      payloadSnapshot: JSON.stringify({ kind: 'booking_event', type: 'client_success', order: { ...order, status: current.status, startTime: current.startTime } }) }] as never);
    const send = jest.spyOn(service, 'sendBookingEvent').mockResolvedValue({ sent: 1 });
    await service.processBookingOutbox();
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ technicianName: '客户绑定的美甲师' }), 'client_success', 'name-check');
    expect(send.mock.calls[0][0].shopName).toBe(ambiguous ? undefined : '实际预约门店');
  });

  it('已取消的队列消息不会继续发送', async () => {
    const { service, prisma } = createService();
    prisma.order.findUnique.mockResolvedValue({ ...order, status: 'cancelled' });
    prisma.notificationEvent.findMany.mockResolvedValue([{
      id: 42, orderId: order.id, createdAt: new Date(), recipientRole: 'client', recipientId: 7,
      payloadSnapshot: JSON.stringify({ kind: 'booking_event', order: { ...order, status: 'pending_shop' } }),
    }] as never);
    await service.processBookingOutbox();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(prisma.notificationEvent.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'obsolete' }) }));
  });

  it('缺少模板也有渠道流水，且不消耗授权', async () => {
    const { service, prisma, platform } = createService();
    platform.getBookingEventTemplateIds.mockResolvedValue({ clientSuccess: '', technicianNew: '' });
    await service.sendBookingEvent(order, 'client_success');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(prisma.wechatSubscriptionAuthorization.updateMany).not.toHaveBeenCalled();
    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'skipped', providerCode: 'template_not_configured' }),
    }));
  });

  it('接收人缺失保留原因而不是静默返回', async () => {
    const { service, prisma } = createService();
    await service.sendBookingEvent({ ...order, clientUserId: null }, 'client_success');
    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'skipped', providerCode: 'recipient_missing' }),
    }));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each([0, 1, 2])('微信接受 %s/2 时汇总状态准确', async (sent) => {
    const { service, prisma } = createService();
    prisma.notificationDelivery.count.mockResolvedValue(sent);
    await (service as any).reconcileReminder(order, 'booking.hour_before', order.startTime.toISOString());
    expect(prisma.orderReminder.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: sent === 2 ? 'sent' : 'partial', sentAt: sent === 2 ? expect.any(Date) : null }),
    }));
  });

  it('到店提醒按收件人生成两个持久任务，不在事务中访问微信', async () => {
    const { service } = createService();
    const tx = { notificationEvent: { upsert: jest.fn() } };
    await service.enqueueOrderReminder(tx as never, order, 'hour_before');
    expect(tx.notificationEvent.upsert).toHaveBeenCalledTimes(2);
    expect(tx.notificationEvent.upsert.mock.calls.map(call => call[0].create.recipientRole)).toEqual(['client', 'technician']);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('超时sending仅标记未知，不自动重新发送', async () => {
    const { service, prisma } = createService();
    await service.processBookingOutbox();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(prisma.notificationDelivery.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'sending' }),
      data: expect.objectContaining({ status: 'unknown', providerCode: 'delivery_outcome_unknown' }),
    }));
  });

  it('已生成发送快照但尚未认领的任务能在重启后恢复', async () => {
    const { service, prisma } = createService();
    const startTime = new Date(Date.now() + 3600000).toISOString();
    const input = { eventKey: 'rendered-key', eventType: 'booking.client_success', templateId: 'template',
      role: 'client', ownerId: 7, orderId: 18, orderStatus: 'pending_shop', orderStartTime: startTime,
      page: 'pages/client/order-detail/index?id=18', data: { thing9: { value: '预约已确认' } } };
    prisma.order.findUnique.mockResolvedValue({ id: 18, clientUserId: 7, status: 'pending_shop', startTime });
    prisma.notificationEvent.findMany.mockResolvedValue([{
      id: 42, eventKey: 'rendered-key', eventType: 'booking.client_success', orderId: 18,
      recipientRole: 'client', recipientId: 7, createdAt: new Date(), payloadSnapshot: JSON.stringify(input),
    }] as never);
    await service.processBookingOutbox();
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body);
    expect(body.template_id).toBe('template');
    expect(prisma.notificationDelivery.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { dedupeKey: 'rendered-key:wechat_subscribe' },
    }));
  });

  it('上门预约成功不提示到店，并保留实际门店', async () => {
    const { service } = createService();
    await service.sendBookingEvent({ ...order, serviceType: '上门美甲', shopName: '实际门店' }, 'client_success');
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body);
    expect(body.data.thing8.value).toBe('实际门店');
    expect(body.data.thing9.value).toContain('上门');
  });

  it('报价预约最终确认后通知美甲师无需再次确认', async () => {
    const { service } = createService();
    await service.sendBookingEvent({ ...order, status: 'pending_shop' }, 'technician_new');
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body);
    expect(body.data.thing9.value).toBe('收到已确认预约，请按时安排服务');
  });

  it.each(['pending_shop', 'cancelled'])('补发前校验订单状态 %s', async (status) => {
    const { service, prisma } = createService();
    const startTime = new Date(Date.now() + 3600000).toISOString();
    const input = { templateId: 'template', role: 'client', ownerId: 7, orderId: 18, orderStatus: 'pending_shop', orderStartTime: startTime };
    prisma.notificationDelivery.findMany.mockResolvedValue([{
      id: 10, providerCode: '-1', notificationEvent: {
        eventType: 'booking.hour_before', createdAt: new Date(), payloadSnapshot: JSON.stringify(input),
      },
    }] as never);
    prisma.order.findUnique.mockResolvedValue({ id: 18, clientUserId: 7, technicianId: 55, status, startTime });
    const dispatch = jest.spyOn(service as any, 'dispatchAuthorized').mockResolvedValue(true);
    await service.retryBookingNotifications();
    expect(dispatch).toHaveBeenCalledTimes(status === 'pending_shop' ? 1 : 0);
    expect(prisma.notificationDelivery.updateMany).toHaveBeenCalledTimes(status === 'pending_shop' ? 0 : 1);
  });

  it.each(['rescheduled', 'started', 'old', 'new_quote', 'missing_snapshot'])('过期或不可重放事件不补发：%s', async (scenario) => {
    const { service, prisma } = createService();
    const startTime = new Date(Date.now() + (scenario === 'started' ? -1 : 1) * 3600000).toISOString();
    const input = { templateId: 'template', role: 'client', ownerId: 7, orderId: 18,
      orderStatus: 'pending_shop', orderQuoteVersion: 1, orderStartTime: startTime };
    prisma.notificationDelivery.findMany.mockResolvedValue([{
      id: 10, providerCode: '-1', notificationEvent: {
        eventType: 'booking.hour_before',
        createdAt: new Date(Date.now() - (scenario === 'old' ? 25 : 0) * 3600000),
        payloadSnapshot: JSON.stringify(scenario === 'missing_snapshot' ? {} : input),
      },
    }] as never);
    prisma.order.findUnique.mockResolvedValue({ id: 18, clientUserId: 7, status: 'pending_shop',
      quoteVersion: scenario === 'new_quote' ? 2 : 1,
      startTime: scenario === 'rescheduled' ? new Date(Date.now() + 7200000) : startTime });
    const dispatch = jest.spyOn(service as any, 'dispatchAuthorized');
    await service.retryBookingNotifications();
    expect(dispatch).not.toHaveBeenCalled();
    expect(prisma.notificationDelivery.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'skipped' }),
    }));
  });

  it('uses the appointment-day template and its approved keyword mapping', async () => {
    const { service } = createService();

    await service.sendOrderReminder(order, 'day_before');

    const request = (global.fetch as jest.Mock).mock.calls[1][1];
    const body = JSON.parse(request.body);
    expect(body.template_id).toBe('day-template');
    expect(body.data).toEqual({
      thing7: { value: '高级定制美甲' },
      time2: { value: '2026-10-12 14:00' },
      thing8: { value: '美甲服务' },
      thing9: { value: '明天有预约，请合理安排行程' },
    });
  });

  it('uses the hour-before template and its approved keyword mapping', async () => {
    const { service } = createService();

    await service.sendOrderReminder(order, 'hour_before');

    const request = (global.fetch as jest.Mock).mock.calls[1][1];
    const body = JSON.parse(request.body);
    expect(body.template_id).toBe('hour-template');
    expect(body.data).toEqual({
      thing32: { value: '高级定制美甲' },
      time2: { value: '2026-10-12 14:00' },
      thing8: { value: '美甲服务' },
      thing9: { value: '距离预约约1小时，请准备按时到店' },
    });
  });

  it('uses a technician-specific preparation message for the same reminder', async () => {
    const { service } = createService();

    await service.sendOrderReminder(order, 'hour_before');

    const request = (global.fetch as jest.Mock).mock.calls[2][1];
    const body = JSON.parse(request.body);
    expect(body.page).toBe('pages/technician/order-detail/index?id=18');
    expect(body.data.thing9).toEqual({
      value: '距离预约约1小时，请准备接待客户',
    });
  });

  it('sends the client booking-success template with the shop address', async () => {
    const { service } = createService();

    await service.sendBookingEvent(order, 'client_success');

    const request = (global.fetch as jest.Mock).mock.calls[1][1];
    const body = JSON.parse(request.body);
    expect(body.template_id).toBe('client-success-template');
    expect(body.page).toBe('pages/client/order-detail/index?id=18');
    expect(body.data).toEqual({
      thing7: { value: '高级定制美甲' },
      time2: { value: '2026-10-12 14:00' },
      thing8: { value: '美甲服务' },
      thing4: { value: '杭州市西湖区奥莱金街4号楼421室' },
      thing9: { value: '预约已确认，请按时到店' },
    });
  });

  it('sends the technician new-booking template with the client name', async () => {
    const { service } = createService();

    await service.sendBookingEvent(order, 'technician_new');

    const request = (global.fetch as jest.Mock).mock.calls[1][1];
    const body = JSON.parse(request.body);
    expect(body.template_id).toBe('technician-new-template');
    expect(body.page).toBe('pages/technician/order-detail/index?id=18');
    expect(body.data).toEqual({
      thing7: { value: '高级定制美甲' },
      time2: { value: '2026-10-12 14:00' },
      name6: { value: '心心' },
      thing9: { value: '收到新的预约申请，请及时确认' },
    });
  });

  it('adds one available delivery when the user accepts a template', async () => {
    const { service, prisma } = createService();

    await service.recordAuthorization('technician', 55, {
      'technician-new-template': 'accept',
    });

    expect(prisma.wechatSubscriptionAuthorization.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          availableCount: 1,
          acceptedCount: 1,
        }),
        update: expect.objectContaining({
          availableCount: { increment: 1 },
          acceptedCount: { increment: 1 },
        }),
      }),
    );
  });

  it('returns every configured reminder template for the authorization button', async () => {
    const { service, prisma } = createService();
    prisma.wechatSubscriptionAuthorization.findMany.mockResolvedValue([
      {
        templateId: 'technician-new-template',
        availableCount: 1,
        status: 'accept',
      },
    ]);

    const result = await service.getAuthorizationStatus('technician', 55);

    expect(result.configuredTemplates).toBe(5);
    expect(result.availableTemplates).toBe(1);
    expect(result.status).toBe('needs_top_up');
    expect(result.templates).toEqual({
      bookingEvent: 'technician-new-template',
      bookingStatus: 'technician-status-template',
      dayBefore: 'day-template',
      hourBefore: 'hour-template',
      consultationReply: 'consultation-template',
    });
    expect(result.templateStatuses).toEqual({
      bookingEvent: {
        configured: true,
        enabled: true,
        availableCount: 1,
        status: 'accept',
      },
      bookingStatus: {
        configured: true,
        enabled: false,
        availableCount: 0,
        status: 'missing',
      },
      dayBefore: {
        configured: true,
        enabled: false,
        availableCount: 0,
        status: 'missing',
      },
      hourBefore: {
        configured: true,
        enabled: false,
        availableCount: 0,
        status: 'missing',
      },
      consultationReply: {
        configured: true,
        enabled: false,
        availableCount: 0,
        status: 'missing',
      },
    });
  });

  it('reserves and consumes one authorization only after a successful send', async () => {
    const { service, prisma } = createService();

    await service.sendBookingEvent(order, 'technician_new');

    expect(
      prisma.wechatSubscriptionAuthorization.updateMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ data: { availableCount: { decrement: 1 } } }),
    );
    expect(prisma.wechatSubscriptionAuthorization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ consumedCount: { increment: 1 } }),
      }),
    );
  });

  it('does not send the same notification event twice', async () => {
    const { service, prisma } = createService();
    prisma.notificationEvent.findUnique.mockResolvedValue({
      status: 'delivered',
      deliveries: [{ status: 'sent' }],
    });

    await service.sendBookingEvent(order, 'technician_new');

    expect(global.fetch).not.toHaveBeenCalled();
    expect(prisma.wechatSubscriptionAuthorization.updateMany).not.toHaveBeenCalled();
  });

  it('lets only one concurrent task claim the same delivery', async () => {
    const { service, prisma } = createService();
    prisma.notificationDelivery.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const results = await Promise.all([
      service.sendBookingEvent(order, 'technician_new'),
      service.sendBookingEvent(order, 'technician_new'),
    ]);

    expect(results.reduce((sum, item) => sum + item.sent, 0)).toBe(1);
    expect(prisma.wechatSubscriptionAuthorization.updateMany).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('clears stale local quota when WeChat reports no subscription', async () => {
    const { service, prisma } = createService();
    (global.fetch as jest.Mock)
      .mockReset()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token', expires_in: 7200 }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ errcode: 43101, errmsg: 'user refuse' }),
      } as Response);

    await service.sendBookingEvent(order, 'technician_new');

    expect(prisma.wechatSubscriptionAuthorization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'reject',
          availableCount: 0,
          lastErrorCode: '43101',
        }),
      }),
    );
  });

  it('maps the technician appointment-status template fields', async () => {
    const { service } = createService();

    await service.sendBookingStatusEvent(
      order,
      'technician',
      '已确认',
      '客户已确认预约方案，请及时查看',
      'version-1',
    );

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body);
    expect(body.template_id).toBe('technician-status-template');
    expect(body.data).toEqual({
      thing7: { value: '高级定制美甲' },
      time2: { value: '2026-10-12 14:00' },
      phrase11: { value: '已确认' },
      name6: { value: '心心' },
      thing9: { value: '客户已确认预约方案，请及时查看' },
    });
  });

  it('aggregates unread conversation messages without sending their content', async () => {
    const { service, prisma } = createService();
    prisma.message.findMany.mockResolvedValue([
      {
        id: 31,
        conversationId: 6,
        receiverType: 'technician',
        receiverId: 55,
        messageType: 'text',
        content: '敏感聊天内容',
        createdAt: new Date('2026-10-12T13:00:00+08:00'),
        conversation: {
          client: { nickname: '心心', phone: '15500000000' },
          technician: { name: '贝贝' },
        },
      },
      {
        id: 32,
        conversationId: 6,
        receiverType: 'technician',
        receiverId: 55,
        messageType: 'image',
        content: null,
        createdAt: new Date('2026-10-12T13:01:00+08:00'),
        conversation: {
          client: { nickname: '心心', phone: '15500000000' },
          technician: { name: '贝贝' },
        },
      },
    ]);

    await service.sendUnreadConversationNotifications();

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body);
    expect(body.template_id).toBe('consultation-template');
    expect(body.data.thing2.value).toBe('心心');
    expect(body.data.thing1.value).toBe('2条新消息，含图片');
    expect(JSON.stringify(body)).not.toContain('敏感聊天内容');
  });
});

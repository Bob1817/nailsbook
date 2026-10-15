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
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({ id: 9 }),
        update: jest.fn().mockResolvedValue({}),
      },
      notificationDelivery: {
        upsert: jest.fn().mockResolvedValue({ id: 10, status: 'pending' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
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

  it('uses the appointment-day template and its approved keyword mapping', async () => {
    const { service } = createService();

    await service.sendOrderReminder(order, 'day_before');

    const request = (global.fetch as jest.Mock).mock.calls[1][1];
    const body = JSON.parse(request.body);
    expect(body.template_id).toBe('day-template');
    expect(body.data).toEqual({
      thing7: { value: '高级定制美甲' },
      time2: { value: '2026-10-12 14:00' },
      thing8: { value: '杭州听栖美甲工作室' },
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
      thing8: { value: '杭州听栖美甲工作室' },
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
      thing8: { value: '杭州听栖美甲工作室' },
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

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
      wechatSubscriptionAuthorization: {
        findUnique: jest.fn().mockResolvedValue({ status: 'accept' }),
      },
      wechatIdentity: {
        findFirst: jest.fn().mockResolvedValue({ openId: 'openid-1' }),
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
});

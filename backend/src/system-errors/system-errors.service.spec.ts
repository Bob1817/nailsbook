import { SystemErrorsService } from './system-errors.service';

describe('SystemErrorsService', () => {
  let service: SystemErrorsService;
  const prisma: any = {
    systemErrorLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const dingtalkAlert: any = {
    notifySystemError: jest.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SystemErrorsService(prisma, dingtalkAlert);
  });

  it('记录异常并异步触发钉钉告警', async () => {
    prisma.systemErrorLog.create.mockResolvedValue({ id: 1 });

    const result = await service.recordError(
      {
        source: 'mini_program',
        errorType: 'js_error',
        message: 'Cannot read properties of undefined',
        stack: 'TypeError at pages/technician/profile/index.js:50',
        route: 'pages/technician/profile/index',
        userRole: 'technician',
        userId: 12,
        deviceInfo: JSON.stringify({ model: 'iPhone 15', system: 'iOS 17' }),
      },
      '127.0.0.1',
    );

    expect(result).toEqual({ success: true, id: 1 });
    expect(prisma.systemErrorLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: 'mini_program',
          errorType: 'js_error',
          message: 'Cannot read properties of undefined',
          route: 'pages/technician/profile/index',
          userId: 12,
        }),
      }),
    );
    expect(dingtalkAlert.notifySystemError).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'mini_program',
        errorType: 'js_error',
        message: 'Cannot read properties of undefined',
      }),
    );
  });

  it('获取今日与未解决异常统计', async () => {
    prisma.systemErrorLog.count
      .mockResolvedValueOnce(5) // today
      .mockResolvedValueOnce(8) // unresolved
      .mockResolvedValueOnce(20); // total
    prisma.systemErrorLog.findMany.mockResolvedValueOnce([
      { userId: 1 },
      { userId: 2 },
    ]);

    const stats = await service.getStats();
    expect(stats).toEqual({
      todayCount: 5,
      unresolvedCount: 8,
      totalCount: 20,
      impactedUsersToday: 2,
    });
  });

  it('标记异常为已排查', async () => {
    prisma.systemErrorLog.findUnique.mockResolvedValue({
      id: 1,
      resolved: false,
    });
    prisma.systemErrorLog.update.mockResolvedValue({
      id: 1,
      resolved: true,
      resolvedNote: '已修复空指针',
    });

    const res = await service.resolve(1, '已修复空指针');
    expect(res.resolved).toBe(true);
    expect(prisma.systemErrorLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          resolved: true,
          resolvedNote: '已修复空指针',
        }),
      }),
    );
  });
});

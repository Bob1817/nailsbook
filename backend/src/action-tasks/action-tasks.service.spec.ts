import { ActionTasksService } from './action-tasks.service';

describe('ActionTasksService', () => {
  it('uses stable business keys, upserts only changes, and resolves stale dynamic tasks', async () => {
    const overdueAt = new Date(Date.now() - 1000);
    const tx: any = {
      actionTask: { upsert: jest.fn(), updateMany: jest.fn() },
    };
    const prisma: any = {
      lead: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 3,
            nickname: '新客',
            status: 'new',
            nextFollowUpAt: overdueAt,
            createdAt: new Date(),
          },
        ]),
      },
      order: { findMany: jest.fn().mockResolvedValue([]) },
      customer: { findMany: jest.fn().mockResolvedValue([]) },
      actionTask: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            {
              taskKey: '7:pending_booking:order:99',
              type: 'pending_booking',
              status: 'pending',
              title: '预约申请待确认',
              description: '旧订单',
              priority: 'high',
              dueAt: null,
              actionPath: '/pages/technician/order-detail/index?id=99',
            },
          ])
          .mockResolvedValueOnce([]),
      },
      $transaction: jest.fn((fn: any) => fn(tx)),
    };
    const service = new ActionTasksService(prisma);
    await service.today(7);
    const keys = tx.actionTask.upsert.mock.calls.map(
      (x: any) => x[0].where.taskKey,
    );
    expect(keys).toContain('7:new_consultation:lead:3');
    expect(keys).toContain('7:overdue_follow_up:lead:3');
    expect(new Set(keys).size).toBe(2);
    expect(tx.actionTask.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: {
            in: expect.arrayContaining(['new_consultation', 'today_booking']),
          },
        }),
      }),
    );
  });

  it('skips transaction completely when no tasks changed and no stale dynamic tasks exist', async () => {
    const prisma: any = {
      lead: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 3,
            nickname: '新客',
            status: 'new',
            nextFollowUpAt: null,
            createdAt: new Date(),
          },
        ]),
      },
      order: { findMany: jest.fn().mockResolvedValue([]) },
      customer: { findMany: jest.fn().mockResolvedValue([]) },
      actionTask: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            {
              taskKey: '7:new_consultation:lead:3',
              type: 'new_consultation',
              status: 'pending',
              title: '新咨询待处理',
              description: '新客',
              priority: 'high',
              dueAt: null,
              actionPath: '/pages/technician/lead-detail/index?id=3',
            },
          ])
          .mockResolvedValueOnce([]),
      },
      $transaction: jest.fn(),
    };
    const service = new ActionTasksService(prisma);
    await service.today(7);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('deduplicates concurrent today() calls for the same technician', async () => {
    let resolveLeads!: (value: any[]) => void;
    const leadsPromise = new Promise<any[]>((resolve) => {
      resolveLeads = resolve;
    });
    const prisma: any = {
      lead: { findMany: jest.fn().mockReturnValue(leadsPromise) },
      order: { findMany: jest.fn().mockResolvedValue([]) },
      customer: { findMany: jest.fn().mockResolvedValue([]) },
      actionTask: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(),
    };
    const service = new ActionTasksService(prisma);
    const p1 = service.today(7);
    const p2 = service.today(7);
    resolveLeads([]);
    await Promise.all([p1, p2]);
    expect(prisma.lead.findMany).toHaveBeenCalledTimes(1);
  });

  it('requires reminder time when snoozing', async () => {
    const prisma: any = {
      actionTask: { findFirst: jest.fn().mockResolvedValue({ id: 1 }) },
    };
    await expect(
      new ActionTasksService(prisma).update(7, 1, { status: 'snoozed' }),
    ).rejects.toThrow('稍后提醒必须设置提醒时间');
  });
});

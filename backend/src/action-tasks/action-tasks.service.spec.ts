import { ActionTasksService } from './action-tasks.service';
describe('ActionTasksService', () => {
  it('uses stable business keys and upsert to prevent duplicates', async () => {
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
            nextFollowUpAt: new Date(Date.now() - 1000),
            createdAt: new Date(),
          },
        ]),
      },
      order: { findMany: jest.fn().mockResolvedValue([]) },
      customer: { findMany: jest.fn().mockResolvedValue([]) },
      actionTask: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((fn: any) => fn(tx)),
    };
    const service = new ActionTasksService(prisma);
    await service.today(7);
    await service.today(7);
    const keys = tx.actionTask.upsert.mock.calls.map(
      (x: any) => x[0].where.taskKey,
    );
    expect(keys).toContain('7:new_consultation:lead:3');
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
  it('requires reminder time when snoozing', async () => {
    const prisma: any = {
      actionTask: { findFirst: jest.fn().mockResolvedValue({ id: 1 }) },
    };
    await expect(
      new ActionTasksService(prisma).update(7, 1, { status: 'snoozed' }),
    ).rejects.toThrow('稍后提醒必须设置提醒时间');
  });
});

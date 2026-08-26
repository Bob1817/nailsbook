import { BadRequestException } from '@nestjs/common';
import { OrdersService, canTransition } from './orders.service';

describe('订单状态机 canTransition（纯规则）', () => {
  it('报价：pending_quote → pending_agree', () => {
    expect(canTransition('pending_quote', 'pending_agree')).toBe(true);
  });
  it('确认接单：pending_confirm → pending_home / pending_shop', () => {
    expect(canTransition('pending_confirm', 'pending_home')).toBe(true);
    expect(canTransition('pending_confirm', 'pending_shop')).toBe(true);
  });
  it('客户确认：pending_client_confirm → pending_confirm', () => {
    expect(canTransition('pending_client_confirm', 'pending_confirm')).toBe(true);
  });
  it('开始/完成：pending_home → in_progress → completed', () => {
    expect(canTransition('pending_home', 'in_progress')).toBe(true);
    expect(canTransition('in_progress', 'completed')).toBe(true);
  });
  it('过期可重新发起回创建流程', () => {
    expect(canTransition('expired', 'pending_quote')).toBe(true);
    expect(canTransition('expired', 'pending_confirm')).toBe(true);
  });
  it('终态不可再流转', () => {
    expect(canTransition('completed', 'in_progress')).toBe(false);
    expect(canTransition('cancelled', 'pending_quote')).toBe(false);
  });
  it('非法跨步：pending_quote → completed 拒绝', () => {
    expect(canTransition('pending_quote', 'completed')).toBe(false);
  });
  it('进行中可由美甲师确认取消', () => {
    expect(canTransition('in_progress', 'cancelled')).toBe(true);
  });
  it('未知状态 → false', () => {
    expect(canTransition('foo' as never, 'completed')).toBe(false);
  });
});

describe('OrdersService 状态守卫（美甲师端）', () => {
  let service: OrdersService;
  beforeEach(() => {
    service = new OrdersService({} as never, {} as never);
  });

  it('confirm：终态(completed) 不支持确认 → BadRequest', async () => {
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ id: 1, status: 'completed' } as never);
    await expect(service.confirm(1)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('complete：未到可完成状态(pending_quote) → BadRequest', async () => {
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ id: 1, status: 'pending_quote' } as never);
    await expect(service.complete(1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('review：非待报价(pending_confirm)不支持报价 → BadRequest', async () => {
    jest
      .spyOn(service, 'findOneForTechnician')
      .mockResolvedValue({ id: 1, status: 'pending_confirm' } as never);
    await expect(
      service.review(1, 7, {
        serviceDate: '2026-06-10',
        startTime: '10:00',
        durationMinutes: 90,
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

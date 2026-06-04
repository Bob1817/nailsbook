import { BadRequestException } from '@nestjs/common';
import { ClientOrdersService } from './client-orders.service';

describe('ClientOrdersService helpers', () => {
  const svc = new ClientOrdersService({} as any, {} as any) as any;

  it('assertSameCity 通过：同省同市', () => {
    expect(() =>
      svc.assertSameCity({ province: '上海市', city: '上海' }, { province: '上海', city: '上海市' }),
    ).not.toThrow();
  });
  it('assertSameCity 抛错：跨市', () => {
    expect(() =>
      svc.assertSameCity({ province: '江苏', city: '苏州' }, { province: '江苏', city: '南京' }),
    ).toThrow(BadRequestException);
  });
  it('assertSameCity 通过：城市相同省份为空（修复跨城误判）', () => {
    expect(() =>
      svc.assertSameCity({ province: '浙江省', city: '杭州市' }, { province: null, city: '杭州' }),
    ).not.toThrow();
  });
  it('assertSameCity 不限制：技师无城市', () => {
    expect(() => svc.assertSameCity({ city: null }, { city: '北京' })).not.toThrow();
  });
  it('assertNoBlockedConflict 抛错：存在重叠', async () => {
    const tx = { blockedTimeSlot: { findFirst: async () => ({ id: 1 }) } };
    await expect(
      svc.assertNoBlockedConflict(tx, 1, new Date('2026-06-10T10:00:00'), new Date('2026-06-10T15:00:00')),
    ).rejects.toThrow('该时间段已经被其他用户预约，请重新选择预约时间');
  });
  it('assertNoBlockedConflict 通过：无重叠', async () => {
    const tx = { blockedTimeSlot: { findFirst: async () => null } };
    await expect(
      svc.assertNoBlockedConflict(tx, 1, new Date('2026-06-10T10:00:00'), new Date('2026-06-10T15:00:00')),
    ).resolves.toBeUndefined();
  });
});

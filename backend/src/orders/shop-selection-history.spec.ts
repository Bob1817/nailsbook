import { OrdersService } from './orders.service';

describe('已有预约与当前选店状态', () => {
  const start = new Date('2099-01-05T02:00:00Z');
  const end = new Date('2099-01-05T04:00:00Z');
  it.each([false, undefined])('已有预约不受取消选店影响（%s）', async bookingSelected => {
    const prisma = { technician:{ findUnique:jest.fn().mockResolvedValue({shopAddresses:JSON.stringify([
      {name:'原门店',detailAddress:'原预约地址',enabled:false,bookingSelected}
    ])}) } };
    const service = new OrdersService(prisma as never, {} as never);
    await expect((service as any).assertTechnicianShopSchedule(7,'原预约地址',start,end,true)).resolves.toBeUndefined();
    await expect((service as any).assertTechnicianShopSchedule(7,'原预约地址',start,end,true,true)).rejects.toThrow('门店已失效');
    await expect((service as any).assertTechnicianShopSchedule(7,'其他地址',start,end,true)).rejects.toThrow('门店已失效');
  });
});

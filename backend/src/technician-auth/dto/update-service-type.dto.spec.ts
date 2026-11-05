import { ValidationPipe } from '@nestjs/common';
import { UpdateTechnicianServiceTypeDto } from './update-service-type.dto';

describe('到店店铺选择参数', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true });
  it('经过真实接口校验后保留每家店铺的选择状态', async () => {
    const payload = { shopService:false, shopAddresses:[
      { name:'A店', detailAddress:'地址A', enabled:true, bookingSelected:true },
      { name:'B店', detailAddress:'地址B', enabled:true, bookingSelected:false },
    ] };
    const result = await pipe.transform(payload, { type:'body', metatype:UpdateTechnicianServiceTypeDto });
    expect(result.shopAddresses.map(shop => shop.bookingSelected)).toEqual([true, false]);
    expect(result.shopService).toBe(false);
  });
  it('拒绝非布尔选择状态', async () => {
    await expect(pipe.transform({ shopAddresses:[{ name:'A店', bookingSelected:'true' }] },
      { type:'body', metatype:UpdateTechnicianServiceTypeDto })).rejects.toThrow();
  });
});

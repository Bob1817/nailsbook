import { assertHomeService, homeServiceQuote, publicHomeSettings, serviceFormIssues } from './service-forms';
import { TechnicianAuthService } from '../technician-auth/technician-auth.service';
import { ClientOrdersService } from '../orders/client-orders.service';

const config = { province:'浙江省', city:'杭州市', district:'西湖区', origin:{ latitude:30, longitude:120, address:'私人出发地点' }, tiers:[{ maxKm:3, feeFen:0 }, { maxKm:10, feeFen:2500 }], days:['mon'], startTime:'10:00', endTime:'18:00' };
const address = { city:'杭州市', district:'西湖区', latitude:30, longitude:120 };
describe('service forms and distance pricing', () => {
  it('requires a named enabled shop, complete home coverage, map origin, prices and hours', () => {
    expect(serviceFormIssues({ shopAddresses:'[{"name":"店铺","detailAddress":"地址"}]' }, 'shop')).toEqual([]);
    expect(serviceFormIssues({ shopAddresses:'[{"detailAddress":"地址"}]' }, 'shop')).not.toHaveLength(0);
    expect(serviceFormIssues({ homeServiceSettings:config }, 'home')).toEqual([]);
    expect(serviceFormIssues({ homeServiceSettings:{ ...config, tiers:[{ maxKm:10, feeFen:0 }, { maxKm:3, feeFen:100 }] } }, 'home').join()).toContain('档位');
    expect(serviceFormIssues({ homeServiceSettings:{ ...config, endTime:'08:00' } }, 'home').join()).toContain('时间');
  });
  it('matches the unrounded straight-line distance to ascending inclusive tiers', () => {
    expect(homeServiceQuote(config, address)).toMatchObject({ feeFen:0, distanceKm:0 });
    expect(homeServiceQuote(config, { ...address, latitude:30.05 }).feeFen).toBe(2500);
    const latitudeAtKm = (km: number) => 30 + km / 6371 * 180 / Math.PI;
    expect(homeServiceQuote(config, { ...address, latitude:latitudeAtKm(2.9999) }).feeFen).toBe(0);
    expect(homeServiceQuote(config, { ...address, latitude:latitudeAtKm(3.0001) }).feeFen).toBe(2500);
    expect(() => homeServiceQuote(config, { ...address, latitude:31 })).toThrow('最大上门距离');
    expect(() => homeServiceQuote(config, { ...address, district:'滨江区' })).toThrow('区域');
    expect(() => homeServiceQuote(config, { ...address, latitude:null })).toThrow('地图');
    expect(publicHomeSettings(config)).not.toHaveProperty('origin');
  });
  it('rejects an invalid home day and a service ending outside home hours', () => {
    expect(() => assertHomeService({ homeServiceSettings:config }, '2030-01-07', '10:00', 90)).not.toThrow();
    expect(() => assertHomeService({ homeServiceSettings:config }, '2030-01-08', '10:00', 90)).toThrow('工作日');
    expect(() => assertHomeService({ homeServiceSettings:config }, '2030-01-07', '17:30', 90)).toThrow('完整服务时间');
  });
  it('does not expose a fee quote for an address owned by another client', async () => {
    const prisma:any = { clientTechBinding:{ findFirst:jest.fn().mockResolvedValue({ technician:{ status:'active', homeService:true, homeServiceSettings:JSON.stringify(config) } }) }, clientAddress:{ findFirst:jest.fn().mockResolvedValue(null) } };
    const service = new ClientOrdersService(prisma, {} as never, {} as never);
    await expect(service.quoteHomeService(11, 7, 99)).rejects.toThrow('本人');
    expect(prisma.clientAddress.findFirst).toHaveBeenCalledWith({ where:{ id:99, clientId:11 } });
  });
  it('rejects incomplete service activation and pauses orders when all forms are disabled', async () => {
    const prisma:any = { technician:{ findUnique:jest.fn().mockResolvedValue({ id:7, status:'inactive', homeService:false, shopService:false }), update:jest.fn().mockResolvedValue({ shopAddresses:null, socialMedia:null }) } };
    const service = new TechnicianAuthService(prisma, {} as never, {} as never, {} as never);
    await expect(service.updateServiceType(7, { homeService:true })).rejects.toThrow('服务范围');
    expect(prisma.technician.update).not.toHaveBeenCalled();
    prisma.technician.findUnique.mockResolvedValue({ id:7, status:'active', homeService:true, shopService:false });
    await service.updateServiceType(7, { homeService:false });
    expect(prisma.technician.update).toHaveBeenCalledWith(expect.objectContaining({ data: { homeService:false, status:'inactive' } }));
  });
});

import { BookingQuotesService } from './booking-quotes.service';

describe('quote ownership transitions', () => {
  function setup() {
    const quote = { id: 1, technicianId: 7, clientUserId: null, status: 'viewed', version: 2, expiresAt: new Date(Date.now() + 60000), lines: [] };
    const tx = { order: { findUnique: jest.fn().mockResolvedValue(null) }, bookingQuote: { updateMany: jest.fn().mockResolvedValue({count: 0}), findUnique: jest.fn().mockResolvedValue({...quote, clientUserId: 99, status: 'accepted_pending_schedule'}) }, clientTechBinding: {upsert:jest.fn()}, customer:{upsert:jest.fn()} };
    const prisma = { bookingQuote:{findUnique:jest.fn().mockResolvedValue(quote),updateMany:jest.fn().mockResolvedValue({count:0})},clientUser:{findUnique:jest.fn().mockResolvedValue({id:8,status:'active'})},clientTechBinding:{count:jest.fn().mockResolvedValue(0)},$transaction:jest.fn(fn=>fn(tx)) };
    return { service:new BookingQuotesService(prisma as any,{} as any,{} as any),tx,prisma,quote };
  }
  it('losing a claim cannot create a binding or customer', async()=>{
    const {service,tx}=setup();
    await expect(service.accept(8,'a'.repeat(48))).rejects.toThrow('报价已被确认');
    expect(tx.bookingQuote.updateMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({clientUserId:null,version:2,expiresAt:{gt:expect.any(Date)}})}));
    expect(tx.clientTechBinding.upsert).not.toHaveBeenCalled();expect(tx.customer.upsert).not.toHaveBeenCalled();
  });
  it('a repeated acceptance by its owner is idempotent', async()=>{
    const {service,prisma,quote}=setup();
    prisma.bookingQuote.findUnique.mockResolvedValue({...quote,clientUserId:8,status:'accepted_pending_schedule'} as any);
    await expect(service.accept(8,'a'.repeat(48))).resolves.toMatchObject({clientUserId:8});
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it.each([['accepted_pending_schedule',8,true],['accepted_pending_schedule',99,false],['withdrawn',8,false],['booked',8,false]])('schedule capability for %s / %s',async(status,owner,expected)=>{
    const {service,prisma,quote}=setup();prisma.bookingQuote.findUnique.mockResolvedValue({...quote,status,clientUserId:owner} as any);
    expect((await service.clientDetail(8,'a'.repeat(48))).canSchedule).toBe(expected);
  });
  it('cannot decline after order creation even before quote finalization', async () => {
    const {service,tx}=setup();tx.order.findUnique.mockResolvedValue({id:42} as any);
    await expect(service.declineOwned(8,'a'.repeat(48),'放弃')).rejects.toThrow('预约已创建');
    expect(tx.bookingQuote.updateMany).not.toHaveBeenCalled();
  });
  it('formal decline cannot end another customer quote',async()=>{
    const {service,tx}=setup();await expect(service.declineOwned(8,'a'.repeat(48),'放弃')).rejects.toThrow('只能放弃本人');
    expect(tx.bookingQuote.updateMany).toHaveBeenCalledWith(expect.objectContaining({where:{id:1,clientUserId:8,status:'accepted_pending_schedule',version:2}}));
  });
});

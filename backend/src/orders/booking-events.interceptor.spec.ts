import { of, throwError, lastValueFrom } from 'rxjs';
import { BookingEventsInterceptor } from './booking-events.interceptor';

describe('BookingEventsInterceptor', () => {
  const order = { id: 12, technicianId: 7, clientUserId: 4 };
  let prisma: any, chat: any, interceptor: BookingEventsInterceptor;
  beforeEach(() => {
    prisma = { order: { findUnique: jest.fn().mockResolvedValue(order) } };
    chat = { broadcastBookingChanged: jest.fn() };
    interceptor = new BookingEventsInterceptor(prisma, chat);
  });
  function context(method = 'PATCH', user = { technicianId: 7 }, name = 'update') {
    return { switchToHttp: () => ({ getRequest: () => ({method, user, params:{id:'12'}}) }),
      getHandler: () => ({name}) } as any;
  }
  it('emits after a successful mutation and returns the original result', async () => {
    const result = { id:12 };
    expect(await lastValueFrom(interceptor.intercept(context(), {handle:()=>of(result)}))).toBe(result);
    expect(chat.broadcastBookingChanged).toHaveBeenCalledWith(order);
  });
  it('never emits for failed transactions or reads', async () => {
    await expect(lastValueFrom(interceptor.intercept(context(), {handle:()=>throwError(()=>new Error('rollback'))}))).rejects.toThrow('rollback');
    await lastValueFrom(interceptor.intercept(context('GET'), {handle:()=>of(order)}));
    expect(chat.broadcastBookingChanged).not.toHaveBeenCalled();
  });
  it('checks persisted ownership instead of trusting a destination supplied by the request', async () => {
    await lastValueFrom(interceptor.intercept(context('PATCH',{technicianId:8}), {handle:()=>of(order)}));
    expect(chat.broadcastBookingChanged).not.toHaveBeenCalled();
  });
  it('uses the newly created ID for repeat bookings', async () => {
    await lastValueFrom(interceptor.intercept(context('POST',{technicianId:7},'repeat'), {handle:()=>of({id:99})}));
    expect(prisma.order.findUnique.mock.calls[0][0].where.id).toBe(99);
  });
});

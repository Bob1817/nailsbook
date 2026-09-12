import { PrismaClient } from '@prisma/client';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { execFileSync } from 'child_process';
import { OrdersService } from './orders.service';
import { ClientOrdersService } from './client-orders.service';
import { BookingMutexService } from './booking-mutex.service';
import { proposalSnapshot } from './booking-proposal';

describe('预约报价与排期数据库集成', () => {
  let prisma: PrismaClient, orders: OrdersService, clients: ClientOrdersService, directory: string;
  let tech: number, client: number, customer: number, base: any;
  let serial = 0;
  beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), 'nailbook-proposal-'));
    const db = join(directory, 'test.db');
    const sql = execFileSync('npx', ['prisma', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script']);
    execFileSync('sqlite3', [db], { input: sql });
    prisma = new PrismaClient({ datasources: { db: { url: `file:${db}` } } });
    const chat = { server: { to: () => ({ emit() {} }) } };
    const mutex = new BookingMutexService();
    orders = new OrdersService(prisma as any, chat as any, mutex);
    clients = new ClientOrdersService(prisma as any, chat as any, {} as any, mutex, undefined, undefined, undefined, undefined, orders);
    const technician = await prisma.technician.create({ data: { name: '测试美甲师', phone: 'test-tech', status: 'active', shopService: true, shopAddresses: JSON.stringify([{ name: '测试店', detailAddress: '测试地址', enabled: true }]) } });
    tech = technician.id;
    client = (await prisma.clientUser.create({ data: { phone: 'test-client' } })).id;
    customer = (await prisma.customer.create({ data: { technicianId: tech, clientUserId: client, name: '客户', phone: 'test-client' } })).id;
    base = await prisma.service.create({ data: { technicianId: tech, publicId: 'base', name: '色胶上色', category: 'color_style', priceMinFen: 20000, durationMinutes: 120 } });
    await prisma.service.create({ data: { technicianId: tech, publicId: 'night', name: '晚间服务费', category: 'surcharge_night', priceMinFen: 5000, durationMinutes: 0 } });
  });
  afterAll(async () => { await prisma?.$disconnect(); if (directory) rmSync(directory, { recursive: true, force: true }); });

  async function application(known = false) {
    const line = { serviceId: base.id, servicePublicIdSnapshot: 'base', nameSnapshot: '色胶上色', unitPriceFen: 20000, subtotalFen: 20000, quantity: 1, durationMinutes: 120, sortOrder: 0, source: 'standard' };
    const data = { orderNo: `test-${++serial}`, technicianId: tech, customerId: customer, clientUserId: client, address: '测试地址', serviceType: '到店美甲', status: known ? 'pending_confirm' : 'pending_quote', startTime: new Date('2099-01-05T02:00:00Z'), endTime: new Date('2099-01-05T04:00:00Z'), finalPriceFen: known ? 20000 : null, totalDurationMinutes: known ? 120 : 0, serviceSubtotalFen: known ? 20000 : 0, depositModeSnapshot: 'percentage', depositValueSnapshot: 2000, depositAmount: known ? 40 : null };
    await prisma.blockedTimeSlot.deleteMany();
    return prisma.order.create({ data: { ...data, acceptedProposal: known ? proposalSnapshot(data, [line]) : null, serviceLines: known ? { create: line } : undefined } });
  }
  const quote = (extra: any = {}) => ({ services: [{ servicePublicId: 'base' }], serviceDate: '2099-01-05', startTime: '10:00', ...extra });

  it('未知方案加入基础组合和附加费后待客户确认，不占档；接受后只排期一次', async () => {
    const order = await application();
    const result = await orders.review(order.id, tech, quote({ corePriceFen: 18000, surchargeIds: ['night'], finalPriceFen: 22000 }));
    expect(result.status).toBe('pending_agree');
    expect(result.depositAmount).toBe(44);
    expect(await prisma.blockedTimeSlot.count({ where: { orderId: order.id } })).toBe(0);
    expect(await prisma.orderServiceLine.count({ where: { orderId: order.id, source: 'surcharge' } })).toBe(1);
    await clients.agree(client, order.id, 0, 1);
    await clients.agree(client, order.id, 0, 1);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('pending_shop');
    expect(await prisma.blockedTimeSlot.count({ where: { orderId: order.id } })).toBe(1);
    expect(await prisma.bookingTradeOrder.count({ where: { bookingId: order.id } })).toBe(1);
  });

  it('完整方案无变化，美甲师确认后直接排期', async () => {
    const order = await application(true);
    const result = await orders.review(order.id, tech, quote({ useCurrentServices: true, services: [] }));
    expect(result.status).toBe('pending_shop');
  });

  it('旧版本不能确认；再次报价不需要客户先拒绝', async () => {
    const order = await application();
    await orders.review(order.id, tech, quote());
    await orders.review(order.id, tech, quote({ quoteVersion: 1, finalPriceFen: 19000 }));
    await expect(clients.agree(client, order.id, 0, 1)).rejects.toThrow('报价已更新');
    await expect(clients.rejectQuote(client, order.id, '旧方案', 1)).rejects.toThrow('预约方案已更新');
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('pending_agree');
    expect(await prisma.blockedTimeSlot.count({ where: { orderId: order.id } })).toBe(0);
    await clients.agree(client, order.id, 0, 2);
  });

  it('确认时被其他排期占用，事务不产生交易或确认状态', async () => {
    const order = await application();
    await orders.review(order.id, tech, quote());
    await prisma.blockedTimeSlot.create({ data: { techId: tech, startTime: order.startTime, endTime: order.endTime, reason: 'manual' } });
    await expect(clients.agree(client, order.id, 0, 1)).rejects.toThrow('该时间段已被预约');
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('pending_agree');
    expect(await prisma.bookingTradeOrder.count({ where: { bookingId: order.id } })).toBe(0);
  });

  it('标记实收只写一次流水，拒绝后再报价也不清除收款', async () => {
    const order = await application();
    await orders.review(order.id, tech, quote({ depositAmount: 60, isDepositPaid: true }));
    await orders.review(order.id, tech, quote({ quoteVersion: 1, depositAmount: 60, isDepositPaid: true }));
    expect(await prisma.paymentOrder.count({ where: { orderId: order.id } })).toBe(1);
    await clients.rejectQuote(client, order.id, '调整款式', (await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).quoteVersion);
    expect(await prisma.paymentOrder.count({ where: { orderId: order.id } })).toBe(1);
    await orders.review(order.id, tech, quote({ quoteVersion: 2, depositAmount: 60, isDepositPaid: true }));
    await clients.agree(client, order.id, 0, 3);
    expect(await prisma.paymentOrder.count({ where: { orderId: order.id } })).toBe(1);
  });
});

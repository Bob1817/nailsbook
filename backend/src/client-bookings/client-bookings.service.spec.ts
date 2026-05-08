import { NotFoundException } from '@nestjs/common';
import { ClientBookingsService } from './client-bookings.service';

describe('ClientBookingsService', () => {
  let service: ClientBookingsService;
  let prisma: {
    clientTechBinding: { findUnique: jest.Mock };
    clientAddress: { findFirst: jest.Mock };
    clientUser: { findUnique: jest.Mock };
    booking: { findMany: jest.Mock; count: jest.Mock; findFirst: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      clientTechBinding: {
        findUnique: jest.fn(),
      },
      clientAddress: {
        findFirst: jest.fn(),
      },
      clientUser: {
        findUnique: jest.fn(),
      },
      booking: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    service = new ClientBookingsService(prisma as never);
  });

  it('reuses the existing exact technician-client customer row and maps the booking response', async () => {
    prisma.clientTechBinding.findUnique.mockResolvedValueOnce({
      clientId: 11,
      techId: 7,
    });
    prisma.clientAddress.findFirst.mockResolvedValueOnce({
      id: 12,
      clientId: 11,
      contactName: 'Luna',
      contactPhone: '13900000000',
      province: 'Shanghai',
      city: 'Shanghai',
      district: 'Pudong',
      detailAddress: 'Lane 88',
      doorInfo: '1802',
    });
    prisma.clientUser.findUnique.mockResolvedValueOnce({
      id: 11,
      nickname: 'Luna',
      phone: '13900000000',
    });

    const tx = {
      customer: {
        upsert: jest.fn().mockResolvedValue({
          id: 21,
          technicianId: 7,
          clientUserId: 11,
          name: 'Luna',
          phone: '13900000000',
        }),
        create: jest.fn(),
      },
      quote: {
        create: jest.fn().mockResolvedValue({
          id: 31,
          quoteNo: 'QT001',
          technicianId: 7,
          customerId: 21,
          title: '手部美甲',
          description: '想做粉色渐变',
          price: 0,
          depositAmount: 0,
          status: 'pending',
          createdAt: new Date('2026-04-29T10:00:00.000Z'),
          updatedAt: new Date('2026-04-29T10:00:00.000Z'),
        }),
      },
      booking: {
        create: jest.fn().mockResolvedValue({
          id: 41,
          bookingNo: 'BK001',
          quoteId: 31,
          technicianId: 7,
          customerId: 21,
          clientUserId: 11,
          addressId: 12,
          designRequestId: null,
          startTime: new Date('2026-05-01T14:00:00.000Z'),
          endTime: new Date('2026-05-01T16:00:00.000Z'),
          address: 'Shanghai Shanghai Pudong Lane 88 1802',
          serviceType: '手部美甲',
          remark: '想做粉色渐变',
          quotePrice: 0,
          status: 'pending_confirm',
          isDepositPaid: false,
          depositAmount: 0,
          depositStatus: 'pending',
          source: 'client_webapp',
          createdAt: new Date('2026-04-29T10:00:00.000Z'),
          updatedAt: new Date('2026-04-29T10:00:00.000Z'),
          quote: {
            id: 31,
            quoteNo: 'QT001',
            title: '手部美甲',
            description: '想做粉色渐变',
            price: 0,
            status: 'pending',
          },
          technician: {
            id: 7,
            name: 'Anna',
            phone: '13800000000',
          },
          customer: {
            id: 21,
            name: 'Luna',
            phone: '13900000000',
          },
          clientAddress: {
            id: 12,
            contactName: 'Luna',
            contactPhone: '13900000000',
            province: 'Shanghai',
            city: 'Shanghai',
            district: 'Pudong',
            detailAddress: 'Lane 88',
            doorInfo: '1802',
          },
        }),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: (tx: typeof tx) => Promise<unknown>) => {
      return callback(tx);
    });

    const result = await service.create(11, {
      serviceDate: '2026-05-01',
      startTime: '14:00',
      addressId: 12,
      serviceType: '手部美甲',
      remark: '想做粉色渐变',
    });

    expect(tx.customer.upsert).toHaveBeenCalledWith({
      where: {
        technicianId_clientUserId: {
          technicianId: 7,
          clientUserId: 11,
        },
      },
      update: {},
      create: {
        technicianId: 7,
        clientUserId: 11,
        name: 'Luna',
        phone: '13900000000',
        address: 'Shanghai Shanghai Pudong Lane 88 1802',
      },
    });
    expect(tx.quote.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        technicianId: 7,
        customerId: 21,
        title: '手部美甲',
        description: '想做粉色渐变',
        price: 0,
        status: 'pending',
      }),
    });
    expect(tx.booking.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        quoteId: 31,
        technicianId: 7,
        customerId: 21,
        clientUserId: 11,
        addressId: 12,
        startTime: new Date('2026-05-01T14:00:00'),
        endTime: new Date('2026-05-01T14:00:00'),
        serviceType: '手部美甲',
        remark: '想做粉色渐变',
        source: 'client_webapp',
      }),
      include: expect.any(Object),
    });
    expect(result).toMatchObject({
      id: 41,
      status: 'pending_quote',
      source: 'client_webapp',
      serviceType: '手部美甲',
      quote: {
        id: 31,
        status: 'pending',
      },
    });
  });

  it('creates a new customer for the technician-client pair when none exists yet', async () => {
    prisma.clientTechBinding.findUnique.mockResolvedValueOnce({
      clientId: 11,
      techId: 7,
    });
    prisma.clientAddress.findFirst.mockResolvedValueOnce({
      id: 12,
      clientId: 11,
      contactName: 'Luna',
      contactPhone: '13900000000',
      province: 'Shanghai',
      city: 'Shanghai',
      district: 'Pudong',
      detailAddress: 'Lane 88',
      doorInfo: '1802',
    });
    prisma.clientUser.findUnique.mockResolvedValueOnce({
      id: 11,
      nickname: 'Luna',
      phone: '13900000000',
    });

    const tx = {
      customer: {
        upsert: jest.fn().mockResolvedValue({
          id: 21,
          technicianId: 7,
          clientUserId: 11,
          name: 'Luna',
          phone: '13900000000',
        }),
      },
      quote: {
        create: jest.fn().mockResolvedValue({
          id: 31,
          quoteNo: 'QT001',
          technicianId: 7,
          customerId: 21,
          title: '手部美甲',
          description: '想做粉色渐变',
          price: 0,
          depositAmount: 0,
          status: 'pending',
        }),
      },
      booking: {
        create: jest.fn().mockResolvedValue({
          id: 41,
          bookingNo: 'BK001',
          quoteId: 31,
          technicianId: 7,
          customerId: 21,
          clientUserId: 11,
          addressId: 12,
          startTime: new Date('2026-05-01T14:00:00.000Z'),
          endTime: new Date('2026-05-01T14:00:00.000Z'),
          address: 'Shanghai Shanghai Pudong Lane 88 1802',
          serviceType: '手部美甲',
          remark: '想做粉色渐变',
          quotePrice: 0,
          status: 'pending_confirm',
          isDepositPaid: false,
          depositAmount: 0,
          depositStatus: 'pending',
          source: 'client_webapp',
          createdAt: new Date('2026-04-29T10:00:00.000Z'),
          updatedAt: new Date('2026-04-29T10:00:00.000Z'),
          quote: {
            id: 31,
            quoteNo: 'QT001',
            title: '手部美甲',
            description: '想做粉色渐变',
            price: 0,
            status: 'pending',
          },
          technician: {
            id: 7,
            name: 'Anna',
            phone: '13800000000',
          },
          customer: {
            id: 21,
            name: 'Luna',
            phone: '13900000000',
          },
          clientAddress: null,
        }),
      },
    };

    prisma.$transaction.mockImplementationOnce(
      async (callback: (tx: typeof tx) => Promise<unknown>) => callback(tx),
    );

    await service.create(11, {
      serviceDate: '2026-05-01',
      startTime: '14:00',
      addressId: 12,
      serviceType: '手部美甲',
      remark: '想做粉色渐变',
    });

    expect(tx.customer.upsert).toHaveBeenCalledWith({
      where: {
        technicianId_clientUserId: {
          technicianId: 7,
          clientUserId: 11,
        },
      },
      update: {},
      create: {
        technicianId: 7,
        clientUserId: 11,
        name: 'Luna',
        phone: '13900000000',
        address: 'Shanghai Shanghai Pudong Lane 88 1802',
      },
    });
  });

  it('rejects creating a booking when the address does not belong to the current client', async () => {
    prisma.clientTechBinding.findUnique.mockResolvedValueOnce({
      clientId: 11,
      techId: 7,
    });
    prisma.clientAddress.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.create(11, {
        serviceDate: '2026-05-01',
        startTime: '14:00',
        addressId: 99,
        serviceType: '手部美甲',
      }),
    ).rejects.toThrow(new NotFoundException('地址不存在'));
  });

  it('lists only current client bookings and maps internal booking state to client-facing status', async () => {
    prisma.booking.findMany.mockResolvedValueOnce([
      {
        id: 41,
        bookingNo: 'BK001',
        quoteId: 31,
        technicianId: 7,
        customerId: 21,
        clientUserId: 11,
        addressId: 12,
        startTime: new Date('2026-05-01T14:00:00.000Z'),
        endTime: new Date('2026-05-01T16:00:00.000Z'),
        address: 'Studio',
        serviceType: '手部美甲',
        remark: null,
        quotePrice: 168,
        status: 'pending_confirm',
        isDepositPaid: true,
        depositAmount: 50,
        depositStatus: 'paid',
        source: 'client_webapp',
        createdAt: new Date('2026-04-29T10:00:00.000Z'),
        updatedAt: new Date('2026-04-29T10:00:00.000Z'),
        quote: {
          id: 31,
          quoteNo: 'QT001',
          title: '手部美甲',
          description: null,
          price: 168,
          status: 'accepted',
        },
        technician: {
          id: 7,
          name: 'Anna',
          phone: '13800000000',
        },
        customer: {
          id: 21,
          name: 'Luna',
          phone: '13900000000',
        },
        clientAddress: null,
      },
    ]);
    prisma.booking.count.mockResolvedValueOnce(1);

    const result = await service.findAll(11);

    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: { clientUserId: 11 },
      orderBy: [{ startTime: 'desc' }, { createdAt: 'desc' }],
      include: expect.any(Object),
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: 41,
        status: 'deposit_paid',
      }),
    ]);
  });

  it('keeps confirmed bookings mapped as confirmed without inferring in-service from timestamps', async () => {
    prisma.booking.findMany.mockResolvedValueOnce([
      {
        id: 42,
        bookingNo: 'BK002',
        quoteId: 32,
        technicianId: 7,
        customerId: 21,
        clientUserId: 11,
        addressId: 12,
        startTime: new Date('2026-05-01T14:00:00.000Z'),
        endTime: new Date('2026-05-01T14:00:00.000Z'),
        address: 'Studio',
        serviceType: '手部美甲',
        remark: null,
        quotePrice: 168,
        status: 'confirmed',
        isDepositPaid: true,
        depositAmount: 50,
        depositStatus: 'paid',
        source: 'client_webapp',
        createdAt: new Date('2026-04-29T10:00:00.000Z'),
        updatedAt: new Date('2026-04-29T10:00:00.000Z'),
        quote: {
          id: 32,
          quoteNo: 'QT002',
          title: '手部美甲',
          description: null,
          price: 168,
          status: 'accepted',
        },
        technician: {
          id: 7,
          name: 'Anna',
          phone: '13800000000',
        },
        customer: {
          id: 21,
          name: 'Luna',
          phone: '13900000000',
        },
        clientAddress: null,
      },
    ]);

    const result = await service.findAll(11);

    expect(result).toEqual([
      expect.objectContaining({
        id: 42,
        status: 'confirmed',
      }),
    ]);
  });

  it('rejects reading a booking that does not belong to the current client', async () => {
    prisma.booking.findFirst.mockResolvedValueOnce(null);

    await expect(service.findOne(11, 41)).rejects.toThrow(
      new NotFoundException('预约不存在'),
    );
    expect(prisma.booking.findFirst).toHaveBeenCalledWith({
      where: {
        id: 41,
        clientUserId: 11,
      },
      include: expect.any(Object),
    });
  });
});

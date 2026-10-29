import { BadRequestException, ConflictException } from '@nestjs/common';
import { BookingDaysService } from './booking-days.service';

describe('BookingDaysService capacity policy', () => {
  const mutex = { runExclusive: jest.fn() };

  it('adds the configured cleanup buffer and accepts the last available daily slot', async () => {
    const tx = {
      technicianBookingDay: { findUnique: jest.fn().mockResolvedValue(null) },
      technician: { findUnique: jest.fn().mockResolvedValue({ dailyBookingLimit: 2, appointmentBufferMinutes: 60 }) },
      blockedTimeSlot: { count: jest.fn().mockResolvedValue(1) },
    };
    const service = new BookingDaysService({} as never, mutex as never);
    const end = new Date('2026-10-15T04:00:00.000Z');

    const result = await service.prepareSlot(tx as never, 7, '2026-10-15', end);

    expect(result.bookingCount).toBe(1);
    expect(result.blockEndTime.toISOString()).toBe('2026-10-15T05:00:00.000Z');
  });

  it('rejects another booking when the daily limit is reached', async () => {
    const tx = {
      technicianBookingDay: { findUnique: jest.fn().mockResolvedValue(null) },
      technician: { findUnique: jest.fn().mockResolvedValue({ dailyBookingLimit: 2, appointmentBufferMinutes: 60 }) },
      blockedTimeSlot: { count: jest.fn().mockResolvedValue(2) },
    };
    const service = new BookingDaysService({} as never, mutex as never);

    await expect(service.prepareSlot(tx as never, 7, '2026-10-15', new Date())).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows an existing booking to continue on a day closed to new intake', async () => {
    const tx = {
      technicianBookingDay: { findUnique: jest.fn() },
      technician: { findUnique: jest.fn().mockResolvedValue({ dailyBookingLimit: 2, appointmentBufferMinutes: 60 }) },
      blockedTimeSlot: { count: jest.fn().mockResolvedValue(1) },
    };
    const service = new BookingDaysService({} as never, mutex as never);

    await service.prepareSlot(tx as never, 7, '2026-10-15', new Date(), 42, true);

    expect(tx.technicianBookingDay.findUnique).not.toHaveBeenCalled();
  });

  it('accepts capacity values within the supported stepper ranges', async () => {
    const update = jest.fn().mockResolvedValue({ dailyBookingLimit: 8, appointmentBufferMinutes: 150 });
    const service = new BookingDaysService({ technician: { update } } as never, mutex as never);

    await expect(service.updateCapacity(7, 8, 150)).resolves.toEqual({ dailyBookingLimit: 8, appointmentBufferMinutes: 150 });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { dailyBookingLimit: 8, appointmentBufferMinutes: 150 } }));
  });

  it('rejects values outside the supported stepper ranges', async () => {
    const service = new BookingDaysService({ technician: { update: jest.fn() } } as never, mutex as never);
    await expect(service.updateCapacity(7, 0, 60)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.updateCapacity(7, 11, 60)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.updateCapacity(7, 2, 22)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.updateCapacity(7, 2, 195)).rejects.toBeInstanceOf(BadRequestException);
  });

  describe('manual blocked slots management', () => {
    it('creates a manual blocked slot when valid and non-conflicting', async () => {
      const prisma = {
        order: { findFirst: jest.fn().mockResolvedValue(null) },
        blockedTimeSlot: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 101, ...data })),
        },
      };
      const service = new BookingDaysService(prisma as never, mutex as never);
      const res = await service.createBlockedSlot(7, {
        startTime: '2026-10-30T14:00:00.000Z',
        endTime: '2026-10-30T16:00:00.000Z',
        reason: '私人事项',
      });
      expect(res.id).toBe(101);
      expect(res.reason).toBe('私人事项');
      expect(prisma.blockedTimeSlot.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ techId: 7, reason: '私人事项', orderId: null }),
      }));
    });

    it('rejects slot creation if conflicting with existing order', async () => {
      const prisma = {
        order: { findFirst: jest.fn().mockResolvedValue({ id: 50, orderNo: 'ORD-50' }) },
        blockedTimeSlot: { findFirst: jest.fn() },
      };
      const service = new BookingDaysService(prisma as never, mutex as never);
      await expect(
        service.createBlockedSlot(7, {
          startTime: '2026-10-30T14:00:00.000Z',
          endTime: '2026-10-30T16:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deletes an existing manual slot owned by the technician', async () => {
      const prisma = {
        blockedTimeSlot: {
          findFirst: jest.fn().mockResolvedValue({ id: 101, techId: 7, orderId: null }),
          delete: jest.fn().mockResolvedValue({ id: 101 }),
        },
      };
      const service = new BookingDaysService(prisma as never, mutex as never);
      const res = await service.deleteBlockedSlot(7, 101);
      expect(res).toEqual({ success: true });
      expect(prisma.blockedTimeSlot.delete).toHaveBeenCalledWith({ where: { id: 101 } });
    });
  });
});


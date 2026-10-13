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
});

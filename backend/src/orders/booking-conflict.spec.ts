import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { throwIfBookingSlotConflict } from './booking-conflict';

describe('booking slot database conflict', () => {
  it('maps the unique technician/start-time conflict to a client-safe error', () => {
    const error = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: '5.22.0',
      meta: { target: ['techId', 'startTime'] },
    });
    expect(() => throwIfBookingSlotConflict(error)).toThrow(
      BadRequestException,
    );
  });

  it('does not hide unrelated database errors', () => {
    const error = new Error('database unavailable');
    expect(() => throwIfBookingSlotConflict(error)).toThrow(error);
  });
});

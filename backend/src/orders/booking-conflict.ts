import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export const BOOKING_CONFLICT_MESSAGE =
  '该时间段已经被其他用户预约，请重新选择预约时间';

export const DEFAULT_BOOKING_DURATION_MINUTES = 5 * 60;

export function throwIfBookingSlotConflict(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    Array.isArray(error.meta?.target) &&
    error.meta.target.includes('techId') &&
    error.meta.target.includes('startTime')
  ) {
    throw new BadRequestException(BOOKING_CONFLICT_MESSAGE);
  }
  throw error;
}

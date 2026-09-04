import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// 在创建预约的同一事务中检查，避免注销检查通过后仍写入新预约。
export async function assertBookingAccountState(tx: Prisma.TransactionClient, technicianId: number, clientUserId?: number | null) {
  const technician = await tx.technician.findUnique({ where: { id: technicianId }, select: { status: true } });
  if (!technician || ['deleted', 'suspended'].includes(technician.status)) throw new ConflictException('美甲师账号不可预约');
  if (clientUserId) {
    const client = await tx.clientUser.findUnique({ where: { id: clientUserId }, select: { status: true } });
    if (!client || client.status !== 'active') throw new ConflictException('客户账号不可预约');
  }
}

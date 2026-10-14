import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

export const REGISTERED_PHONE = '该手机号码已注册，无法再次注册';
export const ROLE_CONFLICT = '该手机号存在历史账号角色冲突，请联系管理员处理';
export const ROLE_SWITCH_DISABLED = '不支持切换账号角色，请注销后再注册';
export const INVALID_CLIENT_BINDING = '该账户关联美甲师账号异常，请联系您的美甲师';
export const INVALID_ARTIST_INVITE = '美甲师账号异常，无法进行关联注册，请联系美甲师';

export function phoneVariants(phone: string) {
  const plain = phone.trim().replace(/^\+86(?=1\d{10}$)/, '');
  return /^1\d{10}$/.test(plain) ? [plain, `+86${plain}`] : [plain];
}

export async function phoneAccounts(db: Prisma.TransactionClient, phone: string) {
  const phones = phoneVariants(phone);
  const [client, technician] = await Promise.all([
    db.clientUser.findFirst({
      where: { phone: { in: phones }, status: { not: 'deleted' } },
    }),
    db.technician.findFirst({
      where: { phone: { in: phones }, status: { not: 'deleted' } },
    }),
  ]);
  return { client, technician };
}

export async function assertPhoneAvailable(
  db: Prisma.TransactionClient,
  phone: string,
  reservedTechnicianId?: number,
) {
  const { client, technician } = await phoneAccounts(db, phone);
  if (client || (technician && (technician.id !== reservedTechnicianId || technician.passwordHash))) {
    throw new ConflictException(REGISTERED_PHONE);
  }
}

export async function resolvePhoneRole(
  db: Prisma.TransactionClient,
  phone: string,
) {
  const accounts = await phoneAccounts(db, phone);
  if (accounts.client && accounts.technician) throw new ConflictException(ROLE_CONFLICT);
  return { ...accounts, role: accounts.technician ? 'technician' as const : accounts.client ? 'client' as const : null };
}

export async function assertClientBinding(
  db: Prisma.TransactionClient,
  clientId: number,
) {
  const binding = await db.clientTechBinding.findFirst({
    where: { clientId, status: 'active', technician: { status: { in: ['active', 'inactive'] } } },
    select: { id: true },
  });
  if (!binding) throw new UnauthorizedException(INVALID_CLIENT_BINDING);
}

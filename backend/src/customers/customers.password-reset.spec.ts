import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CustomersService } from './customers.service';
import { decryptManagedPassword } from '../common/auth/managed-password';

describe('CustomersService password reset', () => {
  let service: CustomersService;
  let prisma: {
    customer: { findUnique: jest.Mock };
    clientUser: { update: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      customer: { findUnique: jest.fn() },
      clientUser: { update: jest.fn() },
    };
    service = new CustomersService(prisma as never);
  });

  it('resets a linked active client to a random password and invalidates tokens', async () => {
    prisma.customer.findUnique.mockResolvedValueOnce({
      clientUserId: 23,
      clientUser: { status: 'active' },
    });
    prisma.clientUser.update.mockResolvedValueOnce({ id: 23 });

    const result = await service.resetPassword(8);

    expect(result.tempPassword).toMatch(/^[A-Za-z2-9]{12}$/);
    const update = prisma.clientUser.update.mock.calls[0][0];
    expect(update.where).toEqual({ id: 23 });
    expect(update.data.tokenVersion).toEqual({ increment: 1 });
    expect(decryptManagedPassword(update.data.managedPasswordCiphertext)).toBe(
      result.tempPassword,
    );
    await expect(
      bcrypt.compare(result.tempPassword, update.data.passwordHash),
    ).resolves.toBe(true);
  });

  it('rejects a historical customer without a linked login account', async () => {
    prisma.customer.findUnique.mockResolvedValueOnce({
      clientUserId: null,
      clientUser: null,
    });

    await expect(service.resetPassword(8)).rejects.toThrow(
      new BadRequestException('该客户尚未关联登录账号，无法重置密码'),
    );
    expect(prisma.clientUser.update).not.toHaveBeenCalled();
  });

  it('rejects an unknown customer', async () => {
    prisma.customer.findUnique.mockResolvedValueOnce(null);

    await expect(service.resetPassword(8)).rejects.toThrow(
      new NotFoundException('客户不存在'),
    );
  });
});

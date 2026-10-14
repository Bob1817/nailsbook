import { ConflictException, UnauthorizedException } from '@nestjs/common';
import {
  assertClientBinding,
  assertPhoneAvailable,
  INVALID_CLIENT_BINDING,
  REGISTERED_PHONE,
  resolvePhoneRole,
  ROLE_CONFLICT,
} from './account-role-policy';

describe('account role policy', () => {
  const makeDb = (
    client: any = null,
    technician: any = null,
    binding: any = { id: 1 },
  ) => ({
    clientUser: { findFirst: jest.fn().mockResolvedValue(client) },
    technician: { findFirst: jest.fn().mockResolvedValue(technician) },
    clientTechBinding: { findFirst: jest.fn().mockResolvedValue(binding) },
  });

  it.each([
    [{ id: 1 }, null],
    [null, { id: 55, passwordHash: 'hash' }],
  ])('blocks registration when either role already exists', async (client, technician) => {
    await expect(
      assertPhoneAvailable(makeDb(client, technician) as never, '15267003169'),
    ).rejects.toEqual(new ConflictException(REGISTERED_PHONE));
  });

  it('allows activation only for the preallocated, passwordless technician', async () => {
    const db = makeDb(null, { id: 55, passwordHash: null });
    await expect(
      assertPhoneAvailable(db as never, '+8615267003169', 55),
    ).resolves.toBeUndefined();
    expect(db.technician.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          phone: { in: ['15267003169', '+8615267003169'] },
        }),
      }),
    );
  });

  it('returns the one registered role', async () => {
    await expect(
      resolvePhoneRole(makeDb(null, { id: 55 }) as never, '15267003169'),
    ).resolves.toMatchObject({ role: 'technician', technician: { id: 55 } });
  });

  it('stops a historical dual-role conflict', async () => {
    await expect(
      resolvePhoneRole(makeDb({ id: 1 }, { id: 55 }) as never, '15267003169'),
    ).rejects.toEqual(new ConflictException(ROLE_CONFLICT));
  });

  it('allows clients with an active binding to a usable technician', async () => {
    const db = makeDb();
    await expect(assertClientBinding(db as never, 9)).resolves.toBeUndefined();
    expect(db.clientTechBinding.findFirst).toHaveBeenCalledWith({
      where: {
        clientId: 9,
        status: 'active',
        technician: { status: { in: ['active', 'inactive'] } },
      },
      select: { id: true },
    });
  });

  it('rejects a client when every linked technician is abnormal', async () => {
    await expect(
      assertClientBinding(makeDb(null, null, null) as never, 9),
    ).rejects.toEqual(new UnauthorizedException(INVALID_CLIENT_BINDING));
  });
});

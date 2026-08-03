import { BadRequestException } from '@nestjs/common';
import { VerificationCodeService } from './verification-code.service';

describe('VerificationCodeService purpose isolation', () => {
  const codes = new Map<string, any>();
  const limits = new Map<string, any>();
  let service: VerificationCodeService;

  beforeEach(() => {
    codes.clear();
    limits.clear();
    const model = (store: Map<string, any>) => ({
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(store.get(where.key) ?? null),
      ),
      upsert: jest.fn(({ where, create, update }) => {
        const value = store.has(where.key)
          ? { ...store.get(where.key), ...update }
          : { ...create, attempts: create.attempts ?? 0 };
        store.set(where.key, value);
        return Promise.resolve(value);
      }),
      update: jest.fn(({ where, data }) => {
        const current = store.get(where.key);
        const value = { ...current };
        for (const [key, next] of Object.entries(data)) {
          value[key] =
            typeof next === 'object' && next && 'increment' in next
              ? current[key] + (next as { increment: number }).increment
              : next;
        }
        store.set(where.key, value);
        return Promise.resolve(value);
      }),
      delete: jest.fn(({ where }) => {
        const value = store.get(where.key);
        store.delete(where.key);
        return Promise.resolve(value);
      }),
    });
    service = new VerificationCodeService(
      { get: jest.fn().mockReturnValue(undefined) } as never,
      {
        authVerificationCode: model(codes),
        authVerificationRateLimit: model(limits),
      } as never,
    );
  });

  it('does not accept a code generated for another purpose', async () => {
    const code = await service.generate('13800138000', 'client:reset-password');

    await expect(
      service.validate('13800138000', code, 'technician:reset-password'),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.validate('13800138000', code, 'client:reset-password'),
    ).resolves.toBeUndefined();
  });
});

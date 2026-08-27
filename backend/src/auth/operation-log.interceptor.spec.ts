import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of, throwError } from 'rxjs';
import { PrismaService } from '../common/prisma/prisma.service';
import { OperationLogInterceptor } from './operation-log.interceptor';

describe('OperationLogInterceptor', () => {
  const context = {
    getHandler: () => () => undefined,
    switchToHttp: () => ({ getRequest: () => ({
      user: { userId: 1 }, params: { id: '7' }, headers: {}, ip: '203.0.113.1',
    }) }),
  } as unknown as ExecutionContext;
  let prisma: { operationLog: { create: jest.Mock; update: jest.Mock } };
  let interceptor: OperationLogInterceptor;

  beforeEach(() => {
    prisma = { operationLog: { create: jest.fn().mockResolvedValue({ id: 3 }), update: jest.fn().mockResolvedValue({}) } };
    const reflector = { get: () => ({ module: 'account', action: 'reset', logResponse: false }) };
    interceptor = new OperationLogInterceptor(reflector as unknown as Reflector, prisma as unknown as PrismaService);
  });

  it('persists intent before mutation and never stores a secret response', async () => {
    const next = { handle: jest.fn(() => {
      expect(prisma.operationLog.create).toHaveBeenCalledTimes(1);
      return of({ password: 'secret' });
    }) };
    await expect(lastValueFrom(interceptor.intercept(context, next))).resolves.toEqual({ password: 'secret' });
    expect(prisma.operationLog.update.mock.calls[0][0].data.afterData).toBe('{"outcome":"succeeded"}');
  });

  it('does not execute a mutation when the audit store is unavailable', async () => {
    prisma.operationLog.create.mockRejectedValue(new Error('audit unavailable'));
    const next = { handle: jest.fn(() => of({})) };
    await expect(lastValueFrom(interceptor.intercept(context, next))).rejects.toThrow('audit unavailable');
    expect(next.handle).not.toHaveBeenCalled();
  });

  it('retains the attempt when a business operation fails', async () => {
    const next = { handle: () => throwError(() => new Error('business failed')) };
    await expect(lastValueFrom(interceptor.intercept(context, next))).rejects.toThrow('business failed');
    expect(prisma.operationLog.update.mock.calls[0][0].data.afterData).toContain('failed_or_unconfirmed');
  });
});

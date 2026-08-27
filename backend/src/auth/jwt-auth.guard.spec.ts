import 'reflect-metadata';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

function contextFor(request: Record<string, unknown>, permissions?: string[]) {
  const handler = () => undefined;
  if (permissions) {
    Reflect.defineMetadata('permissions', permissions, handler);
  }
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
    getClass: () => class TestController {},
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard authorization', () => {
  const passportGuardPrototype = Object.getPrototypeOf(JwtAuthGuard.prototype);
  let passportCanActivate: jest.SpyInstance;

  beforeEach(() => {
    passportCanActivate = jest
      .spyOn(passportGuardPrototype, 'canActivate')
      .mockResolvedValue(true);
  });

  afterEach(() => jest.restoreAllMocks());

  it('allows an authenticated administrator with a required permission', async () => {
    const guard = new JwtAuthGuard(new Reflector());
    const context = contextFor(
      { path: '/api/admin/technicians', user: { permissions: ['technician:view'] } },
      ['technician:view'],
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(passportCanActivate).toHaveBeenCalledWith(context);
  });

  it('rejects an authenticated administrator without a required permission', async () => {
    const guard = new JwtAuthGuard(new Reflector());
    const context = contextFor(
      { path: '/api/admin/technicians', user: { permissions: ['dashboard:view'] } },
      ['technician:view'],
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('keeps authenticated routes without permission metadata available', async () => {
    const guard = new JwtAuthGuard(new Reflector());
    const context = contextFor({
      path: '/api/admin/auth/me',
      user: { permissions: [] },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});

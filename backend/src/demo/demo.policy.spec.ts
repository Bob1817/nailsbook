import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { DemoPolicyInterceptor } from './demo.policy.interceptor';
import { DemoService } from './demo.service';

describe('DemoPolicyInterceptor & DemoService isolation', () => {
  const mockPrisma = {
    featureFlag: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    technician: {
      findUnique: jest.fn(),
    },
    demoResetLog: {
      create: jest.fn(),
    },
    systemErrorLog: {
      create: jest.fn(),
    },
  } as any;

  let interceptor: DemoPolicyInterceptor;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.featureFlag.findUnique.mockResolvedValue({ enabled: true });
    interceptor = new DemoPolicyInterceptor(mockPrisma);
  });

  const makeCtx = (req: Record<string, any>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    }) as any;

  const nextHandler: CallHandler = {
    handle: () => of({ ok: true }),
  };

  it('rejects write requests on read-only showcase routes with 403', async () => {
    await expect(
      interceptor.intercept(
        makeCtx({ path: '/api/demo/showcase/works', method: 'POST' }),
        nextHandler,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects forbidden operations (phone/wechat/payment/delete/export) for Demo sessions with 403', async () => {
    const demoUser = { isDemo: true, technicianId: 901 };
    const blockedPaths = [
      '/api/technician-auth/reset-password',
      '/api/technician-auth/bind-phone',
      '/api/account-deletion/request',
      '/api/payments/checkout',
      '/api/customers/export',
      '/api/technician/works/batch-delete',
    ];

    for (const path of blockedPaths) {
      await expect(
        interceptor.intercept(
          makeCtx({ path, method: 'POST', user: demoUser }),
          nextHandler,
        ),
      ).rejects.toThrow(ForbiddenException);
    }
  });

  it('blocks cross-tenant access to real technicians for Demo sessions', async () => {
    mockPrisma.technician.findUnique.mockResolvedValue({ isDemo: false });
    await expect(
      interceptor.intercept(
        makeCtx({
          path: '/api/technicians/55/works',
          method: 'GET',
          params: { technicianId: '55' },
          user: { isDemo: true, technicianId: 901 },
        }),
        nextHandler,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('returns 503 when kill switch (demo_mode_enabled) is disabled', async () => {
    mockPrisma.featureFlag.findUnique.mockResolvedValue({ enabled: false });
    await expect(
      interceptor.intercept(
        makeCtx({
          path: '/api/technician/works',
          method: 'GET',
          user: { isDemo: true, technicianId: 901 },
        }),
        nextHandler,
      ),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('allows normal Demo workspace operations on own tenant', async () => {
    const obs = await interceptor.intercept(
      makeCtx({
        path: '/api/technician/works',
        method: 'POST',
        user: { isDemo: true, technicianId: 901 },
      }),
      nextHandler,
    );
    const res = await lastValueFrom(obs);
    expect(res).toEqual({ ok: true });
  });

  it('calculates consistent read-only quote preview', () => {
    const service = new DemoService(
      mockPrisma,
      { sign: jest.fn() } as any,
      { get: jest.fn() } as any,
    );
    const quote = service.calculateShowcaseQuotePreview({
      workPrice: 238,
      workDurationMinutes: 90,
      addonIds: ['demo_svc_base_care', 'demo_svc_extension'],
    });
    expect(quote.readOnly).toBe(true);
    expect(quote.totalPrice).toBe(238 + 68 + 120);
    expect(quote.totalDurationMinutes).toBe(90 + 30 + 45);
  });
});

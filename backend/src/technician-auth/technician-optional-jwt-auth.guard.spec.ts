import { ExecutionContext } from '@nestjs/common';
import { TechnicianOptionalJwtAuthGuard } from './technician-optional-jwt-auth.guard';

describe('TechnicianOptionalJwtAuthGuard', () => {
  const guard = new TechnicianOptionalJwtAuthGuard();

  const makeContext = (headers?: Record<string, string>): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => ({ headers: headers || {} }),
    }),
  } as unknown as ExecutionContext);

  it('returns null when no authorization header is present', () => {
    const ctx = makeContext({});
    expect(guard.handleRequest(null, null, null, ctx)).toBeNull();
  });

  it('returns null when user is falsy or on error', () => {
    const ctx = makeContext({ authorization: 'Bearer bad-token' });
    expect(guard.handleRequest(new Error('Invalid token'), null, null, ctx)).toBeNull();
  });

  it('returns user when valid authorization and user are present', () => {
    const ctx = makeContext({ authorization: 'Bearer valid-jwt' });
    const user = { technicianId: 10, phone: '13800138000' };
    expect(guard.handleRequest(null, user, null, ctx)).toEqual(user);
  });
});

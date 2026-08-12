import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ClientOptionalJwtAuthGuard } from './client-optional-jwt-auth.guard';

function contextWithAuthorization(authorization?: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: authorization ? { authorization } : {} }),
    }),
  } as unknown as ExecutionContext;
}

describe('ClientOptionalJwtAuthGuard', () => {
  const guard = new ClientOptionalJwtAuthGuard();

  it('allows a request without credentials as an anonymous guest', () => {
    expect(
      guard.handleRequest(null, false, undefined, contextWithAuthorization()),
    ).toBeNull();
  });

  it('keeps the authenticated client supplied by Passport', () => {
    const user = { clientUserId: 12 };
    expect(
      guard.handleRequest(
        null,
        user,
        undefined,
        contextWithAuthorization('Bearer valid-token'),
      ),
    ).toBe(user);
  });

  it('rejects an invalid token instead of silently becoming a guest', () => {
    expect(() =>
      guard.handleRequest(
        null,
        false,
        { message: 'invalid token' },
        contextWithAuthorization('Bearer invalid-token'),
      ),
    ).toThrow(UnauthorizedException);
  });
});

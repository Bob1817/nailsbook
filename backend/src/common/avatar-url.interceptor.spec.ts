import { of, lastValueFrom } from 'rxjs';
import { AvatarUrlInterceptor } from './avatar-url.interceptor';

describe('AvatarUrlInterceptor', () => {
  it('preserves Date instances while normalizing relative avatar urls', async () => {
    const interceptor = new AvatarUrlInterceptor();
    const createdAt = new Date('2026-05-08T10:30:00.000Z');
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          protocol: 'http',
          get: (name: string) => (name === 'host' ? 'localhost:3000' : undefined),
        }),
      }),
    } as any;
    const next = {
      handle: () =>
        of({
          avatarUrl: '/uploads/avatar.png',
          createdAt,
          nested: {
            happenedAt: createdAt,
          },
        }),
    };

    const result = await lastValueFrom(interceptor.intercept(context, next as any));

    expect(result).toEqual({
      avatarUrl: 'http://localhost:3000/uploads/avatar.png',
      createdAt,
      nested: {
        happenedAt: createdAt,
      },
    });
    expect((result as any).createdAt).toBeInstanceOf(Date);
    expect((result as any).nested.happenedAt).toBeInstanceOf(Date);
  });
});

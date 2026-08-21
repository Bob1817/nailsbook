import { WechatAuthService } from './wechat-auth.service';

describe('WechatAuthService', () => {
  const config = {
    get: jest.fn(
      (key: string) =>
        ({
          WECHAT_MINIPROGRAM_APP_ID: 'wx-test',
          WECHAT_MINIPROGRAM_APP_SECRET: 'secret',
        })[key],
    ),
  };
  const jwt = {
    sign: jest.fn().mockReturnValue('wechat-session-token'),
    verify: jest.fn().mockReturnValue({
      appId: 'wx-test',
      openId: 'openid-1',
      tokenType: 'wechat-session',
    }),
  };
  let prisma: any;
  let clientAuth: any;
  let technicianAuth: any;
  const platformConfig = {
    getLoginCredentials: jest.fn().mockResolvedValue({
      appId: 'wx-test',
      appSecret: 'secret',
    }),
  };
  let service: WechatAuthService;

  beforeEach(() => {
    prisma = {
      wechatIdentity: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        upsert: jest.fn(),
        create: jest.fn(),
      },
      clientUser: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      technician: { findUnique: jest.fn() },
    };
    clientAuth = {
      loginByWechat: jest.fn().mockResolvedValue({ accessToken: 'client-jwt' }),
      registerByInvite: jest.fn(),
      createPasswordSetupToken: jest.fn().mockReturnValue('setup-token'),
    };
    technicianAuth = {
      loginByWechat: jest.fn(),
      register: jest.fn(),
    };
    service = new WechatAuthService(
      config as never,
      jwt as never,
      prisma,
      clientAuth,
      technicianAuth,
      platformConfig as never,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('returns a short-lived binding token for an unknown OpenID', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ openid: 'openid-1' }),
    }) as never;
    prisma.wechatIdentity.findUnique.mockResolvedValue(null);

    await expect(service.login('wx-code', 'client')).resolves.toMatchObject({
      authenticated: false,
      requiresBinding: true,
      roles: [],
      wechatSessionToken: 'wechat-session-token',
    });
  });

  it('issues the existing client session when OpenID is linked', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ openid: 'openid-1' }),
    }) as never;
    prisma.wechatIdentity.findUnique.mockResolvedValue({
      clientUserId: 9,
      technicianId: null,
    });

    await expect(service.login('wx-code', 'client')).resolves.toMatchObject({
      authenticated: true,
      role: 'client',
      accessToken: 'client-jwt',
    });
    expect(clientAuth.loginByWechat).toHaveBeenCalledWith(9);
  });

  it('links a verified phone to an existing client with password → direct login', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ access_token: 'access', expires_in: 7200 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            errcode: 0,
            phone_info: { purePhoneNumber: '13800138000' },
          }),
      }) as never;
    prisma.clientUser.findUnique.mockResolvedValue({
      id: 5,
      phone: '13800138000',
      passwordHash: '$2b$10$hashedpassword', // 已设置密码
    });
    prisma.wechatIdentity.findUnique.mockResolvedValue(null);
    prisma.wechatIdentity.findFirst.mockResolvedValue(null);
    prisma.wechatIdentity.upsert.mockResolvedValue({});

    await expect(
      service.completeClient({
        wechatSessionToken: 'session',
        phoneCode: 'phone-code',
      }),
    ).resolves.toMatchObject({ authenticated: true, role: 'client' });
    expect(prisma.wechatIdentity.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ clientUserId: 5 }),
      }),
    );
  });

  it('returns needsSetupPassword for existing client without password', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ access_token: 'access', expires_in: 7200 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            errcode: 0,
            phone_info: { purePhoneNumber: '13800138000' },
          }),
      }) as never;
    prisma.clientUser.findUnique.mockResolvedValue({
      id: 5,
      phone: '13800138000',
      passwordHash: '', // 未设置密码
    });
    prisma.wechatIdentity.findUnique.mockResolvedValue(null);
    prisma.wechatIdentity.findFirst.mockResolvedValue(null);
    prisma.wechatIdentity.upsert.mockResolvedValue({});

    await expect(
      service.completeClient({
        wechatSessionToken: 'session',
        phoneCode: 'phone-code',
      }),
    ).resolves.toMatchObject({
      authenticated: false,
      needsSetupPassword: true,
      passwordSetupToken: 'setup-token',
      phone: '13800138000',
    });
  });

  it('creates new client via WeChat and returns needsSetupPassword', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ access_token: 'access', expires_in: 7200 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            errcode: 0,
            phone_info: { purePhoneNumber: '13900139000' },
          }),
      }) as never;
    prisma.clientUser.findUnique.mockResolvedValue(null);
    prisma.clientUser.create.mockResolvedValue({
      id: 12,
      phone: '13900139000',
      passwordHash: '',
    });
    prisma.wechatIdentity.create.mockResolvedValue({});

    await expect(
      service.completeClient({
        wechatSessionToken: 'session',
        phoneCode: 'phone-code',
      }),
    ).resolves.toMatchObject({
      authenticated: false,
      needsRoleSelection: true,
    });

    // 验证新用户通过 prisma.clientUser.create 创建（而非 registerByInvite）
    expect(prisma.clientUser.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phone: '13900139000',
          passwordHash: '',
        }),
      }),
    );
  });
});

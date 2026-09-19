import { configureLaunchTechnicianId, resetLaunchTechnicianIdConfiguration } from '../common/miniprogram-launch-mode';
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
    configureLaunchTechnicianId(7);
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
      nailWork: { findFirst: jest.fn().mockResolvedValue({ id: 9, techId: 7 }) },
      conversionEvent: { upsert: jest.fn() },
    };
    clientAuth = {
      loginByWechat: jest.fn().mockResolvedValue({ accessToken: 'client-jwt' }),
      registerByInvite: jest.fn(),
      createPasswordSetupToken: jest.fn().mockReturnValue('setup-token'),
      resetPasswordByPhoneOwnership: jest.fn().mockResolvedValue({ success: true }),
    };
    technicianAuth = {
      loginByWechat: jest.fn(),
      register: jest.fn(),
      resetPasswordByPhoneOwnership: jest.fn().mockResolvedValue({ success: true }),
      setInitialPasswordByPhoneOwnership: jest
        .fn()
        .mockResolvedValue({ accessToken: 'tech-jwt' }),
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

  afterEach(() => { jest.restoreAllMocks(); resetLaunchTechnicianIdConfiguration(); });

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
        shareWorkId: 9,
      }),
    ).resolves.toMatchObject({ authenticated: true, role: 'client' });
    expect(prisma.conversionEvent.upsert).not.toHaveBeenCalled();
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

  it('rejects a new client without a technician invitation', async () => {
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
    await expect(
      service.completeClient({
        wechatSessionToken: 'session',
        phoneCode: 'phone-code',
        shareWorkId: 9,
      }),
    ).rejects.toThrow('新客户仅可通过美甲师邀请链接注册');
    expect(prisma.clientUser.create).not.toHaveBeenCalled();
  });
  it('invitation registration binds through the invite flow and logs in without password setup', async () => {
    jest.spyOn(service, 'verifySessionToken').mockResolvedValue({ appId: 'wx-test', openId: 'openid-1' });
    jest.spyOn(service as any, 'exchangePhoneCode').mockResolvedValue('13900139000');
    clientAuth.registerClientByWechatInvite = jest.fn().mockResolvedValue({ client: { id: 12 } });
    prisma.clientUser.findUnique.mockResolvedValueOnce(null).mockResolvedValue({ id: 12, phone: '13900139000', passwordHash: '' });
    await expect(service.completeClient({ wechatSessionToken: 'session', phoneCode: 'phone-code', inviteCode: 'INVITE7', source: 'invite' })).resolves.toMatchObject({ authenticated: true, role: 'client', accessToken: 'client-jwt' });
    expect(clientAuth.registerClientByWechatInvite).toHaveBeenCalledWith({ phone: '13900139000', inviteCode: 'INVITE7', source: 'invite' }, expect.objectContaining({ openId: 'openid-1' }));
    expect(clientAuth.createPasswordSetupToken).not.toHaveBeenCalled();
  });

  it('quick booking registers, binds and logs in without password setup', async () => {
    jest.spyOn(service, 'verifySessionToken').mockResolvedValue({ appId: 'wx-test', openId: 'openid-1' });
    jest.spyOn(service as any, 'exchangePhoneCode').mockResolvedValue('13900139000');
    clientAuth.validateQuickBookingInvite = jest.fn().mockResolvedValue({ id: 7 });
    clientAuth.bindQuickBookingInvite = jest.fn().mockResolvedValue({ status: 'active' });
    clientAuth.registerClientByWechatInvite = jest.fn().mockResolvedValue({ client: { id: 12 } });
    prisma.clientUser.findUnique.mockResolvedValueOnce(null).mockResolvedValue({ id: 12, phone: '13900139000', passwordHash: '' });
    await expect(service.completeClient({ wechatSessionToken: 'session', phoneCode: 'phone-code', inviteCode: 'INVITE7', quickBookingTechId: 7 })).resolves.toMatchObject({ authenticated: true, role: 'client', accessToken: 'client-jwt' });
    expect(clientAuth.bindQuickBookingInvite).toHaveBeenCalledWith(12, 7, 'INVITE7');
    expect(clientAuth.createPasswordSetupToken).not.toHaveBeenCalled();
    expect(prisma.wechatIdentity.create).toHaveBeenCalledTimes(1);
  });

  it('rejects disabled or mismatched quick booking invites before creating an account', async () => {
    jest.spyOn(service, 'verifySessionToken').mockResolvedValue({ appId: 'wx-test', openId: 'openid-1' });
    const exchange = jest.spyOn(service as any, 'exchangePhoneCode');
    clientAuth.validateQuickBookingInvite = jest.fn().mockRejectedValue(new Error('预约邀请已失效'));
    await expect(service.completeClient({ wechatSessionToken: 'session', phoneCode: 'phone-code', inviteCode: 'WRONG', quickBookingTechId: 7 })).rejects.toThrow('预约邀请已失效');
    expect(exchange).not.toHaveBeenCalled();
    expect(prisma.clientUser.create).not.toHaveBeenCalled();
  });

  it('resets client password when the authorized phone matches', async () => {
    jest.spyOn(service as any, 'exchangePhoneCode').mockResolvedValue('13800138000');
    await expect(
      service.resetClientPasswordByPhoneCode({
        phone: '13800138000',
        phoneCode: 'phone-code',
        newPassword: 'Newpass123',
      }),
    ).resolves.toEqual({ success: true });
    expect(clientAuth.resetPasswordByPhoneOwnership).toHaveBeenCalledWith(
      '13800138000',
      'Newpass123',
    );
  });

  it('rejects client password reset when the authorized phone mismatches', async () => {
    jest.spyOn(service as any, 'exchangePhoneCode').mockResolvedValue('13900139000');
    await expect(
      service.resetClientPasswordByPhoneCode({
        phone: '13800138000',
        phoneCode: 'phone-code',
        newPassword: 'Newpass123',
      }),
    ).rejects.toThrow('微信授权手机号与填写手机号不一致');
    expect(clientAuth.resetPasswordByPhoneOwnership).not.toHaveBeenCalled();
  });

  it('resets technician password when the authorized phone matches', async () => {
    jest.spyOn(service as any, 'exchangePhoneCode').mockResolvedValue('13800138000');
    await expect(
      service.resetTechnicianPasswordByPhoneCode({
        phone: '13800138000',
        phoneCode: 'phone-code',
        newPassword: 'Newpass123',
      }),
    ).resolves.toEqual({ success: true });
    expect(technicianAuth.resetPasswordByPhoneOwnership).toHaveBeenCalledWith(
      '13800138000',
      'Newpass123',
    );
  });

  it('sets technician initial password via authorized phone and returns login tokens', async () => {
    jest.spyOn(service as any, 'exchangePhoneCode').mockResolvedValue('13800138000');
    await expect(
      service.setTechnicianInitialPasswordByPhoneCode({
        phone: '13800138000',
        phoneCode: 'phone-code',
        newPassword: 'Newpass123',
      }),
    ).resolves.toEqual({ accessToken: 'tech-jwt' });
    expect(technicianAuth.setInitialPasswordByPhoneOwnership).toHaveBeenCalledWith(
      '13800138000',
      'Newpass123',
    );
  });

});

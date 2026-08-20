import { WechatPlatformConfigService } from './wechat-platform-config.service';
import { resetLaunchTechnicianIdConfiguration } from '../common/miniprogram-launch-mode';

describe('WechatPlatformConfigService capabilities', () => {
  const base = {
    id: 1,
    loginEnabled: false,
    miniProgramAppId: null,
    miniProgramSecret: null,
    loginValidatedAt: null,
    loginValidationError: null,
    paymentEnabled: false,
    merchantId: null,
    merchantSerialNo: null,
    merchantPrivateKey: null,
    apiV3Key: null,
    paymentVerifierMode: null,
    platformKeyId: null,
    platformPublicKey: null,
    boundAppId: null,
    bindingConfirmed: false,
    paymentNotifyUrl: null,
    paymentValidatedAt: null,
    paymentValidationError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  afterEach(() => {
    process.env.MINIPROGRAM_LAUNCH_MODE = 'false';
    resetLaunchTechnicianIdConfiguration();
  });

  it('keeps both WeChat capabilities hidden by default', async () => {
    const prisma = {
      wechatPlatformConfig: {
        upsert: jest.fn().mockResolvedValue(base),
      },
    };
    const service = new WechatPlatformConfigService(
      prisma as never,
      { get: jest.fn() } as never,
    );

    await expect(service.getCapabilities()).resolves.toEqual({
      wechatLogin: { available: false, reason: '微信登录暂未开通' },
      wechatPay: { available: false, reason: '微信支付暂未开通' },
    });
  });

  it('exposes capabilities only after enabled configuration validates', async () => {
    const prisma = {
      wechatPlatformConfig: {
        upsert: jest.fn().mockResolvedValue({
          ...base,
          loginEnabled: true,
          miniProgramAppId: 'wx-app',
          miniProgramSecret: 'encrypted',
          loginValidatedAt: new Date(),
          paymentEnabled: true,
          merchantId: '1900000001',
          merchantSerialNo: 'SERIAL',
          merchantPrivateKey: 'encrypted',
          apiV3Key: 'encrypted',
          paymentVerifierMode: 'platform_public_key',
          platformKeyId: 'PUB_KEY_ID',
          platformPublicKey: 'encrypted',
          boundAppId: 'wx-app',
          bindingConfirmed: true,
          paymentNotifyUrl: 'https://api.example.com/notify',
          paymentValidatedAt: new Date(),
        }),
      },
    };
    const service = new WechatPlatformConfigService(
      prisma as never,
      { get: jest.fn() } as never,
    );

    const result = await service.getCapabilities();
    expect(result.wechatLogin.available).toBe(true);
    expect(result.wechatPay.available).toBe(true);
  });

  it('invalidates login validation whenever configuration changes', async () => {
    const update = jest.fn().mockResolvedValue({});
    const prisma = {
      wechatPlatformConfig: {
        upsert: jest.fn().mockResolvedValue({
          ...base,
          miniProgramSecret: 'existing-encrypted-secret',
        }),
        update,
      },
    };
    const service = new WechatPlatformConfigService(
      prisma as never,
      { get: jest.fn() } as never,
    );

    await service.updateLogin({
      loginEnabled: true,
      miniProgramAppId: 'wx-new',
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          loginValidatedAt: null,
          loginValidationError: '配置已变更，请重新校验',
        }),
      }),
    );
  });

  it('saves a validated shop-only launch technician and forces payment off', async () => {
    process.env.MINIPROGRAM_LAUNCH_MODE = 'true';
    const updated = {
      ...base,
      operatorName: '测试科技公司',
      storeName: '测试美甲店',
      storeAddress: '测试路 1 号',
      storePhone: '13800138000',
      privacyContact: 'privacy@example.com',
      filingNumber: null,
      launchTechnicianId: 7,
      bookingReminderTemplateId: null,
    };
    const update = jest.fn().mockResolvedValue(updated);
    const prisma = {
      technician: {
        findUnique: jest.fn().mockResolvedValue({
          id: 7,
          name: '阿琳',
          phone: '13800138000',
          status: 'active',
          homeService: false,
          shopService: true,
        }),
      },
      wechatPlatformConfig: {
        upsert: jest.fn().mockResolvedValue(updated),
        update,
      },
    };
    const service = new WechatPlatformConfigService(
      prisma as never,
      { get: jest.fn() } as never,
    );

    const result = await service.updateLaunchConfig({
      operatorName: '测试科技公司',
      storeName: '测试美甲店',
      storeAddress: '测试路 1 号',
      storePhone: '13800138000',
      privacyContact: 'privacy@example.com',
      launchTechnicianId: 7,
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          launchTechnicianId: 7,
          paymentEnabled: false,
        }),
      }),
    );
    expect(result.launchTechnicianId).toBe(7);
  });
});

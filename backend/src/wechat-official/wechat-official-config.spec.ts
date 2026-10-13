import { ConfigService } from '@nestjs/config';
import { OfficialCryptoService } from './official-crypto.service';
import { WechatOfficialConfigService } from './wechat-official-config.service';

const ENCRYPTION_KEY = 'x'.repeat(48);
const APP_ID = 'wx05644a205a1844a0';
const APP_SECRET = 'a'.repeat(32);
const AES_KEY = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';

function createHarness(initial?: Partial<Record<string, unknown>>) {
  const store: Record<string, unknown> = {
    id: 1,
    enabled: false,
    appId: null,
    appSecretEnc: null,
    token: null,
    encodingAesKeyEnc: null,
    encryptMode: 'plaintext',
    welcomeReply: null,
    fallbackReply: null,
    validatedAt: null,
    validationError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...initial,
  };
  const prisma = {
    wechatOfficialAccountConfig: {
      findUnique: jest.fn().mockImplementation(async () => ({ ...store })),
      create: jest.fn().mockImplementation(async () => ({ ...store })),
      update: jest.fn().mockImplementation(async ({ data }) => {
        Object.assign(store, data);
        return { ...store };
      }),
    },
  };
  const configService = {
    get: jest.fn().mockReturnValue(ENCRYPTION_KEY),
  } as unknown as ConfigService;
  const crypto = new OfficialCryptoService(configService);
  const service = new WechatOfficialConfigService(prisma as never, crypto);
  return { service, prisma, store, crypto };
}

describe('OfficialCryptoService', () => {
  it('加解密往返一致且密文不含明文', () => {
    const { crypto } = createHarness();
    const encrypted = crypto.encrypt(APP_SECRET);
    expect(encrypted.startsWith('v1.')).toBe(true);
    expect(encrypted).not.toContain(APP_SECRET);
    expect(crypto.decrypt(encrypted)).toBe(APP_SECRET);
  });

  it('缺少加密密钥时报错', () => {
    const configService = {
      get: jest.fn().mockReturnValue(''),
    } as unknown as ConfigService;
    const crypto = new OfficialCryptoService(configService);
    expect(() => crypto.encrypt('x')).toThrow('SYSTEM_CONFIG_ENCRYPTION_KEY');
  });
});

describe('WechatOfficialConfigService', () => {
  it('保存配置时加密密钥且不回显明文', async () => {
    const { service, store } = createHarness();
    await service.update({
      enabled: true,
      appId: APP_ID,
      appSecret: APP_SECRET,
      token: 'token-value',
      encodingAesKey: AES_KEY,
      encryptMode: 'plaintext',
    });
    expect(String(store.appSecretEnc)).toMatch(/^v1\./);
    expect(String(store.encodingAesKeyEnc)).toMatch(/^v1\./);

    const admin = await service.getAdminConfig();
    expect(admin.hasAppSecret).toBe(true);
    expect(admin.hasEncodingAesKey).toBe(true);
    expect(JSON.stringify(admin)).not.toContain(APP_SECRET);
    expect(JSON.stringify(admin)).not.toContain(AES_KEY);
  });

  it('留空密钥时沿用已保存的值', async () => {
    const { service, store } = createHarness();
    await service.update({ appId: APP_ID, appSecret: APP_SECRET });
    const previous = store.appSecretEnc;
    await service.update({ enabled: true });
    expect(store.appSecretEnc).toBe(previous);
    expect(store.enabled).toBe(true);
  });

  it('解析完整配置时解密还原', async () => {
    const { service } = createHarness();
    await service.update({
      appId: APP_ID,
      appSecret: APP_SECRET,
      token: 'token-value',
      encodingAesKey: AES_KEY,
    });
    const resolved = await service.requireResolvedConfig();
    expect(resolved).toEqual({
      appId: APP_ID,
      appSecret: APP_SECRET,
      token: 'token-value',
      encodingAesKey: AES_KEY,
      encryptMode: 'plaintext',
    });
  });

  it('配置不完整时给出缺失项', async () => {
    const { service } = createHarness();
    await expect(service.requireResolvedConfig()).rejects.toThrow(
      'AppID、AppSecret、Token、EncodingAESKey',
    );
  });

  it('未配置 Token 时无法通过回调校验', async () => {
    const { service } = createHarness();
    await expect(service.getVerificationToken()).rejects.toThrow('Token 未配置');
  });
});

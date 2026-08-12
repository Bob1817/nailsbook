import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createPrivateKey,
  createPublicKey,
  createSign,
  randomBytes,
} from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  UpdateWechatLoginConfigDto,
  UpdateWechatPaymentConfigDto,
} from './dto/update-wechat-config.dto';

@Injectable()
export class WechatPlatformConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getAdminConfig() {
    const item = await this.getRecord();
    return {
      loginEnabled: item.loginEnabled,
      miniProgramAppId: item.miniProgramAppId ?? '',
      hasMiniProgramSecret: !!item.miniProgramSecret,
      loginValidatedAt: item.loginValidatedAt,
      loginValidationError: item.loginValidationError,
      paymentEnabled: item.paymentEnabled,
      merchantId: item.merchantId ?? '',
      merchantSerialNo: item.merchantSerialNo ?? '',
      hasMerchantPrivateKey: !!item.merchantPrivateKey,
      hasApiV3Key: !!item.apiV3Key,
      paymentVerifierMode: item.paymentVerifierMode ?? 'platform_public_key',
      platformKeyId: item.platformKeyId ?? '',
      hasPlatformPublicKey: !!item.platformPublicKey,
      boundAppId: item.boundAppId ?? '',
      bindingConfirmed: item.bindingConfirmed,
      paymentNotifyUrl: item.paymentNotifyUrl ?? '',
      paymentValidatedAt: item.paymentValidatedAt,
      paymentValidationError: item.paymentValidationError,
      updatedAt: item.updatedAt,
    };
  }

  async updateLogin(dto: UpdateWechatLoginConfigDto) {
    const current = await this.getRecord();
    const secret = dto.miniProgramSecret?.trim();
    if (!secret && !current.miniProgramSecret) {
      throw new BadRequestException('首次配置必须填写 AppSecret');
    }
    await this.prisma.wechatPlatformConfig.update({
      where: { id: 1 },
      data: {
        loginEnabled: dto.loginEnabled,
        miniProgramAppId: dto.miniProgramAppId.trim(),
        ...(secret ? { miniProgramSecret: this.encrypt(secret) } : {}),
        loginValidatedAt: null,
        loginValidationError: '配置已变更，请重新校验',
      },
    });
    return this.getAdminConfig();
  }

  async updatePayment(dto: UpdateWechatPaymentConfigDto) {
    const current = await this.getRecord();
    const privateKey = dto.merchantPrivateKey?.trim();
    const apiV3Key = dto.apiV3Key?.trim();
    const platformPublicKey = dto.platformPublicKey?.trim();
    if (!privateKey && !current.merchantPrivateKey) {
      throw new BadRequestException('首次配置必须填写商户私钥');
    }
    if (!apiV3Key && !current.apiV3Key) {
      throw new BadRequestException('首次配置必须填写 APIv3 Key');
    }
    if (!platformPublicKey && !current.platformPublicKey) {
      throw new BadRequestException(
        '首次配置必须填写微信支付平台证书或平台公钥',
      );
    }
    if (dto.boundAppId.trim() !== current.miniProgramAppId) {
      throw new BadRequestException('绑定 AppID 必须与当前小程序 AppID 一致');
    }
    await this.prisma.wechatPlatformConfig.update({
      where: { id: 1 },
      data: {
        paymentEnabled: dto.paymentEnabled,
        merchantId: dto.merchantId.trim(),
        merchantSerialNo: dto.merchantSerialNo.trim(),
        paymentVerifierMode: dto.paymentVerifierMode,
        platformKeyId: dto.platformKeyId.trim(),
        boundAppId: dto.boundAppId.trim(),
        bindingConfirmed: dto.bindingConfirmed,
        paymentNotifyUrl: dto.paymentNotifyUrl.trim(),
        ...(privateKey ? { merchantPrivateKey: this.encrypt(privateKey) } : {}),
        ...(apiV3Key ? { apiV3Key: this.encrypt(apiV3Key) } : {}),
        ...(platformPublicKey
          ? { platformPublicKey: this.encrypt(platformPublicKey) }
          : {}),
        paymentValidatedAt: null,
        paymentValidationError: '配置已变更，请重新校验',
      },
    });
    return this.getAdminConfig();
  }

  async validateLogin() {
    const item = await this.getRecord();
    try {
      if (!item.miniProgramAppId || !item.miniProgramSecret) {
        throw new Error('AppID 或 AppSecret 未配置');
      }
      const secret = this.decrypt(item.miniProgramSecret);
      const params = new URLSearchParams({
        grant_type: 'client_credential',
        appid: item.miniProgramAppId,
        secret,
      });
      const response = await fetch(
        `https://api.weixin.qq.com/cgi-bin/token?${params.toString()}`,
        { signal: AbortSignal.timeout(this.timeoutMs()) },
      );
      const result = (await response.json()) as {
        access_token?: string;
        errcode?: number;
        errmsg?: string;
      };
      if (!response.ok || result.errcode || !result.access_token) {
        throw new Error(result.errmsg || `微信返回 HTTP ${response.status}`);
      }
      await this.prisma.wechatPlatformConfig.update({
        where: { id: 1 },
        data: { loginValidatedAt: new Date(), loginValidationError: null },
      });
      return this.getAdminConfig();
    } catch (error) {
      const message = this.safeError(error, '微信登录配置校验失败');
      await this.saveValidationError('login', message);
      throw new BadRequestException(message);
    }
  }

  async validatePayment() {
    const item = await this.getRecord();
    try {
      if (
        !item.merchantId ||
        !item.merchantSerialNo ||
        !item.merchantPrivateKey ||
        !item.apiV3Key ||
        !item.paymentVerifierMode ||
        !item.platformKeyId ||
        !item.platformPublicKey ||
        !item.boundAppId ||
        !item.bindingConfirmed ||
        !item.paymentNotifyUrl
      ) {
        throw new Error('微信支付配置不完整');
      }
      if (!item.paymentNotifyUrl.startsWith('https://')) {
        throw new Error('支付回调地址必须使用 HTTPS');
      }
      if (item.boundAppId !== item.miniProgramAppId) {
        throw new Error('商户绑定 AppID 与当前小程序 AppID 不一致');
      }
      this.decrypt(item.apiV3Key);
      const privateKey = this.decrypt(item.merchantPrivateKey);
      createPrivateKey(privateKey);
      createPublicKey(this.decrypt(item.platformPublicKey));

      const path = '/v3/certificates';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = randomBytes(16).toString('hex');
      const signature = createSign('RSA-SHA256')
        .update(`GET\n${path}\n${timestamp}\n${nonce}\n\n`)
        .sign(privateKey, 'base64');
      const authorization =
        `WECHATPAY2-SHA256-RSA2048 mchid="${item.merchantId}",` +
        `nonce_str="${nonce}",signature="${signature}",` +
        `timestamp="${timestamp}",serial_no="${item.merchantSerialNo}"`;
      const response = await fetch(`https://api.mch.weixin.qq.com${path}`, {
        headers: {
          Authorization: authorization,
          Accept: 'application/json',
          'User-Agent': 'Luanails-Backend/1.0',
        },
        signal: AbortSignal.timeout(this.timeoutMs()),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `微信支付返回 HTTP ${response.status}: ${text.slice(0, 120)}`,
        );
      }
      await this.prisma.wechatPlatformConfig.update({
        where: { id: 1 },
        data: { paymentValidatedAt: new Date(), paymentValidationError: null },
      });
      return this.getAdminConfig();
    } catch (error) {
      const message = this.safeError(error, '微信支付配置校验失败');
      await this.saveValidationError('payment', message);
      throw new BadRequestException(message);
    }
  }

  async getCapabilities() {
    const item = await this.getRecord();
    const loginAvailable = this.loginEffective(item);
    const paymentAvailable = this.paymentEffective(item) && loginAvailable;
    return {
      wechatLogin: {
        available: loginAvailable,
        reason: loginAvailable ? null : '微信登录暂未开通',
      },
      wechatPay: {
        available: paymentAvailable,
        reason: paymentAvailable ? null : '微信支付暂未开通',
      },
    };
  }

  async getLoginCredentials() {
    const item = await this.getRecord();
    if (!this.loginEffective(item)) {
      throw new ServiceUnavailableException('微信登录暂未开通');
    }
    return {
      appId: item.miniProgramAppId!,
      appSecret: this.decrypt(item.miniProgramSecret!),
    };
  }

  async isPaymentAvailable() {
    const item = await this.getRecord();
    return this.paymentEffective(item) && this.loginEffective(item);
  }

  async getPaymentCredentials() {
    const item = await this.getRecord();
    if (!this.paymentEffective(item) || !this.loginEffective(item)) {
      throw new ServiceUnavailableException('微信支付配置未完整校验或未启用');
    }
    return {
      appId: item.miniProgramAppId!,
      merchantId: item.merchantId!,
      merchantSerialNo: item.merchantSerialNo!,
      merchantPrivateKey: this.decrypt(item.merchantPrivateKey!),
      apiV3Key: this.decrypt(item.apiV3Key!),
      verifierMode: item.paymentVerifierMode!,
      platformKeyId: item.platformKeyId!,
      platformPublicKey: this.decrypt(item.platformPublicKey!),
      paymentNotifyUrl: item.paymentNotifyUrl!,
    };
  }

  private loginEffective(item: Awaited<ReturnType<typeof this.getRecord>>) {
    return !!(
      item.loginEnabled &&
      item.miniProgramAppId &&
      item.miniProgramSecret &&
      item.loginValidatedAt &&
      !item.loginValidationError
    );
  }

  private paymentEffective(item: Awaited<ReturnType<typeof this.getRecord>>) {
    return !!(
      item.paymentEnabled &&
      item.merchantId &&
      item.merchantSerialNo &&
      item.merchantPrivateKey &&
      item.apiV3Key &&
      item.paymentVerifierMode &&
      item.platformKeyId &&
      item.platformPublicKey &&
      item.boundAppId === item.miniProgramAppId &&
      item.bindingConfirmed &&
      item.paymentNotifyUrl &&
      item.paymentValidatedAt &&
      !item.paymentValidationError
    );
  }

  private async getRecord() {
    return this.prisma.wechatPlatformConfig.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
  }

  private encryptionKey() {
    const source = this.config.get<string>('SYSTEM_CONFIG_ENCRYPTION_KEY');
    if (!source || source.length < 32) {
      throw new ServiceUnavailableException(
        'SYSTEM_CONFIG_ENCRYPTION_KEY 未配置或长度不足 32 位',
      );
    }
    return createHash('sha256').update(source).digest();
  }

  private encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    return [
      'v1',
      iv.toString('base64'),
      cipher.getAuthTag().toString('base64'),
      encrypted.toString('base64'),
    ].join('.');
  }

  private decrypt(value: string) {
    const [version, iv, tag, encrypted] = value.split('.');
    if (version !== 'v1' || !iv || !tag || !encrypted) {
      throw new Error('加密配置格式无效');
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey(),
      Buffer.from(iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  private async saveValidationError(
    type: 'login' | 'payment',
    message: string,
  ) {
    await this.prisma.wechatPlatformConfig.update({
      where: { id: 1 },
      data:
        type === 'login'
          ? { loginValidatedAt: null, loginValidationError: message }
          : { paymentValidatedAt: null, paymentValidationError: message },
    });
  }

  private timeoutMs() {
    const value = Number(this.config.get('WECHAT_API_TIMEOUT_MS', 8000));
    return Number.isFinite(value) && value > 0 ? value : 8000;
  }

  private safeError(error: unknown, fallback: string) {
    const message = error instanceof Error ? error.message : fallback;
    return message.replace(/secret|key|private/gi, '配置').slice(0, 240);
  }
}

import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { OfficialCryptoService } from './official-crypto.service';
import {
  DEFAULT_FALLBACK_REPLY,
  DEFAULT_WELCOME_REPLY,
} from './official-keyword-rules';
import { UpdateOfficialConfigDto } from './dto/update-official-config.dto';

export interface ResolvedOfficialConfig {
  appId: string;
  appSecret: string;
  token: string;
  encodingAesKey: string;
  encryptMode: 'plaintext' | 'compatible' | 'safe';
}

@Injectable()
export class WechatOfficialConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: OfficialCryptoService,
  ) {}

  private async getRecord() {
    const existing = await this.prisma.wechatOfficialAccountConfig.findUnique({
      where: { id: 1 },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.wechatOfficialAccountConfig.create({ data: { id: 1 } });
  }

  /** 管理端视图：只暴露是否已配置，不回显密钥明文。 */
  async getAdminConfig() {
    const item = await this.getRecord();
    return {
      enabled: item.enabled,
      appId: item.appId ?? '',
      hasAppSecret: !!item.appSecretEnc,
      token: item.token ?? '',
      hasEncodingAesKey: !!item.encodingAesKeyEnc,
      encryptMode: item.encryptMode,
      welcomeReply: item.welcomeReply ?? DEFAULT_WELCOME_REPLY,
      fallbackReply: item.fallbackReply ?? DEFAULT_FALLBACK_REPLY,
      validatedAt: item.validatedAt,
      validationError: item.validationError,
      callbackUrl: '/api/wechat/official/callback',
      updatedAt: item.updatedAt,
    };
  }

  async update(dto: UpdateOfficialConfigDto) {
    await this.getRecord();
    const appSecret = dto.appSecret?.trim();
    const encodingAesKey = dto.encodingAesKey?.trim();
    await this.prisma.wechatOfficialAccountConfig.update({
      where: { id: 1 },
      data: {
        ...(dto.enabled === undefined ? {} : { enabled: dto.enabled }),
        ...(dto.appId === undefined ? {} : { appId: dto.appId.trim() || null }),
        ...(appSecret ? { appSecretEnc: this.crypto.encrypt(appSecret) } : {}),
        ...(dto.token === undefined ? {} : { token: dto.token.trim() || null }),
        ...(encodingAesKey
          ? { encodingAesKeyEnc: this.crypto.encrypt(encodingAesKey) }
          : {}),
        ...(dto.encryptMode ? { encryptMode: dto.encryptMode } : {}),
        ...(dto.welcomeReply === undefined
          ? {}
          : { welcomeReply: dto.welcomeReply }),
        ...(dto.fallbackReply === undefined
          ? {}
          : { fallbackReply: dto.fallbackReply }),
        validatedAt: null,
        validationError: null,
      },
    });
    return this.getAdminConfig();
  }

  /** 供回调与菜单调用：返回可用配置，缺失关键项时明确报错。 */
  async requireResolvedConfig(): Promise<ResolvedOfficialConfig> {
    const item = await this.getRecord();
    const missing: string[] = [];
    if (!item.appId) missing.push('AppID');
    if (!item.appSecretEnc) missing.push('AppSecret');
    if (!item.token) missing.push('Token');
    if (!item.encodingAesKeyEnc) missing.push('EncodingAESKey');
    if (missing.length) {
      throw new ServiceUnavailableException(
        `公众号配置不完整，缺少：${missing.join('、')}`,
      );
    }
    return {
      appId: item.appId as string,
      appSecret: this.crypto.decrypt(item.appSecretEnc as string),
      token: item.token as string,
      encodingAesKey: this.crypto.decrypt(
        item.encodingAesKeyEnc as string,
      ),
      encryptMode: (item.encryptMode as 'plaintext' | 'compatible' | 'safe') ??
        'plaintext',
    };
  }

  /**
   * 仅取 Token，用于微信保存「服务器配置」时的 GET 校验。
   * 此时 AppSecret 可能尚未填齐，因此不做完整配置校验。
   */
  async getVerificationToken(): Promise<string> {
    const item = await this.getRecord();
    if (!item.token) {
      throw new ServiceUnavailableException(
        '公众号 Token 未配置，请先完成配置再在微信后台提交',
      );
    }
    return item.token;
  }

  async requireEnabledConfig(): Promise<ResolvedOfficialConfig> {
    const item = await this.getRecord();
    if (!item.enabled) {
      throw new NotFoundException('公众号消息推送未启用');
    }
    return this.requireResolvedConfig();
  }

  async markValidated(error?: string) {
    await this.prisma.wechatOfficialAccountConfig.update({
      where: { id: 1 },
      data: {
        validatedAt: error ? null : new Date(),
        validationError: error ?? null,
      },
    });
  }

  async getReplyTemplates() {
    const item = await this.getRecord();
    return {
      welcomeReply: item.welcomeReply ?? DEFAULT_WELCOME_REPLY,
      fallbackReply: item.fallbackReply ?? DEFAULT_FALLBACK_REPLY,
    };
  }
}

import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { WechatOfficialConfigService } from './wechat-official-config.service';
import { describeWechatError } from './official-error-hint';

interface CachedToken {
  token: string;
  expiresAt: number;
}

interface TokenApiResponse {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
}

const WECHAT_API_BASE = 'https://api.weixin.qq.com';
/** 提前 5 分钟刷新，避免边界过期。 */
const REFRESH_AHEAD_MS = 5 * 60 * 1000;

/**
 * access_token 中控。
 *
 * 后端为单实例部署，进程内缓存 + 并发去重即可满足需求；
 * 切勿在每次请求中重新获取（存在日调用上限，且新旧 token 有并存期）。
 */
@Injectable()
export class OfficialAccessTokenService {
  private readonly logger = new Logger(OfficialAccessTokenService.name);
  private readonly cache = new Map<string, CachedToken>();
  private readonly inflight = new Map<string, Promise<string>>();

  constructor(private readonly officialConfig: WechatOfficialConfigService) {}

  async getAccessToken(force = false): Promise<string> {
    const config = await this.officialConfig.requireResolvedConfig();
    return this.getAccessTokenFor(config.appId, config.appSecret, force);
  }

  async getAccessTokenFor(
    appId: string,
    appSecret: string,
    force = false,
  ): Promise<string> {
    const cached = this.cache.get(appId);
    if (!force && cached && cached.expiresAt > Date.now() + REFRESH_AHEAD_MS) {
      return cached.token;
    }

    const pending = this.inflight.get(appId);
    if (!force && pending) {
      return pending;
    }

    const request = this.requestToken(appId, appSecret)
      .then((token) => {
        this.cache.set(appId, {
          token,
          expiresAt: Date.now() + 7200 * 1000,
        });
        return token;
      })
      .finally(() => {
        this.inflight.delete(appId);
      });

    this.inflight.set(appId, request);
    return request;
  }

  /** 清空缓存（配置变更或强制刷新时调用）。 */
  invalidate(appId?: string) {
    if (appId) {
      this.cache.delete(appId);
      return;
    }
    this.cache.clear();
  }

  private async requestToken(appId: string, appSecret: string) {
    const url =
      `${WECHAT_API_BASE}/cgi-bin/token?grant_type=client_credential` +
      `&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`;
    let payload: TokenApiResponse;
    try {
      const response = await fetch(url, { method: 'GET' });
      payload = (await response.json()) as TokenApiResponse;
    } catch (error) {
      this.logger.error(`获取 access_token 失败：${String(error)}`);
      throw new ServiceUnavailableException('获取微信 access_token 失败');
    }
    if (!payload.access_token) {
      const code = payload.errcode;
      const message = payload.errmsg ?? '';
      this.logger.error(`获取 access_token 被拒绝：${code} ${message}`);
      throw new ServiceUnavailableException(
        `获取微信 access_token 失败：${describeWechatError(code, message)}`,
      );
    }
    return payload.access_token;
  }
}

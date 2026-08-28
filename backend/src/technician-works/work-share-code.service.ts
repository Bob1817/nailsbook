import { BadGatewayException, Injectable } from '@nestjs/common';
import { WechatPlatformConfigService } from '../wechat-platform-config/wechat-platform-config.service';

@Injectable()
export class WorkShareCodeService {
  private token?: { value: string; expiresAt: number };
  private pendingToken?: Promise<string>;
  private readonly codes = new Map<string, string>();
  private readonly pendingCodes = new Map<string, Promise<{ imageBase64: string }>>();

  constructor(private readonly platform: WechatPlatformConfigService) {}

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now()) return this.token.value;
    if (this.pendingToken) return this.pendingToken;
    this.pendingToken = (async () => {
      const credentials = await this.platform.getLoginCredentials();
      const query = new URLSearchParams({ grant_type: 'client_credential', appid: credentials.appId, secret: credentials.appSecret });
      const response = await fetch(`https://api.weixin.qq.com/cgi-bin/token?${query}`, { signal: AbortSignal.timeout(8000) });
      const result = await response.json();
      if (!response.ok || result.errcode || !result.access_token) throw new Error('token unavailable');
      this.token = { value: result.access_token, expiresAt: Date.now() + Math.max(60, (result.expires_in || 7200) - 300) * 1000 };
      return this.token.value;
    })().finally(() => { this.pendingToken = undefined; });
    return this.pendingToken;
  }

  // 调用方必须先校验作品和授权；缓存图片不代表授权仍有效。
  async generate(workId: number, shareToken?: string) {
    const scene = shareToken ? Buffer.from(shareToken, 'hex').toString('base64url') : `w${workId}`;
    const configured = process.env.WECHAT_SHARE_CODE_ENV;
    const envVersion = configured === 'trial' || configured === 'develop' ? configured : 'release';
    const key = `${envVersion}:${scene}`;
    const cached = this.codes.get(key);
    if (cached) return { imageBase64: cached };
    const pending = this.pendingCodes.get(key);
    if (pending) return pending;
    const request = this.generateCode(scene, key, envVersion).finally(() => this.pendingCodes.delete(key));
    this.pendingCodes.set(key, request);
    return request;
  }

  private async generateCode(scene: string, key: string, envVersion: string) {
    try {
      const token = await this.accessToken();
      const response = await fetch(`https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scene, page: 'pages/client/public-work/index', width: 430, check_path: envVersion === 'release', env_version: envVersion }),
        signal: AbortSignal.timeout(8000),
      });
      const buffer = Buffer.from(await response.arrayBuffer());
      const isPng = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const isJpeg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
      if (!response.ok || (!isPng && !isJpeg)) {
        this.token = undefined;
        throw new Error('code unavailable');
      }
      const imageBase64 = buffer.toString('base64');
      if (this.codes.size >= 100) this.codes.delete(this.codes.keys().next().value!);
      this.codes.set(key, imageBase64);
      return { imageBase64 };
    } catch {
      // 不回传微信请求 URL、令牌或凭据；也不能生成无有效小程序码的假海报。
      throw new BadGatewayException('小程序码暂时无法生成，请稍后重试');
    }
  }
}

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { OfficialAccessTokenService } from './official-access-token.service';
import { DEFAULT_OFFICIAL_MENU } from './official-menu-definition';

const WECHAT_API_BASE = 'https://api.weixin.qq.com';

interface WechatApiResult {
  errcode?: number;
  errmsg?: string;
  [key: string]: unknown;
}

/** 自定义菜单的创建、查询与删除。 */
@Injectable()
export class OfficialMenuService {
  private readonly logger = new Logger(OfficialMenuService.name);

  constructor(private readonly accessToken: OfficialAccessTokenService) {}

  async createMenu(menu: unknown = DEFAULT_OFFICIAL_MENU) {
    const result = await this.call('cgi-bin/menu/create', menu, 'POST');
    return { ok: true, result };
  }

  async getMenu() {
    const result = await this.call('cgi-bin/menu/get', null, 'GET');
    return result;
  }

  async deleteMenu() {
    const result = await this.call('cgi-bin/menu/delete', null, 'GET');
    return { ok: true, result };
  }

  private async call(
    path: string,
    body: unknown,
    method: 'GET' | 'POST',
  ): Promise<WechatApiResult> {
    const token = await this.accessToken.getAccessToken();
    const url = `${WECHAT_API_BASE}/${path}?access_token=${token}`;
    let payload: WechatApiResult;
    try {
      const response = await fetch(url, {
        method,
        ...(body
          ? {
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }
          : {}),
      });
      payload = (await response.json()) as WechatApiResult;
    } catch (error) {
      this.logger.error(`调用菜单接口失败：${path} ${String(error)}`);
      throw new BadRequestException('调用微信菜单接口失败，请检查网络');
    }
    if (payload.errcode) {
      const message = `${payload.errcode}: ${payload.errmsg ?? ''}`;
      this.logger.error(`菜单接口返回错误 ${message}`);
      throw new BadRequestException(
        `微信菜单接口返回错误（${message}）。常见原因：小程序未关联、IP 不在白名单、access_token 失效。`,
      );
    }
    return payload;
  }
}

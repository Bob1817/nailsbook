import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { OfficialAccessTokenService } from './official-access-token.service';
import { DEFAULT_OFFICIAL_MENU } from './official-menu-definition';
import { describeWechatError } from './official-error-hint';

const WECHAT_API_BASE = 'https://api.weixin.qq.com';

/** 微信开放接口通用返回结构。导出以便控制器公开方法能被声明文件正确引用。 */
export interface WechatApiResult {
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
      this.logger.error(
        `菜单接口返回错误 ${payload.errcode}: ${payload.errmsg ?? ''}`,
      );
      throw new BadRequestException(
        describeWechatError(payload.errcode, payload.errmsg),
      );
    }
    return payload;
  }
}

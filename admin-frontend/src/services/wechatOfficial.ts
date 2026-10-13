import api from './api';

export type OfficialEncryptMode = 'plaintext' | 'compatible' | 'safe';

/** 后端 GET /api/admin/wechat-official/config 的返回结构（密钥只回传是否已配置）。 */
export interface WechatOfficialConfig {
  enabled: boolean;
  appId: string;
  hasAppSecret: boolean;
  token: string;
  hasEncodingAesKey: boolean;
  encryptMode: OfficialEncryptMode;
  welcomeReply: string;
  fallbackReply: string;
  validatedAt: string | null;
  validationError: string | null;
  /** 相对路径，如 /api/wechat/official/callback */
  callbackUrl: string;
  updatedAt: string;
}

export interface UpdateWechatOfficialConfig {
  enabled?: boolean;
  appId?: string;
  /** 留空表示沿用已保存的密钥 */
  appSecret?: string;
  token?: string;
  encodingAesKey?: string;
  encryptMode?: OfficialEncryptMode;
  welcomeReply?: string;
  fallbackReply?: string;
}

export interface ValidateResult {
  ok: boolean;
  message: string;
}

export interface MenuActionResult {
  ok: boolean;
  result?: unknown;
}

export const wechatOfficialService = {
  getConfig: () =>
    api.get<WechatOfficialConfig>('/wechat-official/config').then((r) => r.data),
  updateConfig: (data: UpdateWechatOfficialConfig) =>
    api
      .patch<WechatOfficialConfig>('/wechat-official/config', data)
      .then((r) => r.data),
  validate: () =>
    api
      .post<ValidateResult>('/wechat-official/config/validate')
      .then((r) => r.data),
  syncMenu: () =>
    api.post<MenuActionResult>('/wechat-official/menu/sync').then((r) => r.data),
  getMenu: () => api.get<unknown>('/wechat-official/menu').then((r) => r.data),
  deleteMenu: () =>
    api.delete<MenuActionResult>('/wechat-official/menu').then((r) => r.data),
};

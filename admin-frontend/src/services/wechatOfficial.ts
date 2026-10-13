import api from './api';

export type OfficialEncryptMode = 'plaintext' | 'compatible' | 'safe';

/**
 * 后端 GET /api/admin/wechat-official/config 的返回结构。
 * AppSecret 只回传是否已配置；Token 与 EncodingAESKey 需原样填进微信后台，回传明文。
 */
export interface WechatOfficialConfig {
  enabled: boolean;
  appId: string;
  hasAppSecret: boolean;
  token: string;
  hasEncodingAesKey: boolean;
  encodingAesKey: string;
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

/** 消息状态：pending=待人工处理，auto_replied=已自动回复，handled=已人工处理，note=仅记录。 */
export type OfficialMessageStatus =
  | 'pending'
  | 'auto_replied'
  | 'handled'
  | 'note';

export interface WechatOfficialMessageItem {
  id: number;
  openId: string;
  /** in=用户发来；out=我方人工回复 */
  direction: 'in' | 'out' | string;
  msgType: string;
  content: string;
  status: OfficialMessageStatus | string;
  eventType: string | null;
  eventKey: string | null;
  replyMode: string | null;
  repliedBy: string | null;
  handledAt: string | null;
  createdAt: string;
}

export interface WechatOfficialMessagePage {
  items: WechatOfficialMessageItem[];
  total: number;
  page: number;
  pageSize: number;
  /** 全站待人工处理条数（不受当前筛选影响） */
  pendingCount: number;
}

export interface WechatOfficialThread {
  openId: string;
  /** 是否已通过 UnionID 关联到小程序账号 */
  linkedToMiniProgram: boolean;
  linkedClientUserId: number | null;
  items: WechatOfficialMessageItem[];
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
  listMessages: (params: { status?: string; page?: number; pageSize?: number }) =>
    api
      .get<WechatOfficialMessagePage>('/wechat-official/messages', { params })
      .then((r) => r.data),
  getThread: (openId: string, limit = 80) =>
    api
      .get<WechatOfficialThread>('/wechat-official/messages/thread', {
        params: { openId, limit },
      })
      .then((r) => r.data),
  replyMessage: (data: { openId: string; content: string }) =>
    api.post<{ ok: boolean }>('/wechat-official/messages/reply', data).then((r) => r.data),
  markMessageHandled: (id: number) =>
    api
      .post<{ ok: boolean }>(`/wechat-official/messages/${id}/handle`)
      .then((r) => r.data),
};

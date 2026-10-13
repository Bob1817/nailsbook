/**
 * 微信开放接口常见错误码 → 可直接照做的中文提示。
 *
 * 目的：把「40164」这类机器码翻译成具体动作，避免每遇到一类错误都要人工排查一遍。
 * 提示里带上微信后台的操作路径，让配置人员能自己解决。
 */
const WECHAT_ERROR_HINTS: Record<number, string> = {
  40001:
    'AppSecret 不正确或已失效。若在微信平台重置过 AppSecret，需在管理后台重新保存',
  40013: 'AppID 不正确，请核对公众号 AppID（注意不要填成关联小程序的）',
  40125:
    'AppSecret 不正确。请到「微信开发者平台 → 我的业务与服务 → 公众号 → 基础信息 → 开发密钥」重新复制',
  40164:
    '调用方 IP 不在公众号的 IP 白名单内。请到「微信开发者平台 → 我的业务与服务 → 公众号 → 基础信息 → 开发密钥 → IP 白名单」添加服务器出口 IP',
  40243:
    'AppSecret 已被冻结。请到微信开发者平台解冻（冻结与解冻均需 10 分钟生效）',
  45009: '接口调用频次超限，请稍后重试',
  45015:
    '用户与公众号的最后一次互动已超过 48 小时，客服消息无法下发。需用户重新在公众号内发一条消息后才能回复',
  45047: '客服消息下发条数已达上限（用户单次互动最多回 5 条），请稍后再试',
  40003: 'openId 无效，或该用户已取消关注',
  43004: '该用户尚未关注公众号，无法下发客服消息。可先引导其关注公众号',
  48002: '用户已拒收公众号消息（可能已被加入黑名单）',
  48001: '该接口未获得授权，当前账号类型不支持',
  85004: '菜单接口调用异常，请稍后重试',
};

export function describeWechatError(errcode?: number, errmsg?: string): string {
  if (typeof errcode !== 'number') {
    return errmsg ? `微信接口返回错误：${errmsg}` : '微信接口返回未知错误';
  }
  let hint = WECHAT_ERROR_HINTS[errcode];
  if (errcode === 40164 && errmsg) {
    const ip = /invalid ip ([0-9a-f.:]+)/i.exec(errmsg)?.[1];
    if (ip) {
      hint = `${hint}（微信看到的来源 IP：${ip}）`;
    }
  }
  return hint
    ? `${hint}（错误码 ${errcode}）`
    : `微信接口返回错误（${errcode}${errmsg ? `: ${errmsg}` : ''}）`;
}

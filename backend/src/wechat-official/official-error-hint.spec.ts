import { describeWechatError } from './official-error-hint';

describe('describeWechatError', () => {
  it('把 40164 翻译成白名单操作路径，并带出微信看到的来源 IP', () => {
    const text = describeWechatError(
      40164,
      'invalid ip 47.96.159.106 ipv6 ::ffff:47.96.159.106, not in whitelist',
    );
    expect(text).toContain('IP 白名单');
    expect(text).toContain('47.96.159.106');
    expect(text).toContain('40164');
  });

  it('把 40125 翻译成重新复制 AppSecret 的路径', () => {
    const text = describeWechatError(40125, 'invalid appsecret');
    expect(text).toContain('AppSecret');
    expect(text).toContain('开发密钥');
  });

  it('已知错误码不带原始 errmsg，避免信息冗余', () => {
    const text = describeWechatError(45009, 'api freq out of limit');
    expect(text).not.toContain('api freq out of limit');
    expect(text).toContain('45009');
  });

  it('未知错误码回退为带出原始信息', () => {
    const text = describeWechatError(99999, 'something odd');
    expect(text).toContain('99999');
    expect(text).toContain('something odd');
  });

  it('缺少 errcode 时给出可读提示', () => {
    expect(describeWechatError(undefined, 'oops')).toContain('oops');
    expect(describeWechatError(undefined, undefined)).toContain('未知错误');
  });
});

import { WorkShareCodeService } from './work-share-code.service';

describe('作品小程序码', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });
  const platform = { getLoginCredentials: jest.fn().mockResolvedValue({ appId: 'app', appSecret: 'secret' }) };

  it('生成真实图片响应，32字符授权scene可还原，缓存避免重复微信请求', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'server-token' }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]) });
    global.fetch = fetchMock;
    const service = new WorkShareCodeService(platform as any);
    const token = 'ab'.repeat(24);
    const result = await service.generate(7, token);
    expect(result.imageBase64).toBeTruthy();
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.scene).toHaveLength(32);
    expect(Buffer.from(body.scene, 'base64url').toString('hex')).toBe(token);
    expect(body.page).toBe('pages/client/public-work/index');
    expect(body.check_path).toBe(true);
    expect(await service.generate(7, token)).toEqual(result);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('微信返回JSON错误时拒绝生成海报，不把错误响应当二维码', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'server-token' }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => Buffer.from('{"errcode":40001}') });
    await expect(new WorkShareCodeService(platform as any).generate(8)).rejects.toThrow('小程序码暂时无法生成');
  });
  it('invitation URL carries the invite into WeChat registration and has explicit expiry', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'server-token' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url_link: 'https://wxaurl.cn/test' }) });
    global.fetch = fetchMock;
    const result = await new WorkShareCodeService(platform as any).generateInviteLink('ABC&12');
    expect(result.url).toBe('https://wxaurl.cn/test');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ path: 'pages/login/index', query: 'invite=ABC%2612&source=invite', expire_interval: 30 });
  });
  it('does not expose credentials or pretend that rejected invite links succeeded', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'server-token' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ errcode: 48001 }) });
    await expect(new WorkShareCodeService(platform as any).generateInviteLink('ABC')).rejects.toThrow('邀请链接暂时无法生成');
  });

});

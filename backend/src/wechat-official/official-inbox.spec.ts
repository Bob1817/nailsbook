import { BadRequestException } from '@nestjs/common';
import { OfficialInboxService } from './official-inbox.service';

const APP_ID = 'wx04d0cc29f3b21037';

function createHarness() {
  const created: Record<string, unknown>[] = [];
  const updated: Record<string, unknown>[] = [];
  const prisma = {
    wechatOfficialMessage: {
      create: jest.fn(async (args: { data: Record<string, unknown> }) => {
        created.push(args.data);
        return args.data;
      }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn().mockResolvedValue({ id: 1 }),
      update: jest.fn(async (args: Record<string, unknown>) => {
        updated.push(args);
        return args;
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 2 }),
    },
    wechatIdentity: {
      findFirst: jest.fn().mockResolvedValue({ unionId: null }),
    },
    $transaction: jest.fn(async (arg: unknown) => {
      if (Array.isArray(arg)) {
        return Promise.all(arg as Promise<unknown>[]);
      }
      return arg;
    }),
  };
  const officialConfig = {
    requireResolvedConfig: jest
      .fn()
      .mockResolvedValue({ appId: APP_ID, appSecret: 'secret' }),
  };
  const accessToken = {
    getAccessTokenFor: jest.fn().mockResolvedValue('access-token'),
  };
  const service = new OfficialInboxService(
    prisma as never,
    officialConfig as never,
    accessToken as never,
  );
  return { service, prisma, created, updated };
}

describe('OfficialInboxService', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('落库文本消息并保留微信 MsgId', async () => {
    const { service, created } = createHarness();
    await service.recordIncoming(
      {
        FromUserName: 'openid-1',
        MsgType: 'text',
        Content: '我要问个问题',
        MsgId: '1001',
      },
      'pending',
    );
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      appId: APP_ID,
      openId: 'openid-1',
      direction: 'in',
      msgType: 'text',
      content: '我要问个问题',
      wechatMsgId: '1001',
      status: 'pending',
    });
  });

  it('媒体消息用占位文案，便于处理人识别类型', async () => {
    const { service, created } = createHarness();
    await service.recordIncoming(
      { FromUserName: 'openid-2', MsgType: 'voice', MediaId: 'media-1' },
      'pending',
    );
    expect(created[0]).toMatchObject({
      msgType: 'voice',
      content: '[voice]',
      mediaId: 'media-1',
    });
  });

  it('微信重试导致的唯一键冲突被吞掉，不抛错', async () => {
    const { service, prisma } = createHarness();
    prisma.wechatOfficialMessage.create.mockRejectedValueOnce({
      code: 'P2002',
    });
    await expect(
      service.recordIncoming(
        { FromUserName: 'openid-3', MsgType: 'text', Content: 'x', MsgId: '9' },
        'pending',
      ),
    ).resolves.toBeUndefined();
  });

  it('未配置公众号时跳过落库且不抛错', async () => {
    const { created } = createHarness();
    const prisma = {
      wechatOfficialMessage: {
        create: jest.fn(),
      },
    };
    const service = new OfficialInboxService(
      prisma as never,
      {
        requireResolvedConfig: jest.fn().mockRejectedValue(new Error('未配置')),
      } as never,
      { getAccessTokenFor: jest.fn() } as never,
    );
    await expect(
      service.recordIncoming(
        { FromUserName: 'openid-4', MsgType: 'text', Content: 'x' },
        'pending',
      ),
    ).resolves.toBeUndefined();
    expect(prisma.wechatOfficialMessage.create).not.toHaveBeenCalled();
    expect(created).toHaveLength(0);
  });

  it('回复前校验内容不为空且不过长', async () => {
    const { service } = createHarness();
    await expect(
      service.replyToUser({ openId: 'openid-1', content: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.replyToUser({ openId: 'openid-1', content: 'a'.repeat(601) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('回复成功后写入 out 记录并把待处理消息标记为已处理', async () => {
    const { service, created, prisma } = createHarness();
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ errcode: 0 }),
    }) as unknown as typeof fetch;

    const result = await service.replyToUser({
      openId: 'openid-1',
      content: '已为您安排，稍后联系',
      operator: 'admin',
    });

    expect(result).toEqual({ ok: true });
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      direction: 'out',
      content: '已为您安排，稍后联系',
      replyMode: 'manual',
      repliedBy: 'admin',
    });
    expect(prisma.wechatOfficialMessage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { openId: 'openid-1', status: 'pending' },
        data: expect.objectContaining({ status: 'handled' }),
      }),
    );
  });

  it('超出 48 小时窗口时给出可照做的提示', async () => {
    const { service } = createHarness();
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ errcode: 45015, errmsg: 'out of time limit' }),
    }) as unknown as typeof fetch;

    await expect(
      service.replyToUser({ openId: 'openid-1', content: 'hello' }),
    ).rejects.toThrow(/48 小时/);
  });

  it('列表返回待处理计数与分页信息', async () => {
    const { service, prisma } = createHarness();
    prisma.wechatOfficialMessage.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(7);
    const result = await service.listMessages({ status: 'pending', page: 2 });
    expect(result).toMatchObject({ total: 3, page: 2, pendingCount: 7 });
    expect(prisma.wechatOfficialMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'pending' } }),
    );
  });
});

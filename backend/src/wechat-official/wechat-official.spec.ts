import {
  buildSignature,
  decryptMessage,
  encryptMessage,
  verifySignature,
} from './official-signature.util';
import {
  buildNewsReply,
  buildTextReply,
  parseWechatXml,
} from './official-xml.util';
import {
  DEFAULT_FALLBACK_REPLY,
  DEFAULT_WELCOME_REPLY,
  matchKeywordRule,
} from './official-keyword-rules';
import { WechatOfficialMessageService } from './wechat-official-message.service';

const ENCODING_AES_KEY = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';
const APP_ID = 'wx05644a205a1844a0';
const TOKEN = 'nailbook-official-test-token';

function buildXml(tags: Record<string, string>) {
  const body = Object.entries(tags)
    .map(([key, value]) => `<${key}><![CDATA[${value}]]></${key}>`)
    .join('');
  return `<xml>${body}</xml>`;
}

describe('official-signature', () => {
  it('签名与参数顺序无关，且随 token 变化', () => {
    const timestamp = '1730000000';
    const nonce = 'abc123';
    const first = buildSignature(TOKEN, timestamp, nonce);
    const second = buildSignature(TOKEN, nonce, timestamp);
    expect(first).toBe(second);
    expect(buildSignature(`${TOKEN}x`, timestamp, nonce)).not.toBe(first);
    expect(first).toHaveLength(40);
  });

  it('校验通过/失败', () => {
    const timestamp = '1730000000';
    const nonce = 'abc123';
    const signature = buildSignature(TOKEN, timestamp, nonce);
    expect(
      verifySignature({ token: TOKEN, timestamp, nonce, signature }),
    ).toBe(true);
    expect(
      verifySignature({
        token: TOKEN,
        timestamp,
        nonce,
        signature: signature.replace(/.$/, '0'),
      }),
    ).toBe(false);
    expect(
      verifySignature({ token: TOKEN, timestamp, nonce, signature: '' }),
    ).toBe(false);
  });

  it('安全模式签名包含密文', () => {
    const timestamp = '1730000000';
    const nonce = 'abc123';
    const encrypted = 'cipher-text';
    expect(buildSignature(TOKEN, timestamp, nonce, encrypted)).not.toBe(
      buildSignature(TOKEN, timestamp, nonce),
    );
    expect(
      verifySignature({
        token: TOKEN,
        timestamp,
        nonce,
        signature: buildSignature(TOKEN, timestamp, nonce, encrypted),
        encrypt: encrypted,
      }),
    ).toBe(true);
  });

  it('加解密往返一致', () => {
    const message = buildXml({
      ToUserName: APP_ID,
      FromUserName: 'openid-1',
      MsgType: 'text',
      Content: '你好，价格是多少',
    });
    const encrypted = encryptMessage(ENCODING_AES_KEY, message, APP_ID);
    const decrypted = decryptMessage(ENCODING_AES_KEY, encrypted);
    expect(decrypted.message).toBe(message);
    expect(decrypted.appId).toBe(APP_ID);
  });

  it('EncodingAESKey 长度非法时报错', () => {
    expect(() => decryptMessage('short-key', 'x')).toThrow('43');
  });
});

describe('official-xml', () => {
  it('解析文本消息（CDATA）', () => {
    const xml = buildXml({
      ToUserName: 'gh_123',
      FromUserName: 'openid-1',
      CreateTime: '1730000000',
      MsgType: 'text',
      Content: '价格',
      MsgId: '1000000001',
    });
    const parsed = parseWechatXml(xml);
    expect(parsed.MsgType).toBe('text');
    expect(parsed.Content).toBe('价格');
    expect(parsed.MsgId).toBe('1000000001');
  });

  it('解析事件消息及带参二维码 EventKey', () => {
    const xml = buildXml({
      FromUserName: 'openid-1',
      MsgType: 'event',
      Event: 'subscribe',
      EventKey: 'qrscene_channel_xiaohongshu',
    });
    const parsed = parseWechatXml(xml);
    expect(parsed.Event).toBe('subscribe');
    expect(parsed.EventKey).toBe('qrscene_channel_xiaohongshu');
  });

  it('构造文本回复并转义 CDATA 结束符', () => {
    const xml = buildTextReply({
      toUserName: 'openid-1',
      fromUserName: 'gh_123',
      content: '包含 ]]> 危险字符',
      createTime: 1730000000,
    });
    expect(xml).toContain('<ToUserName><![CDATA[openid-1]]></ToUserName>');
    expect(xml).toContain('<MsgType><![CDATA[text]]></MsgType>');
    expect(xml).toContain(']]]]><![CDATA[>');
    expect(parseWechatXml(xml).CreateTime).toBe('1730000000');
  });

  it('构造图文回复', () => {
    const xml = buildNewsReply({
      toUserName: 'openid-1',
      fromUserName: 'gh_123',
      articles: [
        { title: '标题', description: '描述', picUrl: 'https://a/b.png', url: 'https://a/c' },
      ],
    });
    expect(xml).toContain('<ArticleCount>1</ArticleCount>');
  });
});

describe('official-keyword-rules', () => {
  it('负向意图优先于正向意图', () => {
    expect(matchKeywordRule('我要取消预约')?.id).toBe('cancel');
    expect(matchKeywordRule('怎么预约')?.id).toBe('booking');
  });

  it('命中价格与地址规则', () => {
    expect(matchKeywordRule('做个美甲多少钱')?.id).toBe('price');
    expect(matchKeywordRule('你们门店在哪')?.id).toBe('address');
  });

  it('完全匹配规则不误伤长句', () => {
    expect(matchKeywordRule('谢谢')).not.toBeNull();
    expect(matchKeywordRule('谢谢你哦')).toBeNull();
  });

  it('无匹配或空内容返回 null', () => {
    expect(matchKeywordRule('随便说点什么内容')).toBeNull();
    expect(matchKeywordRule('   ')).toBeNull();
  });
});

describe('WechatOfficialMessageService', () => {
  function createService() {
    const prisma = {
      wechatIdentity: { upsert: jest.fn().mockResolvedValue({}) },
    };
    const officialConfig = {
      getReplyTemplates: jest.fn().mockResolvedValue({
        welcomeReply: DEFAULT_WELCOME_REPLY,
        fallbackReply: DEFAULT_FALLBACK_REPLY,
      }),
      requireResolvedConfig: jest.fn().mockResolvedValue({
        appId: APP_ID,
        appSecret: 'secret',
        token: TOKEN,
        encodingAesKey: ENCODING_AES_KEY,
        encryptMode: 'plaintext',
      }),
    };
    const accessToken = {
      getAccessTokenFor: jest.fn().mockRejectedValue(new Error('offline')),
      getAccessToken: jest.fn().mockRejectedValue(new Error('offline')),
    };
    const inbox = {
      recordIncoming: jest.fn().mockResolvedValue(undefined),
      listMessages: jest.fn(),
      getThread: jest.fn(),
      markHandled: jest.fn(),
      replyToUser: jest.fn(),
    };
    const service = new WechatOfficialMessageService(
      prisma as never,
      officialConfig as never,
      accessToken as never,
      inbox as never,
    );
    return { service, prisma, officialConfig, inbox };
  }

  it('文本命中关键词时返回规则文案', async () => {
    const { service, inbox } = createService();
    const reply = await service.handleMessage(
      buildXml({
        ToUserName: 'gh_123',
        FromUserName: 'openid-1',
        MsgType: 'text',
        Content: '多少钱',
        MsgId: '1',
      }),
    );
    expect(reply).toContain('88 元起');
    expect(reply).toContain('<MsgType><![CDATA[text]]></MsgType>');
    expect(inbox.recordIncoming).toHaveBeenCalledWith(
      expect.objectContaining({ Content: '多少钱' }),
      'auto_replied',
    );
  });

  it('文本未命中时返回兜底文案并标记待人工', async () => {
    const { service, inbox } = createService();
    const reply = await service.handleMessage(
      buildXml({
        FromUserName: 'openid-2',
        ToUserName: 'gh_123',
        MsgType: 'text',
        Content: '今天天气不错',
        MsgId: '2',
      }),
    );
    expect(reply).toContain('暂时没能自动回答');
    expect(inbox.recordIncoming).toHaveBeenCalledWith(
      expect.objectContaining({ Content: '今天天气不错' }),
      'pending',
    );
  });

  it('关注事件返回欢迎语并登记身份', async () => {
    const { service, prisma, inbox } = createService();
    const reply = await service.handleMessage(
      buildXml({
        FromUserName: 'openid-3',
        ToUserName: 'gh_123',
        MsgType: 'event',
        Event: 'subscribe',
        CreateTime: '1730000000',
      }),
    );
    expect(reply).toContain('欢迎来到 NailBook');
    expect(prisma.wechatIdentity.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ appId: APP_ID, openId: 'openid-3' }),
      }),
    );
    expect(inbox.recordIncoming).toHaveBeenCalledWith(
      expect.objectContaining({ Event: 'subscribe' }),
      'note',
    );
  });

  it('取消关注不回复', async () => {
    const { service } = createService();
    const reply = await service.handleMessage(
      buildXml({
        FromUserName: 'openid-4',
        ToUserName: 'gh_123',
        MsgType: 'event',
        Event: 'unsubscribe',
        CreateTime: '1730000001',
      }),
    );
    expect(reply).toBe('');
  });

  it('菜单点击事件返回对应文案', async () => {
    const { service } = createService();
    const reply = await service.handleMessage(
      buildXml({
        FromUserName: 'openid-5',
        ToUserName: 'gh_123',
        MsgType: 'event',
        Event: 'CLICK',
        EventKey: 'MENU_CONTACT_SERVICE',
        CreateTime: '1730000002',
      }),
    );
    expect(reply).toContain('人工客服在线时间');
  });

  it('重复 MsgId 只处理一次（幂等）', async () => {
    const { service } = createService();
    const xml = buildXml({
      FromUserName: 'openid-6',
      ToUserName: 'gh_123',
      MsgType: 'text',
      Content: '价格',
      MsgId: 'duplicate-1',
    });
    const first = await service.handleMessage(xml);
    const second = await service.handleMessage(xml);
    expect(first).not.toBe('');
    expect(second).toBe('');
  });

  it('缺少必要字段的消息被忽略', async () => {
    const { service } = createService();
    expect(await service.handleMessage('<xml></xml>')).toBe('');
  });

  it('图片消息给出兜底指引并标记待人工', async () => {
    const { service, inbox } = createService();
    const reply = await service.handleMessage(
      buildXml({
        FromUserName: 'openid-7',
        ToUserName: 'gh_123',
        MsgType: 'image',
        PicUrl: 'https://example.com/a.png',
        MsgId: 'image-1',
      }),
    );
    expect(reply).toContain('暂时没能自动回答');
    expect(inbox.recordIncoming).toHaveBeenCalledWith(
      expect.objectContaining({ MsgType: 'image' }),
      'pending',
    );
  });
});

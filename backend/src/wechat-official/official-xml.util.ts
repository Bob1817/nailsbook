/**
 * 微信公众号消息 XML 解析与构造。
 *
 * 微信推送的消息体结构扁平（<xml> 下若干 <Tag>），且文本值通常包在 CDATA 中，
 * 因此用受控的标签提取即可，无需引入完整 XML 解析依赖。
 */

const TAG_PATTERN =
  /<([A-Za-z][A-Za-z0-9_]*)>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/\1>/g;

export type WechatXmlMessage = Record<string, string>;

/** 解析微信消息 XML，返回 { 标签名: 值 }。同名标签取最后一个。 */
export function parseWechatXml(xml: string): WechatXmlMessage {
  const result: WechatXmlMessage = {};
  if (!xml) {
    return result;
  }
  // 先剥离根节点：否则正则会把 <xml> 当作一个标签并吞掉全部内层内容。
  const body = xml
    .replace(/^[\s\S]*?<xml[^>]*>/, '')
    .replace(/<\/xml>[\s\S]*$/, '');
  TAG_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG_PATTERN.exec(body)) !== null) {
    const tag = match[1];
    const value = match[2] ?? match[3] ?? '';
    result[tag] = value.trim();
  }
  return result;
}

/** CDATA 内不允许出现 "]]>"，遇到时按微信建议拆分。 */
function escapeCdata(value: string) {
  return value.replace(/\]\]>/g, ']]]]><![CDATA[>');
}

function cdata(value: string) {
  return `<![CDATA[${escapeCdata(value)}]]>`;
}

export interface TextReplyInput {
  toUserName: string;
  fromUserName: string;
  content: string;
  createTime?: number;
}

/** 构造文本回复 XML（明文模式）。 */
export function buildTextReply(input: TextReplyInput): string {
  const createTime = input.createTime ?? Math.floor(Date.now() / 1000);
  return [
    '<xml>',
    `<ToUserName>${cdata(input.toUserName)}</ToUserName>`,
    `<FromUserName>${cdata(input.fromUserName)}</FromUserName>`,
    `<CreateTime>${createTime}</CreateTime>`,
    `<MsgType>${cdata('text')}</MsgType>`,
    `<Content>${cdata(input.content)}</Content>`,
    '</xml>',
  ].join('');
}

export interface NewsArticle {
  title: string;
  description: string;
  picUrl: string;
  url: string;
}

/** 构造图文回复 XML（明文模式，1-8 条）。 */
export function buildNewsReply(input: {
  toUserName: string;
  fromUserName: string;
  articles: NewsArticle[];
  createTime?: number;
}): string {
  const createTime = input.createTime ?? Math.floor(Date.now() / 1000);
  const items = input.articles.slice(0, 8)
    .map((article) =>
      [
        '<item>',
        `<Title>${cdata(article.title)}</Title>`,
        `<Description>${cdata(article.description)}</Description>`,
        `<PicUrl>${cdata(article.picUrl)}</PicUrl>`,
        `<Url>${cdata(article.url)}</Url>`,
        '</item>',
      ].join(''),
    )
    .join('');
  return [
    '<xml>',
    `<ToUserName>${cdata(input.toUserName)}</ToUserName>`,
    `<FromUserName>${cdata(input.fromUserName)}</FromUserName>`,
    `<CreateTime>${createTime}</CreateTime>`,
    `<MsgType>${cdata('news')}</MsgType>`,
    `<ArticleCount>${input.articles.length}</ArticleCount>`,
    `<Articles>${items}</Articles>`,
    '</xml>',
  ].join('');
}

/** 微信要求超时未处理时直接返回该字符串，避免重试。 */
export const WECHAT_SUCCESS_REPLY = 'success';

import { BadRequestException, Injectable } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';
import { TechnicianUploadService } from '../technician-upload/technician-upload.service';

export function noteUrl(text: string) {
  const raw = text.match(/https?:\/\/[^\s<>，。]+/)?.[0];
  let url: URL;
  try { url = new URL(raw || ''); } catch { throw new BadRequestException('链接错误，请粘贴小红书笔记分享链接'); }
  if (!['www.xiaohongshu.com', 'xiaohongshu.com', 'xhslink.com'].includes(url.hostname) ||
      url.username || url.password || (url.port && url.port !== '443') ||
      !['http:', 'https:'].includes(url.protocol)) throw new BadRequestException('链接错误，请使用小红书笔记链接');
  url.protocol = 'https:';
  return url.toString();
}

export function parseNote(html: string, strategy: string, id: string) {
  let title = '', description = '', images: string[] = [];
  if (strategy === 'note') {
    const raw = html.match(/window\.__INITIAL_STATE__\s*=\s*([\s\S]*?)<\/script>/)?.[1]?.trim().replace(/;$/, '');
    if (raw) {
      // Never evaluate remote JavaScript.
      const state = JSON.parse(raw.replace(/"(?:\\.|[^"\\])*"|\bundefined\b/g, token => token === 'undefined' ? 'null' : token));
      const map = state.note?.noteDetailMap || {};
      const note = map[id]?.note;
      if (note && note.type !== 'video') {
        title = note.title || ''; description = note.desc || '';
        images = (note.imageList || []).map(i => i.urlDefault || i.url || i.infoList?.[0]?.url).filter(Boolean);
      }
    }
  } else if (strategy === 'structured') {
    for (const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      const data = JSON.parse(match[1]);
      const nodes = Array.isArray(data) ? data : data['@graph'] || [data];
      for (const node of nodes) {
        if (!['Article', 'SocialMediaPosting', 'BlogPosting'].includes(node['@type'])) continue;
        title = node.headline || node.name || ''; description = node.articleBody || node.description || '';
        images = (Array.isArray(node.image) ? node.image : [node.image]).filter(Boolean).map(i => typeof i === 'string' ? i : i.url).filter(Boolean);
      }
    }
  } else {
    const meta: Record<string, string[]> = {};
    for (const match of html.matchAll(/<meta\s[^>]*>/gi)) {
      const attrs = Object.fromEntries([...match[0].matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(m => [m[1].toLowerCase(), m[2]]));
      const key = attrs.property || attrs.name;
      if (key && attrs.content) (meta[key] ||= []).push(attrs.content);
    }
    title = meta['og:title']?.[0] || ''; description = meta['og:description']?.[0] || '';
    images = meta['og:image'] || [];
  }
  const decode = (s: string) => String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  images = [...new Set(images.map(decode))].filter(s => /^https?:\/\//.test(s));
  if (!title || !images.length || /安全验证|登录小红书|页面不存在/.test(title)) return null;
  return { title: decode(title).replace(/\s*[-|]\s*小红书.*$/, '').slice(0, 100), description: decode(description).slice(0, 5000), images: images.slice(0, 9), partial: strategy !== 'note' || images.length > 9 };
}

@Injectable()
export class WorkSyncService {
  constructor(private readonly uploads: TechnicianUploadService) {}

  async download(raw: string, media = false, redirects = 0): Promise<{ buffer: Buffer; url: string; type: string }> {
    const url = new URL(raw);
    const allowed = media ? /(^|\.)xhscdn\.com$/.test(url.hostname) :
      ['www.xiaohongshu.com', 'xiaohongshu.com', 'xhslink.com'].includes(url.hostname);
    if (!allowed || url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || redirects > 4) throw new Error('不支持的资源地址');
    const addresses = await lookup(url.hostname, { all: true, family: 4 });
    const address = addresses.find(a => isIP(a.address) === 4 &&
      !/^(0|10|127|169\.254|172\.(1[6-9]|2\d|3[01])|192\.168|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])|198\.(18|19)|22[4-9]|23\d|24\d|25\d)\./.test(a.address))?.address;
    if (!address) throw new Error('资源地址不可用');
    return new Promise((resolve, reject) => {
      const req = request(url, { lookup: (_host, _options, cb) => cb(null, address, 4), headers: { 'User-Agent': 'Mozilla/5.0', Accept: media ? 'image/*' : 'text/html' } }, res => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume(); this.download(new URL(res.headers.location, url).toString(), media, redirects + 1).then(resolve, reject); return;
        }
        if (res.statusCode !== 200) { res.resume(); reject(new Error('页面暂时无法访问')); return; }
        const chunks: Buffer[] = []; let bytes = 0;
        res.on('data', chunk => {
          bytes += chunk.length;
          if (bytes > (media ? 10 : 3) * 1024 * 1024) { res.destroy(new Error('内容过大')); return; }
          chunks.push(chunk);
        });
        res.on('error', reject);
        res.on('end', () => resolve({ buffer: Buffer.concat(chunks), url: url.toString(), type: String(res.headers['content-type'] || '') }));
      });
      const timer = setTimeout(() => req.destroy(new Error('访问超时')), 12000);
      req.on('close', () => clearTimeout(timer)); req.on('error', reject); req.end();
    });
  }

  async parse(input: string, strategy: string) {
    const url = noteUrl(input);
    try {
      const page = await this.download(url);
      const id = new URL(page.url).pathname.match(/\/(?:explore|discovery\/item)\/([a-f\d]{24})/i)?.[1];
      if (!id) return { status: 'failed', message: '无法识别笔记，请复制笔记的完整分享链接' };
      const result = parseNote(page.buffer.toString('utf8'), strategy, id);
      return result ? { status: 'success', result, sourceUrl: page.url } : { status: 'failed', message: '该方式未获取到可用图文' };
    } catch {
      return { status: 'failed', message: '该方式暂时无法读取笔记内容' };
    }
  }

  async media(technicianId: number, url: string) {
    try {
      const file = await this.download(url, true);
      if (!/^image\/(jpeg|png|webp)/i.test(file.type)) throw new Error('非图片资源');
      return await this.uploads.uploadImage(technicianId, { buffer: file.buffer, size: file.buffer.length, mimetype: file.type });
    } catch { throw new BadRequestException('图片转存失败，请重试或在作品编辑页补充图片'); }
  }
}

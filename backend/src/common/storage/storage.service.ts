import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import OSS from 'ali-oss';
import sharp from 'sharp';

const AUDIO_MIME_EXT: Record<string, string> = {
  'audio/mp4': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/m4a': '.m4a',
  'audio/aac': '.aac',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
};

export interface UploadFile {
  buffer: Buffer;
  mimetype: string;
  originalname?: string;
  size?: number;
}

/**
 * 图片存储服务。
 * - STORAGE_PROVIDER=oss（或配置了 OSS_BUCKET）时上传到阿里云 OSS，返回绝对 URL；
 * - 否则写入本地 uploads 目录，返回 /uploads/<file>（开发回退）。
 *
 * 环境变量（OSS）：
 *   STORAGE_PROVIDER=oss
 *   OSS_REGION=oss-cn-hangzhou
 *   OSS_BUCKET=your-bucket
 *   OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET
 *   OSS_ENDPOINT（可选，自定义/内网 endpoint）
 *   OSS_BASE_URL（可选，CDN/自定义域名，如 https://img.yourdomain.com）
 *   OSS_PREFIX（对象前缀，默认 images/）
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private ossClient?: OSS;

  constructor(private readonly configService: ConfigService) {}

  private get useOss(): boolean {
    const provider = this.configService
      .get<string>('STORAGE_PROVIDER', '')
      .trim()
      .toLowerCase();
    return provider === 'oss' || !!this.configService.get<string>('OSS_BUCKET');
  }

  async uploadImage(file: UploadFile): Promise<{
    url: string;
    highUrl: string;
    mediumUrl: string;
    thumbnailUrl: string;
    bytesStored: number;
  }> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('请选择图片文件');
    }
    const baseName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const [high, medium, thumbnail] = await Promise.all([
      this.optimizeImage(file.buffer, 2048, 84),
      this.optimizeImage(file.buffer, 1080, 82),
      this.optimizeImage(file.buffer, 480, 78),
    ]);
    const [highUrl, mediumUrl, thumbnailUrl] = await Promise.all([
      this.storeImage(`${baseName}-high.webp`, high),
      this.storeImage(`${baseName}-medium.webp`, medium),
      this.storeImage(`${baseName}-thumb.webp`, thumbnail),
    ]);
    return {
      url: mediumUrl,
      highUrl,
      mediumUrl,
      thumbnailUrl,
      bytesStored: high.length + medium.length + thumbnail.length,
    };
  }

  async uploadAudio(file: UploadFile): Promise<{ url: string }> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('请选择音频文件');
    }
    const ext = AUDIO_MIME_EXT[file.mimetype] ?? '.m4a';
    const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;

    if (this.useOss) {
      const url = await this.putToOss(name, file.buffer, file.mimetype);
      return { url };
    }
    const url = this.putToLocal(name, file.buffer);
    return { url };
  }

  async deleteImageVariants(urls: string[]) {
    const uniqueUrls = [...new Set(urls.filter(Boolean))];
    if (this.useOss) {
      const client = this.getOssClient();
      await Promise.all(
        uniqueUrls.map((url) => client.delete(this.objectKeyFromUrl(url))),
      );
      return;
    }
    for (const url of uniqueUrls) {
      if (!url.startsWith('/uploads/')) continue;
      const fileName = path.basename(url);
      const filePath = path.resolve(process.cwd(), 'uploads', fileName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  }

  private putToLocal(name: string, buffer: Buffer): string {
    const dir = path.resolve(process.cwd(), 'uploads');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name), buffer);
    return `/uploads/${name}`;
  }

  private optimizeImage(buffer: Buffer, maxWidth: number, quality: number) {
    return sharp(buffer)
      .rotate()
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
  }

  private storeImage(name: string, buffer: Buffer) {
    return this.useOss
      ? this.putToOss(name, buffer, 'image/webp')
      : Promise.resolve(this.putToLocal(name, buffer));
  }

  private getOssClient(): OSS {
    if (this.ossClient) return this.ossClient;
    const region = this.configService.get<string>('OSS_REGION');
    const accessKeyId = this.configService.get<string>('OSS_ACCESS_KEY_ID');
    const accessKeySecret = this.configService.get<string>(
      'OSS_ACCESS_KEY_SECRET',
    );
    const bucket = this.configService.get<string>('OSS_BUCKET');
    const endpoint = this.configService.get<string>('OSS_ENDPOINT');
    if (!accessKeyId || !accessKeySecret || !bucket || (!region && !endpoint)) {
      throw new Error(
        'OSS 未正确配置：需要 OSS_BUCKET、OSS_ACCESS_KEY_ID/SECRET 及 OSS_REGION 或 OSS_ENDPOINT',
      );
    }
    this.ossClient = new OSS({
      region,
      accessKeyId,
      accessKeySecret,
      bucket,
      endpoint,
      secure: true,
    });
    return this.ossClient;
  }

  private objectKeyFromUrl(url: string) {
    const baseUrl = this.configService.get<string>('OSS_BASE_URL');
    if (baseUrl && url.startsWith(baseUrl)) {
      return url.slice(baseUrl.replace(/\/+$/, '').length).replace(/^\/+/, '');
    }
    try {
      return new URL(url).pathname.replace(/^\/+/, '');
    } catch {
      return url.replace(/^\/+/, '');
    }
  }

  private async putToOss(
    name: string,
    buffer: Buffer,
    mimetype: string,
  ): Promise<string> {
    const prefix = this.configService.get<string>('OSS_PREFIX', 'images/');
    const key = `${prefix.replace(/^\/+|\/+$/g, '')}/${name}`;
    const client = this.getOssClient();

    const maxRetries = 2;
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const result = await client.put(key, buffer, {
          mime: mimetype,
          headers: { 'Cache-Control': 'public, max-age=31536000' },
        });
        const baseUrl = this.configService.get<string>('OSS_BASE_URL');
        const url = baseUrl
          ? `${baseUrl.replace(/\/+$/, '')}/${key}`
          : result.url;
        this.logger.log(`[OSS] 上传成功：${key}`);
        return url;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `[OSS] 上传 ${key} 第 ${attempt} 次失败：${(error as Error).message}`,
        );
        if (attempt > maxRetries) break;
        await new Promise((r) => setTimeout(r, 300 * attempt));
      }
    }
    this.logger.error(`[OSS] 上传最终失败：${(lastError as Error)?.message}`);
    throw new BadRequestException('图片上传失败，请重试');
  }
}

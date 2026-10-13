import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

/**
 * 敏感配置的加解密工具。
 *
 * 与 `wechat-platform-config` 使用同一算法与密钥来源
 * （AES-256-GCM，密钥 = sha256(SYSTEM_CONFIG_ENCRYPTION_KEY)，格式 v1.iv.tag.data），
 * 保证生产环境无需新增任何环境变量。
 */
@Injectable()
export class OfficialCryptoService {
  constructor(private readonly config: ConfigService) {}

  private encryptionKey(): Buffer {
    const source = this.config.get<string>('SYSTEM_CONFIG_ENCRYPTION_KEY');
    if (!source || source.length < 32) {
      throw new ServiceUnavailableException(
        'SYSTEM_CONFIG_ENCRYPTION_KEY 未配置或长度不足 32 位',
      );
    }
    return createHash('sha256').update(source).digest();
  }

  encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    return [
      'v1',
      iv.toString('base64'),
      cipher.getAuthTag().toString('base64'),
      encrypted.toString('base64'),
    ].join('.');
  }

  decrypt(value: string): string {
    const [version, iv, tag, encrypted] = value.split('.');
    if (version !== 'v1' || !iv || !tag || !encrypted) {
      throw new Error('加密配置格式无效');
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey(),
      Buffer.from(iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }
}

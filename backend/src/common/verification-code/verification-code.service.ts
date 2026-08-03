import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VerificationCodeService {
  private static readonly CODE_TTL_MS = 5 * 60 * 1000;
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly RATE_LIMIT_WINDOW_MS = 60 * 1000;
  private static readonly RATE_LIMIT_MAX = 3;
  private static readonly DEV_CODE = '123456';

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async generate(phone: string, purpose = 'default'): Promise<string> {
    const key = this.key(phone, purpose);
    await this.checkRateLimit(key);
    const code = String(randomInt(100000, 1000000));
    await this.prisma.authVerificationCode.upsert({
      where: { key },
      create: {
        key,
        codeHash: this.hash(key, code),
        expiresAt: new Date(Date.now() + VerificationCodeService.CODE_TTL_MS),
      },
      update: {
        codeHash: this.hash(key, code),
        expiresAt: new Date(Date.now() + VerificationCodeService.CODE_TTL_MS),
        attempts: 0,
      },
    });
    return code;
  }

  async validate(
    phone: string,
    code: string,
    purpose = 'default',
  ): Promise<void> {
    if (this.isDevCodeAllowed() && code === VerificationCodeService.DEV_CODE) {
      return;
    }

    const key = this.key(phone, purpose);
    const entry = await this.prisma.authVerificationCode.findUnique({
      where: { key },
    });
    if (!entry) throw new BadRequestException('请先获取验证码');
    if (Date.now() > entry.expiresAt.getTime()) {
      await this.prisma.authVerificationCode.delete({ where: { key } });
      throw new BadRequestException('验证码已过期，请重新获取');
    }

    if (entry.codeHash !== this.hash(key, code)) {
      if (entry.attempts + 1 >= VerificationCodeService.MAX_ATTEMPTS) {
        await this.prisma.authVerificationCode.delete({ where: { key } });
        throw new BadRequestException('验证码错误次数过多，请重新获取');
      }
      await this.prisma.authVerificationCode.update({
        where: { key },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('验证码错误');
    }

    await this.prisma.authVerificationCode.delete({ where: { key } });
  }

  isDevCodeAllowed(): boolean {
    return (
      this.configService.get<string>('NODE_ENV') === 'development' &&
      this.configService.get<string>('ALLOW_DEV_MVP_VERIFICATION_CODE') ===
        'true'
    );
  }

  getDevCode(): string | undefined {
    return this.isDevCodeAllowed()
      ? VerificationCodeService.DEV_CODE
      : undefined;
  }

  private async checkRateLimit(key: string) {
    const now = new Date();
    const entry = await this.prisma.authVerificationRateLimit.findUnique({
      where: { key },
    });
    if (!entry || entry.resetAt <= now) {
      await this.prisma.authVerificationRateLimit.upsert({
        where: { key },
        create: {
          key,
          count: 1,
          resetAt: new Date(
            now.getTime() + VerificationCodeService.RATE_LIMIT_WINDOW_MS,
          ),
        },
        update: {
          count: 1,
          resetAt: new Date(
            now.getTime() + VerificationCodeService.RATE_LIMIT_WINDOW_MS,
          ),
        },
      });
      return;
    }
    if (entry.count >= VerificationCodeService.RATE_LIMIT_MAX) {
      const seconds = Math.ceil(
        (entry.resetAt.getTime() - now.getTime()) / 1000,
      );
      throw new BadRequestException(`请求过于频繁，请 ${seconds} 秒后重试`);
    }
    await this.prisma.authVerificationRateLimit.update({
      where: { key },
      data: { count: { increment: 1 } },
    });
  }

  private hash(key: string, code: string): string {
    const pepper =
      this.configService.get<string>('VERIFICATION_CODE_PEPPER') ??
      this.configService.get<string>('JWT_SECRET') ??
      'development-only';
    return createHash('sha256')
      .update(`${key}:${code}:${pepper}`)
      .digest('hex');
  }

  private key(phone: string, purpose: string): string {
    return `${purpose}:${phone}`;
  }
}

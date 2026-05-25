import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CodeEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

@Injectable()
export class VerificationCodeService {
  private codes = new Map<string, CodeEntry>();
  private requestCounts = new Map<string, { count: number; resetAt: number }>();

  private static readonly CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
  private static readonly RATE_LIMIT_MAX = 3; // 3 requests per window
  private static readonly DEV_CODE = '123456';

  constructor(private readonly configService: ConfigService) {
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  generate(phone: string): string {
    this.checkRateLimit(phone);

    const code = this.randomCode();
    this.codes.set(phone, {
      code,
      expiresAt: Date.now() + VerificationCodeService.CODE_TTL_MS,
      attempts: 0,
    });
    return code;
  }

  validate(phone: string, code: string): void {
    // Dev fallback: accept configured dev code when allowed
    if (this.isDevCodeAllowed() && code === VerificationCodeService.DEV_CODE) {
      return;
    }

    const entry = this.codes.get(phone);

    if (!entry) {
      throw new BadRequestException('请先获取验证码');
    }

    if (Date.now() > entry.expiresAt) {
      this.codes.delete(phone);
      throw new BadRequestException('验证码已过期，请重新获取');
    }

    entry.attempts += 1;

    if (entry.attempts > VerificationCodeService.MAX_ATTEMPTS) {
      this.codes.delete(phone);
      throw new BadRequestException('验证码错误次数过多，请重新获取');
    }

    if (entry.code !== code) {
      throw new BadRequestException('验证码错误');
    }

    // Valid — consume the code
    this.codes.delete(phone);
  }

  isDevCodeAllowed(): boolean {
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    const allowDev = this.configService.get<string>(
      'ALLOW_DEV_MVP_VERIFICATION_CODE',
    );
    return nodeEnv === 'development' && allowDev === 'true';
  }

  getDevCode(): string | undefined {
    return this.isDevCodeAllowed()
      ? VerificationCodeService.DEV_CODE
      : undefined;
  }

  private checkRateLimit(phone: string): void {
    const now = Date.now();
    const entry = this.requestCounts.get(phone);

    if (!entry || now > entry.resetAt) {
      this.requestCounts.set(phone, {
        count: 1,
        resetAt: now + VerificationCodeService.RATE_LIMIT_WINDOW_MS,
      });
      return;
    }

    if (entry.count >= VerificationCodeService.RATE_LIMIT_MAX) {
      const seconds = Math.ceil((entry.resetAt - now) / 1000);
      throw new BadRequestException(`请求过于频繁，请 ${seconds} 秒后重试`);
    }

    entry.count += 1;
  }

  private randomCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.codes) {
      if (now > entry.expiresAt) this.codes.delete(key);
    }
    for (const [key, entry] of this.requestCounts) {
      if (now > entry.resetAt) this.requestCounts.delete(key);
    }
  }
}

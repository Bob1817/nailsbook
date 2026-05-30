import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Dysmsapi20170525, { SendSmsRequest } from '@alicloud/dysmsapi20170525';
import { Config as OpenApiConfig } from '@alicloud/openapi-client';
import { RuntimeOptions } from '@alicloud/tea-util';

/**
 * 短信发送服务（健壮版）。
 *
 * - SMS_PROVIDER=aliyun 时通过阿里云短信发送；未配置时仅打印日志（配合开发固定码）。
 * - 具备：每次尝试超时、可重试错误判定、指数退避重试、结构化日志。
 *
 * 环境变量：
 *   SMS_PROVIDER=aliyun
 *   SMS_MAX_RETRIES=2            失败后的最大重试次数（总尝试 = 重试 + 1）
 *   SMS_TIMEOUT_MS=8000          单次请求超时
 *   ALIYUN_SMS_ACCESS_KEY_ID / ALIYUN_SMS_ACCESS_KEY_SECRET
 *   ALIYUN_SMS_SIGN_NAME / ALIYUN_SMS_TEMPLATE_CODE
 *   ALIYUN_SMS_TEMPLATE_PARAM_KEY（默认 code）/ ALIYUN_SMS_ENDPOINT
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private aliyunClient?: Dysmsapi20170525;

  // 可重试的阿里云错误码（限流/系统繁忙类）
  private static readonly RETRYABLE_CODES = new Set([
    'SystemBusy',
    'ServiceUnavailable',
    'Throttling',
    'Throttling.User',
    'Throttling.Api',
    'isv.SYSTEM_ERROR',
  ]);
  private static readonly RETRYABLE_NET = /ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|socket hang up|timeout|network/i;

  constructor(private readonly configService: ConfigService) {}

  private get provider(): string {
    return this.configService.get<string>('SMS_PROVIDER', '').trim().toLowerCase();
  }
  private get maxRetries(): number {
    const n = Number(this.configService.get('SMS_MAX_RETRIES', 2));
    return Number.isFinite(n) && n >= 0 ? n : 2;
  }
  private get timeoutMs(): number {
    const n = Number(this.configService.get('SMS_TIMEOUT_MS', 8000));
    return Number.isFinite(n) && n > 0 ? n : 8000;
  }

  /**
   * 发送验证码。最终失败会记录 error 并抛出（调用方可选择 fire-and-forget）。
   */
  async sendVerificationCode(phone: string, code: string, scene = '验证码'): Promise<void> {
    if (!this.provider) {
      this.logger.warn(
        `[SMS 未配置] 向 ${phone} 发送「${scene}」验证码：${code}（开发环境请使用此码或开发固定码）`,
      );
      return;
    }

    const total = this.maxRetries + 1;
    let lastError: unknown;
    for (let attempt = 1; attempt <= total; attempt++) {
      try {
        await this.dispatch(phone, code, scene);
        this.logger.log(`[SMS:${this.provider}] ${this.mask(phone)} 发送成功（第 ${attempt}/${total} 次）`);
        return;
      } catch (error) {
        lastError = error;
        const retryable = this.isRetryable(error);
        this.logger.warn(
          `[SMS:${this.provider}] ${this.mask(phone)} 第 ${attempt}/${total} 次失败：${(error as Error).message}` +
            `${retryable && attempt < total ? '，将重试' : ''}`,
        );
        if (!retryable || attempt >= total) break;
        await this.sleep(this.backoffMs(attempt));
      }
    }
    this.logger.error(
      `[SMS:${this.provider}] ${this.mask(phone)} 最终发送失败：${(lastError as Error)?.message}`,
    );
    throw lastError instanceof Error ? lastError : new Error('短信发送失败');
  }

  private async dispatch(phone: string, code: string, scene: string): Promise<void> {
    if (this.provider === 'aliyun') {
      await this.sendViaAliyun(phone, code);
      return;
    }
    this.logger.warn(`[SMS] 未知的短信 provider：${this.provider}，验证码（${scene}）：${code}`);
  }

  private getAliyunClient(): Dysmsapi20170525 {
    if (this.aliyunClient) return this.aliyunClient;
    const accessKeyId = this.configService.get<string>('ALIYUN_SMS_ACCESS_KEY_ID');
    const accessKeySecret = this.configService.get<string>('ALIYUN_SMS_ACCESS_KEY_SECRET');
    if (!accessKeyId || !accessKeySecret) {
      throw new Error('阿里云短信未配置 ALIYUN_SMS_ACCESS_KEY_ID / SECRET');
    }
    const config = new OpenApiConfig({ accessKeyId, accessKeySecret });
    config.endpoint = this.configService.get<string>('ALIYUN_SMS_ENDPOINT', 'dysmsapi.aliyuncs.com');
    this.aliyunClient = new Dysmsapi20170525(config);
    return this.aliyunClient;
  }

  private async sendViaAliyun(phone: string, code: string): Promise<void> {
    const signName = this.configService.get<string>('ALIYUN_SMS_SIGN_NAME');
    const templateCode = this.configService.get<string>('ALIYUN_SMS_TEMPLATE_CODE');
    const paramKey = this.configService.get<string>('ALIYUN_SMS_TEMPLATE_PARAM_KEY', 'code');
    if (!signName || !templateCode) {
      throw new Error('阿里云短信缺少 ALIYUN_SMS_SIGN_NAME 或 ALIYUN_SMS_TEMPLATE_CODE');
    }

    const client = this.getAliyunClient();
    const request = new SendSmsRequest({
      phoneNumbers: phone,
      signName,
      templateCode,
      templateParam: JSON.stringify({ [paramKey]: code }),
    });
    const runtime = new RuntimeOptions({
      readTimeout: this.timeoutMs,
      connectTimeout: this.timeoutMs,
    });

    const response = await client.sendSmsWithOptions(request, runtime);
    const body = response?.body;
    if (!body || body.code !== 'OK') {
      const err = new Error(
        `阿里云短信返回 ${body?.code ?? '未知'}：${body?.message ?? ''}`,
      ) as Error & { code?: string };
      err.code = body?.code;
      throw err;
    }
  }

  private isRetryable(error: unknown): boolean {
    const code = (error as { code?: string })?.code ?? '';
    if (code && SmsService.RETRYABLE_CODES.has(code)) return true;
    const msg = String((error as Error)?.message ?? '');
    if (code && SmsService.RETRYABLE_CODES.has(code.split(':')[0])) return true;
    return SmsService.RETRYABLE_NET.test(msg);
  }

  // 指数退避：500ms, 1s, 2s ...（上限 4s），带少量抖动
  private backoffMs(attempt: number): number {
    const base = Math.min(500 * 2 ** (attempt - 1), 4000);
    return base + Math.floor(Math.random() * 200);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private mask(phone: string): string {
    return phone.length === 11 ? `${phone.slice(0, 3)}****${phone.slice(7)}` : phone;
  }
}

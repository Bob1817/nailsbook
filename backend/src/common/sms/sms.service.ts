import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Dysmsapi20170525, { SendSmsRequest } from '@alicloud/dysmsapi20170525';
import { Config as OpenApiConfig } from '@alicloud/openapi-client';
import { RuntimeOptions } from '@alicloud/tea-util';

/**
 * 短信发送服务。
 *
 * - SMS_PROVIDER=aliyun 时通过阿里云短信发送；
 * - 未配置 provider 时仅打印日志（配合 VerificationCodeService 的开发验证码使用）。
 *
 * 阿里云所需环境变量：
 *   ALIYUN_SMS_ACCESS_KEY_ID
 *   ALIYUN_SMS_ACCESS_KEY_SECRET
 *   ALIYUN_SMS_SIGN_NAME            短信签名
 *   ALIYUN_SMS_TEMPLATE_CODE        模板 CODE
 *   ALIYUN_SMS_TEMPLATE_PARAM_KEY   模板变量名（默认 code）
 *   ALIYUN_SMS_ENDPOINT             默认 dysmsapi.aliyuncs.com
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private aliyunClient?: Dysmsapi20170525;

  constructor(private readonly configService: ConfigService) {}

  private get provider(): string {
    return this.configService.get<string>('SMS_PROVIDER', '').trim().toLowerCase();
  }

  async sendVerificationCode(phone: string, code: string, scene = '验证码'): Promise<void> {
    if (!this.provider) {
      this.logger.warn(
        `[SMS 未配置] 向 ${phone} 发送「${scene}」验证码：${code}（开发环境请使用此码或开发固定码）`,
      );
      return;
    }
    try {
      await this.dispatch(phone, code, scene);
    } catch (error) {
      this.logger.error(
        `[SMS:${this.provider}] 发送到 ${phone} 失败：${(error as Error).message}`,
      );
      throw error;
    }
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
    config.endpoint = this.configService.get<string>(
      'ALIYUN_SMS_ENDPOINT',
      'dysmsapi.aliyuncs.com',
    );
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

    const response = await client.sendSmsWithOptions(request, new RuntimeOptions({}));
    const body = response?.body;
    if (!body || body.code !== 'OK') {
      throw new Error(
        `阿里云短信返回非 OK：${body?.code ?? '未知'} - ${body?.message ?? ''}`,
      );
    }
    this.logger.log(`[SMS:aliyun] 已向 ${phone} 发送验证码，bizId=${body.bizId ?? '-'}`);
  }
}

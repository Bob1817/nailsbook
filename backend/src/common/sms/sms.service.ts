import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 短信发送服务。
 *
 * 当前未接入真实短信服务商：
 * - 开发环境（或未配置 provider 时）仅打印日志，配合 VerificationCodeService 的开发验证码使用。
 * - 接入服务商时，在 `dispatch` 中实现 provider 调用即可（阿里云/腾讯云等），其余流程无需改动。
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  private get provider(): string {
    return this.configService.get<string>('SMS_PROVIDER', '').trim();
  }

  async sendVerificationCode(phone: string, code: string, scene = '验证码'): Promise<void> {
    if (!this.provider) {
      this.logger.warn(
        `[SMS 未配置] 向 ${phone} 发送「${scene}」验证码：${code}（开发环境请使用此码或开发固定码）`,
      );
      return;
    }
    await this.dispatch(phone, code, scene);
  }

  // TODO: 接入短信服务商后在此实现真实发送（按 provider 分支）
  private async dispatch(phone: string, code: string, scene: string): Promise<void> {
    this.logger.log(
      `[SMS:${this.provider}] 发送「${scene}」验证码到 ${phone}（请实现 provider 调用）：${code}`,
    );
  }
}

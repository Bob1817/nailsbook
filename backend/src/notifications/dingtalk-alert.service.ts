import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DingtalkAlertService {
  private readonly logger = new Logger(DingtalkAlertService.name);
  private readonly webhookUrl: string;

  constructor(private readonly config: ConfigService) {
    this.webhookUrl =
      this.config.get<string>('DINGTALK_WEBHOOK_URL') ||
      'https://oapi.dingtalk.com/robot/send?access_token=bb8707099cddabdc9a2c5d669f15dfcd577c3ade2c08fd7bd878b310c14bc7d5';
  }

  async sendMarkdown(title: string, markdownText: string): Promise<boolean> {
    if (!this.webhookUrl) return false;
    try {
      // 钉钉安全设置中要求包含关键词 OnlyNail
      const safeText = markdownText.includes('OnlyNail')
        ? markdownText
        : `### OnlyNail 运营提醒\n\n${markdownText}`;
      const safeTitle = title.includes('OnlyNail') ? title : `OnlyNail - ${title}`;

      const res = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msgtype: 'markdown',
          markdown: {
            title: safeTitle,
            text: safeText,
          },
        }),
      });
      const data = (await res.json()) as { errcode?: number; errmsg?: string };
      if (data && data.errcode === 0) {
        return true;
      }
      this.logger.warn(`钉钉机器人推送失败: ${JSON.stringify(data)}`);
      return false;
    } catch (err) {
      this.logger.error(`钉钉机器人推送异常: ${String(err)}`);
      return false;
    }
  }

  /** 发送小程序在线客服咨询消息 */
  async notifyCustomerServiceMessage(params: {
    source: string;
    role: string;
    name?: string;
    phone?: string;
    content: string;
    submittedAt?: Date;
  }) {
    const timeStr = (params.submittedAt || new Date()).toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
    });
    const text = [
      `### 💬 OnlyNail 客服新咨询提醒`,
      `**收到来自小程序用户的在线留言**`,
      `• **咨询来源**：${params.source}`,
      `• **用户身份**：${params.role}${params.name ? ` (${params.name})` : ''}`,
      `• **联系电话**：${params.phone || '未填写'}`,
      `• **提交时间**：${timeStr}`,
      `• **留言内容**：`,
      `> ${params.content.replace(/\n/g, '\n> ')}`,
      ``,
      `*请及时通过微信/电话联系用户解答疑问。*`,
    ].join('\n');

    return this.sendMarkdown('OnlyNail 收到客服新留言', text);
  }

  /** 发送美甲师试用入驻申请通知 */
  async notifyArtistApplication(params: {
    name: string;
    phone: string;
    city?: string;
    serviceMode?: string;
    note?: string;
  }) {
    const timeStr = new Date().toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
    });
    const text = [
      `### 📋 OnlyNail 新美甲师试用申请！`,
      `**收到新的美甲师入驻试用申请**`,
      `• **申请人姓名**：${params.name}`,
      `• **联系电话**：${params.phone}`,
      `• **所在城市**：${params.city || '未填写'}`,
      `• **服务模式**：${params.serviceMode || '未指定'}`,
      params.note ? `• **申请备注**：${params.note}` : '',
      `• **提交时间**：${timeStr}`,
      ``,
      `👉 [点击登录管理后台审批](https://admin.lunails.cn/#/artist-applications)`,
    ]
      .filter(Boolean)
      .join('\n');

    return this.sendMarkdown('OnlyNail 美甲师试用申请', text);
  }

  /** 发送新作品发布待审核通知 */
  async notifyWorkSubmission(params: {
    workId: number;
    title: string;
    technicianName?: string;
    technicianId: number;
  }) {
    const timeStr = new Date().toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
    });
    const text = [
      `### 🎨 OnlyNail 新作品待审核提醒`,
      `**美甲师提交了新作品，等待公开审核**`,
      `• **作品名称**：${params.title}`,
      `• **美甲师**：${params.technicianName || `美甲师 #${params.technicianId}`}`,
      `• **作品 ID**：#${params.workId}`,
      `• **提交时间**：${timeStr}`,
      ``,
      `👉 [点击登录管理后台审核作品](https://admin.lunails.cn/#/works)`,
    ].join('\n');

    return this.sendMarkdown('OnlyNail 作品待审核提醒', text);
  }
}

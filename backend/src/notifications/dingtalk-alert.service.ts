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

  /** 发送美甲师试用入驻 / 官方活动申请通知 */
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
    const isCampaign = params.serviceMode === 'model_artist';
    const text = [
      isCampaign ? `### ✨ OnlyNail 官方活动新申请！` : `### 📋 OnlyNail 新美甲师试用申请！`,
      isCampaign ? `**收到新的模特美甲师官方活动申请**` : `**收到新的美甲师入驻试用申请**`,
      `• **申请人姓名**：${params.name}`,
      `• **联系电话**：${params.phone}`,
      `• **所在城市**：${params.city || '未填写'}`,
      `• **申请类型**：${isCampaign ? '模特美甲师官方活动' : params.serviceMode || '未指定'}`,
      params.note ? `• **申请备注**：${params.note}` : '',
      `• **提交时间**：${timeStr}`,
      ``,
      `👉 [点击登录管理后台审批](https://admin.lunails.cn/#/artist-applications)`,
    ]
      .filter(Boolean)
      .join('\n');

    return this.sendMarkdown(
      isCampaign ? 'OnlyNail 官方活动新申请' : 'OnlyNail 美甲师试用申请',
      text,
    );
  }

  /** 发送新用户注册通知 */
  async notifyUserRegistration(params: {
    role: 'client' | 'technician';
    name?: string | null;
    phone: string;
    source?: string;
  }) {
    const timeStr = new Date().toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
    });
    const roleLabel = params.role === 'technician' ? '美甲师' : '客户';
    const text = [
      `### 🎉 OnlyNail 新${roleLabel}注册通知`,
      `• **用户身份**：${roleLabel}`,
      `• **昵称/姓名**：${params.name || '未填写'}`,
      `• **手机号码**：${params.phone}`,
      `• **注册来源**：${params.source || '直接注册'}`,
      `• **注册时间**：${timeStr}`,
      ``,
      `👉 [登录超管后台查看](https://admin.lunails.cn)`,
    ].join('\n');

    return this.sendMarkdown(`OnlyNail 新${roleLabel}注册`, text);
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

  /** 发送系统异常报警（带 5 分钟去重防刷） */
  private lastAlertTimestamps = new Map<string, number>();

  async notifySystemError(params: {
    source: string;
    errorType: string;
    message: string;
    stack?: string;
    route?: string;
    userRole?: string;
    userId?: number;
    deviceInfo?: string;
    ip?: string;
  }) {
    const dedupeKey = `${params.source}_${params.errorType}_${params.message.slice(0, 100)}`;
    const now = Date.now();
    const lastTime = this.lastAlertTimestamps.get(dedupeKey) || 0;
    if (now - lastTime < 5 * 60 * 1000) {
      return false;
    }
    this.lastAlertTimestamps.set(dedupeKey, now);
    if (this.lastAlertTimestamps.size > 200) {
      this.lastAlertTimestamps.clear();
    }

    const timeStr = new Date().toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
    });

    let deviceSummary = '';
    if (params.deviceInfo) {
      try {
        const parsed = JSON.parse(params.deviceInfo);
        const parts = [
          parsed.brand || parsed.model,
          parsed.system,
          parsed.version ? `微信${parsed.version}` : null,
          parsed.SDKVersion ? `基础库${parsed.SDKVersion}` : null,
        ].filter(Boolean);
        deviceSummary = parts.join(' · ');
      } catch {
        deviceSummary = params.deviceInfo.slice(0, 100);
      }
    }

    const sourceLabel =
      params.source === 'mini_program'
        ? '📱 微信小程序'
        : params.source === 'backend'
          ? '🖥️ 后端服务'
          : '🌐 管理后台';

    const text = [
      `### 🚨 OnlyNail 系统异常监控告警！`,
      `**系统捕获到真机/线上环境未处理异常**`,
      `• **报错来源**：${sourceLabel}`,
      `• **异常类型**：\`${params.errorType}\``,
      params.route ? `• **发生页面/接口**：\`${params.route}\`` : '',
      params.userRole
        ? `• **受影响用户**：${params.userRole}${params.userId ? ` (ID: ${params.userId})` : ''}`
        : '',
      deviceSummary ? `• **终端环境**：${deviceSummary}` : '',
      `• **告警时间**：${timeStr}`,
      `• **报错信息**：`,
      `> ${params.message.slice(0, 300).replace(/\n/g, '\n> ')}`,
      params.stack
        ? `• **堆栈摘要**：\n\`\`\`\n${params.stack.slice(0, 350)}\n\`\`\``
        : '',
      ``,
      `👉 [点击登录超管后台查看完整日志与堆栈](https://admin.lunails.cn/#/system-errors)`,
    ]
      .filter(Boolean)
      .join('\n');

    return this.sendMarkdown('OnlyNail 系统异常告警', text);
  }
}

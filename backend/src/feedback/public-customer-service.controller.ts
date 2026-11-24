import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { DingtalkAlertService } from '../notifications/dingtalk-alert.service';
import { WechatOfficialAlertService } from '../wechat-official/wechat-official-alert.service';
import { CustomerServiceMessageDto } from './dto/customer-service-message.dto';

const SOURCE_LABELS: Record<string, string> = {
  about_page: '关于我们（未登录/展示页）',
  client_profile: '客户端「我的」页面',
  client_help: '客户端「帮助与反馈」页面',
  technician_profile: '美甲师端「我的」页面',
  technician_help: '美甲师端「帮助与反馈」页面',
};

const ROLE_LABELS: Record<string, string> = {
  guest: '访客/新用户',
  client: '客户',
  technician: '美甲师',
};

@Controller('public/customer-service')
export class PublicCustomerServiceController {
  private readonly logger = new Logger(PublicCustomerServiceController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dingtalkAlert: DingtalkAlertService,
    private readonly wechatAlert: WechatOfficialAlertService,
  ) {}

  @Post('message')
  @HttpCode(HttpStatus.OK)
  async submitMessage(@Body() dto: CustomerServiceMessageDto) {
    const content = (dto.content || '').trim();
    const phone = (dto.phone || '').trim();
    const name = (dto.name || '').trim();
    const source = dto.source || 'about_page';
    const role = dto.role || 'guest';
    const attachmentUrls = Array.isArray(dto.attachmentUrls)
      ? dto.attachmentUrls
          .filter((url): url is string => typeof url === 'string' && !!url.trim())
          .map((url) => url.trim())
          .slice(0, 6)
      : [];

    const sourceLabel = SOURCE_LABELS[source] || source;
    const roleLabel = ROLE_LABELS[role] || role;

    // 1. 保存到反馈表留存，超管可在后台随时查看与回复
    try {
      await this.prisma.feedback.create({
        data: {
          sourceType: role === 'technician' ? 'technician' : 'client',
          sourceId: 0,
          sourceName: name ? `${name} [${roleLabel}]` : roleLabel,
          sourcePhone: phone || null,
          title: `[客服咨询] 来自 ${sourceLabel}`,
          type: '客服咨询',
          content,
          attachmentUrls: JSON.stringify(attachmentUrls),
          status: 'pending',
        },
      });
    } catch (dbErr) {
      this.logger.error(`保存客服留言到数据库异常: ${String(dbErr)}`);
    }

    // 2. 异步触发钉钉机器人实时推送通知
    const timeStr = new Date().toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
    });
    const dingtalkMarkdown = [
      '### 💬 OnlyNail 客服新咨询提醒',
      '**收到来自小程序用户的在线留言**',
      `• **咨询来源**：${sourceLabel}`,
      `• **用户身份**：${roleLabel}${name ? ` (${name})` : ''}`,
      `• **联系电话**：${phone || '未填写'}`,
      attachmentUrls.length ? `• **附带截图**：${attachmentUrls.length} 张` : '',
      `• **提交时间**：${timeStr}`,
      '• **留言内容**：',
      `> ${content.replace(/\n/g, '\n> ')}`,
      '',
      '*已同步保存至超管后台「客服与反馈」，请及时回复处理。*',
    ]
      .filter(Boolean)
      .join('\n');
    this.dingtalkAlert
      .sendMarkdown('OnlyNail 收到客服新留言', dingtalkMarkdown)
      .catch((pushErr) => {
        this.logger.error(`推送客服留言到钉钉异常: ${String(pushErr)}`);
      });

    // 3. 异步通过微信公众号（服务号）向超管微信号发送实时客服消息通知
    this.wechatAlert
      .notifyCustomerServiceMessage({
        source: sourceLabel,
        role: roleLabel,
        name,
        phone,
        content,
        attachmentCount: attachmentUrls.length,
      })
      .catch((wechatErr) => {
        this.logger.error(`推送客服留言到微信公众号异常: ${String(wechatErr)}`);
      });

    return {
      success: true,
      message: '留言已成功送达客服！我们将尽快与您联系。',
    };
  }
}

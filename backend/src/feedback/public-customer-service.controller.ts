import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { DingtalkAlertService } from '../notifications/dingtalk-alert.service';
import { CustomerServiceMessageDto } from './dto/customer-service-message.dto';

const SOURCE_LABELS: Record<string, string> = {
  about_page: '关于我们（未登录/展示页）',
  client_profile: '客户端「我的」页面',
  technician_profile: '美甲师端「我的」页面',
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
  ) {}

  @Post('message')
  @HttpCode(HttpStatus.OK)
  async submitMessage(@Body() dto: CustomerServiceMessageDto) {
    const content = (dto.content || '').trim();
    const phone = (dto.phone || '').trim();
    const name = (dto.name || '').trim();
    const source = dto.source || 'about_page';
    const role = dto.role || 'guest';

    const sourceLabel = SOURCE_LABELS[source] || source;
    const roleLabel = ROLE_LABELS[role] || role;

    // 1. 保存到反馈表留存
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
          status: 'pending',
        },
      });
    } catch (dbErr) {
      this.logger.error(`保存客服留言到数据库异常: ${String(dbErr)}`);
    }

    // 2. 异步触发钉钉机器人实时推送通知
    this.dingtalkAlert
      .notifyCustomerServiceMessage({
        source: sourceLabel,
        role: roleLabel,
        name,
        phone,
        content,
      })
      .catch((pushErr) => {
        this.logger.error(`推送客服留言到钉钉异常: ${String(pushErr)}`);
      });

    return {
      success: true,
      message: '留言已成功送达客服！我们将尽快与您联系。',
    };
  }
}

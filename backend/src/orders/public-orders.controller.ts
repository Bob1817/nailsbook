import {
  Controller, Get, Param, Post,
  NotFoundException, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma/prisma.service';

@ApiTags('公开-预约确认')
@Controller('orders/confirm')
export class PublicOrdersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':token')
  @ApiOperation({ summary: '查询待确认预约详情（无需登录）' })
  @ApiParam({ name: 'token', description: '确认 token' })
  async getByToken(@Param('token') token: string) {
    const order = await this.prisma.order.findFirst({
      where: { confirmToken: token },
      include: {
        technician: {
          select: { id: true, name: true, phone: true, avatarUrl: true },
        },
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    if (!order) throw new NotFoundException('预约链接无效');

    if (order.confirmTokenExpiresAt && order.confirmTokenExpiresAt < new Date()) {
      return { expired: true, message: '链接已过期，请联系美甲师重新发送' };
    }

    if (order.confirmTokenUsedAt) {
      return {
        alreadyConfirmed: true,
        message: order.status === 'cancelled' ? '预约已取消' : '预约已确认',
        status: order.status,
      };
    }

    return {
      id: order.id,
      orderNo: order.orderNo,
      price: order.quotePrice,
      startTime: order.startTime,
      serviceType: order.serviceType,
      address: order.address,
      remark: order.remark,
      customDescription: order.customDescription,
      technician: order.technician,
      status: order.status,
    };
  }

  @Post(':token/accept')
  @ApiOperation({ summary: '客户确认预约（无需登录）' })
  async acceptByToken(@Param('token') token: string) {
    const order = await this.prisma.order.findFirst({
      where: { confirmToken: token },
    });
    if (!order) throw new NotFoundException('预约链接无效');
    if (order.confirmTokenExpiresAt && order.confirmTokenExpiresAt < new Date()) {
      throw new BadRequestException('链接已过期，请联系美甲师重新发送');
    }
    if (order.confirmTokenUsedAt) {
      throw new BadRequestException('该链接已使用');
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'pending_confirm',
        confirmTokenUsedAt: new Date(),
        confirmedAt: new Date(),
      },
    });
    return { success: true, message: '预约已确认' };
  }

  @Post(':token/cancel')
  @ApiOperation({ summary: '客户取消预约（无需登录）' })
  async cancelByToken(@Param('token') token: string) {
    const order = await this.prisma.order.findFirst({
      where: { confirmToken: token },
    });
    if (!order) throw new NotFoundException('预约链接无效');
    if (order.confirmTokenExpiresAt && order.confirmTokenExpiresAt < new Date()) {
      throw new BadRequestException('链接已过期');
    }
    if (order.confirmTokenUsedAt) {
      throw new BadRequestException('该链接已使用');
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'cancelled',
        confirmTokenUsedAt: new Date(),
        cancelledAt: new Date(),
        cancelReason: '客户通过链接取消',
      },
    });
    return { success: true, message: '预约已取消' };
  }
}

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import * as crypto from 'crypto';
import { CreateTechnicianBookingDto } from './dto/create-technician-booking.dto';
import { ReviewBookingDto } from './dto/review-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async createForTechnician(technicianId: number, dto: CreateTechnicianBookingDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    if (customer.technicianId !== technicianId) {
      throw new ForbiddenException('无权为该客户创建预约');
    }

    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.quote.create({
        data: {
          quoteNo: this.generateQuoteNo(),
          technicianId,
          customerId: customer.id,
          title: dto.serviceName,
          description: dto.note || dto.serviceName,
          price: dto.price,
          depositAmount: 0,
          status: 'accepted',
          acceptedAt: new Date(),
        },
      });

      return tx.booking.create({
        data: {
          bookingNo: this.generateBookingNo(),
          quoteId: quote.id,
          technicianId,
          customerId: customer.id,
          clientUserId: customer.clientUserId ?? null,
          startTime: new Date(dto.startTime),
          endTime: new Date(dto.endTime),
          address: dto.address,
          status: 'pending_confirm',
          cancelReason: dto.note || null,
        },
        include: {
          technician: { select: { id: true, name: true, phone: true } },
          customer: { select: { id: true, name: true, phone: true } },
          quote: { select: { id: true, quoteNo: true, title: true, description: true, price: true } },
        },
      });
    });
  }

  async findAll(page: number = 1, limit: number = 20, technicianId?: number, customerId?: number, status?: string) {
    const where: any = {};

    if (technicianId) {
      where.technicianId = technicianId;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (status) {
      where.status = status;
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          technician: { select: { id: true, name: true, phone: true } },
          customer: { select: { id: true, name: true, phone: true } },
          quote: { select: { id: true, quoteNo: true, title: true, description: true, price: true } },
        },
        orderBy: { startTime: 'desc' },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        technician: { select: { id: true, name: true, phone: true } },
        customer: { select: { id: true, name: true, phone: true } },
        quote: true,
        revenue: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async findOneForTechnician(id: number, technicianId: number) {
    const booking = await this.findOne(id);

    if (booking.technicianId !== technicianId) {
      throw new ForbiddenException('无权访问该预约');
    }

    return booking;
  }

  async confirm(id: number) {
    const booking = await this.findOne(id);

    if (booking.status !== 'pending_confirm') {
      throw new Error('Only pending_confirm bookings can be confirmed');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: {
          status: 'confirmed',
          confirmedAt: new Date(),
        },
      });

      if (booking.clientUserId) {
        const title = booking.quote?.title || '预约服务';
        const preview = `预约已确认：${title}，请准时到店`;
        const conversation = await tx.conversation.upsert({
          where: {
            clientId_techId: {
              clientId: booking.clientUserId,
              techId: booking.technicianId,
            },
          },
          update: { lastMessage: preview, lastMessageAt: new Date() },
          create: { clientId: booking.clientUserId, techId: booking.technicianId, lastMessage: preview, lastMessageAt: new Date() },
        });

        await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderType: 'technician',
            senderId: booking.technicianId,
            receiverType: 'client',
            receiverId: booking.clientUserId,
            messageType: 'booking',
            content: preview,
            relatedType: 'booking',
            relatedId: booking.id,
          },
        });
      }

      return updated;
    });
  }

  async review(id: number, technicianId: number, dto: ReviewBookingDto) {
    const booking = await this.findOneForTechnician(id, technicianId);

    if (booking.status !== 'pending_confirm') {
      throw new BadRequestException('当前预约状态不支持核实');
    }

    const startTime = new Date(`${dto.serviceDate}T${dto.startTime}:00`);
    const endTime = new Date(startTime.getTime() + Number(dto.durationMinutes) * 60000);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime()) || Number(dto.durationMinutes) <= 0) {
      throw new BadRequestException('预约时间或预估时长无效');
    }

    await this.assertConfirmedBookingConflict(technicianId, startTime, endTime, booking.id);

    return this.prisma.$transaction(async (tx) => {
      await tx.quote.update({
        where: { id: booking.quoteId },
        data: {
          price: dto.price,
          status: 'accepted',
          acceptedAt: new Date(),
        },
      });

      const updatedBooking = await tx.booking.update({
        where: { id },
        data: {
          startTime,
          endTime,
          quotePrice: dto.price,
        },
        include: {
          technician: { select: { id: true, name: true, phone: true } },
          customer: { select: { id: true, name: true, phone: true } },
          quote: { select: { id: true, quoteNo: true, title: true, description: true, price: true } },
        },
      });

      if (booking.clientUserId) {
        const preview = `预约已核实：${updatedBooking.quote?.title || '预约服务'}，请确认时间与费用`;
        const conversation = await tx.conversation.upsert({
          where: {
            clientId_techId: {
              clientId: booking.clientUserId,
              techId: technicianId,
            },
          },
          update: {
            lastMessage: preview,
            lastMessageAt: new Date(),
          },
          create: {
            clientId: booking.clientUserId,
            techId: technicianId,
            lastMessage: preview,
            lastMessageAt: new Date(),
          },
        });

        await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderType: 'technician',
            senderId: technicianId,
            receiverType: 'client',
            receiverId: booking.clientUserId,
            messageType: 'booking',
            content: preview,
            relatedType: 'booking',
            relatedId: booking.id,
          },
        });
      }

      return updatedBooking;
    });
  }

  async complete(id: number) {
    const booking = await this.findOne(id);

    if (booking.status !== 'confirmed') {
      throw new Error('Only confirmed bookings can be completed');
    }

    const revenueExists = await this.prisma.revenue.findUnique({
      where: { bookingId: id },
    });

    if (revenueExists) {
      throw new Error('Revenue already generated for this booking');
    }

    const quote = await this.prisma.quote.findUnique({
      where: { id: booking.quoteId },
    });

    if (!quote) {
      throw new Error('Quote not found');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      const revenue = await tx.revenue.create({
        data: {
          revenueNo: this.generateRevenueNo(),
          bookingId: id,
          quoteId: booking.quoteId,
          technicianId: booking.technicianId,
          customerId: booking.customerId,
          amount: quote.price,
          recognizedAt: new Date(),
          status: 'confirmed',
        },
      });

      if (booking.clientUserId) {
        const title = booking.quote?.title || '预约服务';
        const preview = `服务已完成：${title}，感谢您的信任`;
        const conversation = await tx.conversation.upsert({
          where: {
            clientId_techId: {
              clientId: booking.clientUserId,
              techId: booking.technicianId,
            },
          },
          update: { lastMessage: preview, lastMessageAt: new Date() },
          create: { clientId: booking.clientUserId, techId: booking.technicianId, lastMessage: preview, lastMessageAt: new Date() },
        });

        await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderType: 'technician',
            senderId: booking.technicianId,
            receiverType: 'client',
            receiverId: booking.clientUserId,
            messageType: 'booking',
            content: preview,
            relatedType: 'booking',
            relatedId: booking.id,
          },
        });
      }

      return revenue;
    });
  }

  async cancel(id: number) {
    const booking = await this.findOne(id);

    if (booking.status === 'completed') {
      throw new Error('Completed bookings cannot be cancelled');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
        },
      });

      if (booking.clientUserId) {
        const title = booking.quote?.title || '预约服务';
        const preview = `预约已取消：${title}`;
        const conversation = await tx.conversation.upsert({
          where: {
            clientId_techId: {
              clientId: booking.clientUserId,
              techId: booking.technicianId,
            },
          },
          update: { lastMessage: preview, lastMessageAt: new Date() },
          create: { clientId: booking.clientUserId, techId: booking.technicianId, lastMessage: preview, lastMessageAt: new Date() },
        });

        await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderType: 'technician',
            senderId: booking.technicianId,
            receiverType: 'client',
            receiverId: booking.clientUserId,
            messageType: 'booking',
            content: preview,
            relatedType: 'booking',
            relatedId: booking.id,
          },
        });
      }

      return updated;
    });
  }

  private generateRevenueNo(): string {
    return `RV${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }

  private generateBookingNo(): string {
    return `BK${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }

  private generateQuoteNo(): string {
    return `QT${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }

  private async assertConfirmedBookingConflict(technicianId: number, startTime: Date, endTime: Date, ignoreId?: number) {
    const conflict = await this.prisma.booking.findFirst({
      where: {
        technicianId,
        status: 'confirmed',
        NOT: ignoreId ? { id: ignoreId } : undefined,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { id: true },
    });

    if (conflict) {
      throw new BadRequestException('该时段已被其他预约占用');
    }
  }
}

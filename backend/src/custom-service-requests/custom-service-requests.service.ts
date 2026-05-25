import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateCustomServiceRequestDto } from './dto/create-custom-service-request.dto';
import { QuoteCustomServiceRequestDto } from './dto/quote-custom-service-request.dto';
import * as crypto from 'crypto';

@Injectable()
export class CustomServiceRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clientUserId: number, dto: CreateCustomServiceRequestDto) {
    const binding = await this.prisma.clientTechBinding.findFirst({
      where: {
        clientId: clientUserId,
        techId: dto.techId,
        status: 'active',
      },
      include: {
        technician: true,
      },
    });

    if (!binding) {
      throw new NotFoundException('您未绑定该美甲师');
    }

    if (binding.technician.status !== 'active') {
      throw new BadRequestException('该美甲师当前未开启接单');
    }

    const client = await this.prisma.clientUser.findUnique({
      where: { id: clientUserId },
    });

    if (!client) {
      throw new NotFoundException('客户不存在');
    }

    // Validate address if provided
    if (dto.serviceType === '上门美甲' && dto.addressId) {
      const address = await this.prisma.clientAddress.findFirst({
        where: {
          id: dto.addressId,
          clientId: clientUserId,
        },
      });

      if (!address) {
        throw new NotFoundException('地址不存在');
      }
    }

    // Validate shop address if provided
    if (dto.serviceType === '到店美甲' && dto.shopAddress) {
      const shopAddresses = binding.technician.shopAddresses
        ? JSON.parse(binding.technician.shopAddresses)
        : [];
      const matchedShop = shopAddresses.find(
        (item: any) => item.name === dto.shopAddress?.name,
      );

      if (!matchedShop || matchedShop.enabled === false) {
        throw new BadRequestException('请选择有效的店铺地址');
      }
    }

    const customRequest = await this.prisma.$transaction(async (tx) => {
      const request = await tx.customServiceRequest.create({
        data: {
          requestNo: this.generateRequestNo(),
          clientId: clientUserId,
          techId: dto.techId,
          title: dto.title ?? null,
          description: dto.description ?? null,
          images: dto.images ? JSON.stringify(dto.images) : null,
          referenceWorkIds: dto.referenceWorkIds
            ? JSON.stringify(dto.referenceWorkIds)
            : null,
          serviceDate: dto.serviceDate ?? null,
          startTime: dto.startTime ?? null,
          serviceType: dto.serviceType ?? null,
          addressId: dto.addressId ?? null,
          shopAddress: dto.shopAddress ? JSON.stringify(dto.shopAddress) : null,
          status: 'pending_quote',
        },
      });

      // Create conversation message
      const preview = `新的自定义服务需求：${dto.title || '未命名服务'}`;
      const conversation = await tx.conversation.upsert({
        where: {
          clientId_techId: {
            clientId: clientUserId,
            techId: dto.techId,
          },
        },
        update: {
          lastMessage: preview,
          lastMessageAt: new Date(),
        },
        create: {
          clientId: clientUserId,
          techId: dto.techId,
          lastMessage: preview,
          lastMessageAt: new Date(),
        },
      });

      await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderType: 'client',
          senderId: clientUserId,
          receiverType: 'technician',
          receiverId: dto.techId,
          messageType: 'custom_service',
          content: preview,
          relatedType: 'custom_service_request',
          relatedId: request.id,
        },
      });

      return request;
    });

    return this.mapCustomServiceRequest(customRequest);
  }

  async findAllForClient(clientUserId: number) {
    const requests = await this.prisma.customServiceRequest.findMany({
      where: { clientId: clientUserId },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        technician: {
          select: { id: true, name: true, avatarUrl: true },
        },
        clientAddress: {
          select: {
            id: true,
            contactName: true,
            contactPhone: true,
            province: true,
            city: true,
            district: true,
            detailAddress: true,
            doorInfo: true,
          },
        },
      },
    });

    return requests.map((request) => this.mapCustomServiceRequest(request));
  }

  async findAllForTechnician(technicianId: number) {
    const requests = await this.prisma.customServiceRequest.findMany({
      where: { techId: technicianId },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        client: {
          select: { id: true, nickname: true, phone: true, avatarUrl: true },
        },
        clientAddress: {
          select: {
            id: true,
            contactName: true,
            contactPhone: true,
            province: true,
            city: true,
            district: true,
            detailAddress: true,
            doorInfo: true,
          },
        },
      },
    });

    return requests.map((request) => this.mapCustomServiceRequest(request));
  }

  async findOneForClient(clientUserId: number, id: number) {
    const request = await this.prisma.customServiceRequest.findFirst({
      where: {
        id,
        clientId: clientUserId,
      },
      include: {
        technician: {
          select: { id: true, name: true, avatarUrl: true },
        },
        clientAddress: {
          select: {
            id: true,
            contactName: true,
            contactPhone: true,
            province: true,
            city: true,
            district: true,
            detailAddress: true,
            doorInfo: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('自定义服务需求不存在');
    }

    return this.mapCustomServiceRequest(request);
  }

  async findOneForTechnician(technicianId: number, id: number) {
    const request = await this.prisma.customServiceRequest.findFirst({
      where: {
        id,
        techId: technicianId,
      },
      include: {
        client: {
          select: { id: true, nickname: true, phone: true, avatarUrl: true },
        },
        clientAddress: {
          select: {
            id: true,
            contactName: true,
            contactPhone: true,
            province: true,
            city: true,
            district: true,
            detailAddress: true,
            doorInfo: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('自定义服务需求不存在');
    }

    return this.mapCustomServiceRequest(request);
  }

  async quote(
    technicianId: number,
    id: number,
    dto: QuoteCustomServiceRequestDto,
  ) {
    const request = await this.prisma.customServiceRequest.findFirst({
      where: {
        id,
        techId: technicianId,
      },
    });

    if (!request) {
      throw new NotFoundException('自定义服务需求不存在');
    }

    if (request.status !== 'pending_quote') {
      throw new BadRequestException('当前状态不支持报价');
    }

    const updatedRequest = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.customServiceRequest.update({
        where: { id },
        data: {
          status: 'quoted',
          quotePrice: dto.price,
          quoteRemark: dto.remark ?? null,
          quotedAt: new Date(),
        },
      });

      // Send message to client
      const preview = `报价：¥${dto.price} - ${dto.remark || '请查看详情'}`;
      const conversation = await tx.conversation.findUnique({
        where: {
          clientId_techId: {
            clientId: request.clientId,
            techId: technicianId,
          },
        },
      });

      if (conversation) {
        await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderType: 'technician',
            senderId: technicianId,
            receiverType: 'client',
            receiverId: request.clientId,
            messageType: 'quote',
            content: preview,
            relatedType: 'custom_service_request',
            relatedId: request.id,
          },
        });

        await tx.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessage: preview,
            lastMessageAt: new Date(),
          },
        });
      }

      return updated;
    });

    return this.mapCustomServiceRequest(updatedRequest);
  }

  async acceptQuote(clientUserId: number, id: number) {
    const request = await this.prisma.customServiceRequest.findFirst({
      where: {
        id,
        clientId: clientUserId,
      },
      include: {
        client: {
          select: { id: true, nickname: true, phone: true },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('自定义服务需求不存在');
    }

    if (request.status !== 'quoted') {
      throw new BadRequestException('当前状态不支持接受报价');
    }

    const updatedRequest = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.customServiceRequest.update({
        where: { id },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
        },
      });

      // Create booking from custom service request
      const customer = await tx.customer.upsert({
        where: {
          technicianId_clientUserId: {
            technicianId: request.techId,
            clientUserId,
          },
        },
        update: {},
        create: {
          technicianId: request.techId,
          clientUserId,
          name: request.client?.nickname || request.client?.phone || '客户',
          phone: request.client?.phone || '',
        },
      });

      const startTime =
        request.serviceDate && request.startTime
          ? new Date(`${request.serviceDate}T${request.startTime}:00`)
          : new Date();
      const endTime = new Date(startTime);

      const order = await tx.order.create({
        data: {
          orderNo: this.generateOrderNo(),
          technicianId: request.techId,
          customerId: customer.id,
          clientUserId,
          addressId: request.addressId,
          startTime,
          endTime,
          address: request.shopAddress
            ? this.formatShopAddress(JSON.parse(request.shopAddress))
            : '',
          serviceType: request.serviceType,
          remark: request.description,
          quotePrice: request.quotePrice ?? 0,
          status: 'pending_quote',
          depositAmount: 0,
          depositStatus: 'pending',
          source: 'client_webapp',
        },
      });

      // Send confirmation message
      const conversation = await tx.conversation.findUnique({
        where: {
          clientId_techId: {
            clientId: clientUserId,
            techId: request.techId,
          },
        },
      });

      if (conversation) {
        const preview = `已接受报价，订单已创建：${request.title || '自定义服务'}`;
        await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderType: 'system',
            receiverType: 'technician',
            receiverId: request.techId,
            messageType: 'system',
            content: preview,
            relatedType: 'order',
            relatedId: order.id,
          },
        });

        await tx.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessage: preview,
            lastMessageAt: new Date(),
          },
        });
      }

      return updated;
    });

    return this.mapCustomServiceRequest(updatedRequest);
  }

  async rejectQuote(clientUserId: number, id: number) {
    const request = await this.prisma.customServiceRequest.findFirst({
      where: {
        id,
        clientId: clientUserId,
      },
    });

    if (!request) {
      throw new NotFoundException('自定义服务需求不存在');
    }

    if (request.status !== 'quoted') {
      throw new BadRequestException('当前状态不支持拒绝报价');
    }

    const updatedRequest = await this.prisma.customServiceRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
      },
    });

    return this.mapCustomServiceRequest(updatedRequest);
  }

  async cancel(clientUserId: number, id: number) {
    const request = await this.prisma.customServiceRequest.findFirst({
      where: {
        id,
        clientId: clientUserId,
      },
    });

    if (!request) {
      throw new NotFoundException('自定义服务需求不存在');
    }

    if (!['pending_quote', 'quoted'].includes(request.status)) {
      throw new BadRequestException('当前状态不支持取消');
    }

    const updatedRequest = await this.prisma.customServiceRequest.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });

    return this.mapCustomServiceRequest(updatedRequest);
  }

  private mapCustomServiceRequest(request: any) {
    return {
      id: request.id,
      requestNo: request.requestNo,
      clientId: request.clientId,
      techId: request.techId,
      title: request.title,
      description: request.description,
      images: request.images ? JSON.parse(request.images) : [],
      referenceWorkIds: request.referenceWorkIds
        ? JSON.parse(request.referenceWorkIds)
        : [],
      serviceDate: request.serviceDate,
      startTime: request.startTime,
      serviceType: request.serviceType,
      status: request.status,
      quotePrice: request.quotePrice,
      quoteRemark: request.quoteRemark,
      quotedAt: request.quotedAt,
      acceptedAt: request.acceptedAt,
      rejectedAt: request.rejectedAt,
      cancelledAt: request.cancelledAt,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      technician: request.technician ?? null,
      client: request.client ?? null,
      clientAddress: request.clientAddress ?? null,
      shopAddress: request.shopAddress ? JSON.parse(request.shopAddress) : null,
    };
  }

  private formatAddress(address: any) {
    return [
      address.province,
      address.city,
      address.district,
      address.detailAddress,
      address.doorInfo,
    ]
      .filter((item): item is string => Boolean(item))
      .join(' ');
  }

  private formatShopAddress(shopAddress: any) {
    return [
      shopAddress.province,
      shopAddress.city,
      shopAddress.district,
      shopAddress.detailAddress,
      shopAddress.doorInfo,
    ]
      .filter((item): item is string => Boolean(item))
      .join(' ');
  }

  private generateRequestNo() {
    return `CS${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }

  private generateOrderNo() {
    return `OD${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }
}

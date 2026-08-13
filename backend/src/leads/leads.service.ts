import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { assertLeadTransition } from './lead-rules';
import {
  CreateLeadFollowUpDto,
  CreateTechnicianLeadDto,
  UpdateLeadStatusDto,
} from './dto/lead.dto';
import { SubmitPublicInquiryDto } from './dto/submit-public-inquiry.dto';
import {
  normalizeChannel,
  safeAttributionToken,
} from '../conversion-events/conversion-attribution';
import { createHash } from 'crypto';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async submitPublic(dto: SubmitPublicInquiryDto) {
    if (!dto.privacyAgreed)
      throw new BadRequestException('请先阅读并同意隐私说明');
    const technician = await this.prisma.technician.findFirst({
      where: { id: dto.technicianId, status: 'active' },
      select: { id: true },
    });
    if (!technician) throw new NotFoundException('美甲师不存在或未启用');
    if (dto.workId) {
      const work = await this.prisma.nailWork.findFirst({
        where: {
          id: dto.workId,
          techId: dto.technicianId,
          isVisible: true,
          publicationStatus: 'approved',
        },
        select: { id: true },
      });
      if (!work) throw new NotFoundException('意向作品不存在或未公开');
    }
    const existing = await this.prisma.lead.findUnique({
      where: { submissionKey: dto.submissionKey },
    });
    if (existing)
      return { submitted: true, leadId: existing.id, deduplicated: true };
    const channel = normalizeChannel(dto.channel),
      identity = dto.visitorId?.trim() || dto.contact.trim().toLowerCase();
    const dedupeKey = createHash('sha256')
      .update(
        `${dto.technicianId}|${identity}|${Math.floor(Date.now() / 1800000)}`,
      )
      .digest('hex');
    const now = new Date(),
      nextFollowUpAt = new Date(now.getTime() + 86400000);
    const referralLink = dto.referral
      ? await this.prisma.referralLink.findFirst({
          where: {
            technicianId: dto.technicianId,
            revokedAt: null,
            expiresAt: { gt: now },
            OR: [
              { token: dto.referral },
              { referralCode: dto.referral.toUpperCase() },
            ],
          },
          include: { relations: { orderBy: { createdAt: 'desc' }, take: 1 } },
        })
      : null;
    const lead = await this.prisma.$transaction(async (tx) => {
      const row = await tx.lead.upsert({
        where: { dedupeKey },
        create: {
          technicianId: dto.technicianId,
          visitorId: dto.visitorId?.trim() || null,
          sourceChannel: channel,
          sourceCampaign: safeAttributionToken(dto.campaign),
          sourceContent: safeAttributionToken(dto.content),
          sourceWorkId: dto.workId,
          referralRelationId: referralLink?.relations[0]?.id ?? null,
          referrerClientId: referralLink?.referrerClientId ?? null,
          firstTouchpoint:
            safeAttributionToken(dto.touchpoint, 32) || 'inquiry_form',
          latestTouchpoint: 'inquiry_form',
          nickname: dto.nickname.trim(),
          contact: dto.contact.trim(),
          requirement: dto.requirement.trim(),
          budget: dto.budget?.trim() || null,
          expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
          privacyAgreedAt: now,
          submissionKey: dto.submissionKey,
          nextFollowUpAt,
          dedupeKey,
          statusHistories: {
            create: { technicianId: dto.technicianId, toStatus: 'new' },
          },
        },
        update: {
          nickname: dto.nickname.trim(),
          contact: dto.contact.trim(),
          requirement: dto.requirement.trim(),
          budget: dto.budget?.trim() || null,
          expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
          privacyAgreedAt: now,
          submissionKey: dto.submissionKey,
          latestTouchpoint: 'inquiry_form',
          lastActivityAt: now,
        },
      });
      await tx.conversionEvent.upsert({
        where: { eventId: `inquiry-${dto.submissionKey}` },
        create: {
          eventId: `inquiry-${dto.submissionKey}`,
          technicianId: dto.technicianId,
          workId: dto.workId,
          visitorId: dto.visitorId?.trim() || null,
          eventType: 'consult_submit',
          source: channel,
          channel,
          touchpoint: 'inquiry_form',
          campaign: safeAttributionToken(dto.campaign),
          content: safeAttributionToken(dto.content),
          dedupeKey: `consult-submit-${dto.submissionKey}`,
        },
        update: {},
      });
      return row;
    });
    return { submitted: true, leadId: lead.id, deduplicated: false };
  }

  findAll(
    technicianId: number,
    source?: string,
    status?: string,
    followUpFrom?: string,
    followUpTo?: string,
  ) {
    return this.prisma.lead.findMany({
      where: {
        technicianId,
        ...(source ? { sourceChannel: source } : {}),
        ...(status ? { status } : {}),
        ...(followUpFrom || followUpTo
          ? {
              nextFollowUpAt: {
                ...(followUpFrom ? { gte: new Date(followUpFrom) } : {}),
                ...(followUpTo ? { lte: new Date(followUpTo) } : {}),
              },
            }
          : {}),
      },
      include: {
        customer: true,
        sourceWork: { select: { id: true, title: true, coverUrl: true } },
        convertedOrder: { select: { id: true, orderNo: true, status: true } },
        followUps: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: [{ nextFollowUpAt: 'asc' }, { lastActivityAt: 'desc' }],
    });
  }

  async createManual(technicianId: number, dto: CreateTechnicianLeadDto) {
    if (dto.workId) {
      const work = await this.prisma.nailWork.findFirst({
        where: { id: dto.workId, techId: technicianId },
        select: { id: true },
      });
      if (!work) throw new NotFoundException('意向作品不存在');
    }
    const dedupeKey = createHash('sha256')
      .update(
        `${technicianId}|manual|${dto.contact.trim().toLowerCase()}|${Math.floor(Date.now() / 30000)}`,
      )
      .digest('hex');
    return this.prisma.lead.upsert({
      where: { dedupeKey },
      create: {
        technicianId,
        nickname: dto.nickname.trim(),
        contact: dto.contact.trim(),
        requirement: dto.requirement?.trim() || null,
        budget: dto.budget?.trim() || null,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        nextFollowUpAt: dto.nextFollowUpAt
          ? new Date(dto.nextFollowUpAt)
          : new Date(Date.now() + 86400000),
        sourceChannel: 'direct',
        sourceWorkId: dto.workId,
        firstTouchpoint: 'wechat_private',
        latestTouchpoint: 'wechat_private',
        dedupeKey,
        statusHistories: { create: { technicianId, toStatus: 'new' } },
      },
      update: { lastActivityAt: new Date() },
      include: {
        sourceWork: { select: { id: true, title: true, coverUrl: true } },
      },
    });
  }

  async findOne(technicianId: number, id: number) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, technicianId },
      include: {
        customer: true,
        sourceWork: true,
        convertedOrder: true,
        followUps: { orderBy: { createdAt: 'desc' } },
        statusHistories: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!lead) throw new NotFoundException('线索不存在');
    return lead;
  }

  async updateStatus(
    technicianId: number,
    id: number,
    dto: UpdateLeadStatusDto,
  ) {
    const lead = await this.findOne(technicianId, id);
    assertLeadTransition(lead.status, dto.status, dto.lostReason);
    let orderId: number | null = null;
    if (dto.status === 'won') {
      if (!dto.orderId) throw new BadRequestException('成交线索必须关联预约');
      const order = await this.prisma.order.findFirst({
        where: { id: dto.orderId, technicianId },
        select: { id: true, customerId: true, clientUserId: true },
      });
      if (!order) throw new BadRequestException('预约不存在或不属于当前美甲师');
      orderId = order.id;
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.lead.update({
        where: { id },
        data: {
          status: dto.status,
          lostReason: dto.status === 'lost' ? dto.lostReason : null,
          lostReasonNote: dto.status === 'lost' ? dto.lostReasonNote : null,
          nextFollowUpAt: dto.nextFollowUpAt
            ? new Date(dto.nextFollowUpAt)
            : null,
          pausedAt: dto.status === 'paused' ? new Date() : null,
          convertedAt: dto.status === 'won' ? new Date() : null,
          convertedOrderId: orderId,
          lastActivityAt: new Date(),
        },
      });
      await tx.leadStatusHistory.create({
        data: {
          leadId: id,
          technicianId,
          fromStatus: lead.status,
          toStatus: dto.status,
          reason: dto.status === 'lost' ? dto.lostReason : null,
        },
      });
      return updated;
    });
  }

  async addFollowUp(
    technicianId: number,
    id: number,
    dto: CreateLeadFollowUpDto,
  ) {
    const lead = await this.findOne(technicianId, id);
    if (['won', 'lost'].includes(lead.status))
      throw new BadRequestException('已结束线索不能新增跟进');
    return this.prisma.$transaction(async (tx) => {
      const followUp = await tx.leadFollowUp.create({
        data: {
          leadId: id,
          technicianId,
          content: dto.content.trim(),
          nextFollowUpAt: dto.nextFollowUpAt
            ? new Date(dto.nextFollowUpAt)
            : null,
        },
      });
      const nextStatus = lead.status === 'new' ? 'following_up' : lead.status;
      await tx.lead.update({
        where: { id },
        data: {
          status: nextStatus,
          nextFollowUpAt: dto.nextFollowUpAt
            ? new Date(dto.nextFollowUpAt)
            : null,
          lastActivityAt: new Date(),
        },
      });
      if (nextStatus !== lead.status)
        await tx.leadStatusHistory.create({
          data: {
            leadId: id,
            technicianId,
            fromStatus: lead.status,
            toStatus: nextStatus,
          },
        });
      return followUp;
    });
  }

  async convertToCustomer(technicianId: number, id: number) {
    const lead = await this.findOne(technicianId, id);
    if (lead.customerId) return lead.customer;
    const client = lead.clientUserId
      ? await this.prisma.clientUser.findUnique({
          where: { id: lead.clientUserId },
          select: { id: true, nickname: true, phone: true, avatarUrl: true },
        })
      : null;
    const customer =
      (lead.clientUserId
        ? await this.prisma.customer.findUnique({
            where: {
              technicianId_clientUserId: {
                technicianId,
                clientUserId: lead.clientUserId,
              },
            },
          })
        : await this.prisma.customer.findFirst({
            where: { technicianId, phone: lead.contact || undefined },
          })) ||
      (await this.prisma.customer.create({
        data: {
          technicianId,
          clientUserId: client?.id || null,
          name:
            lead.nickname || client?.nickname || lead.contact || '微信咨询客户',
          phone: client?.phone || lead.contact || null,
          avatarUrl: client?.avatarUrl || null,
          notes: lead.requirement || null,
          sourceType: lead.sourceChannel,
          sourceRef: String(lead.id),
        },
      }));
    await this.prisma.lead.update({
      where: { id },
      data: { customerId: customer.id, lastActivityAt: new Date() },
    });
    return customer;
  }

  async correctAttribution(
    technicianId: number,
    id: number,
    channel: string,
    workId: number | undefined,
    reason: string,
  ) {
    if (!reason?.trim()) throw new BadRequestException('修正来源必须填写原因');
    const lead = await this.findOne(technicianId, id);
    if (workId) {
      const work = await this.prisma.nailWork.findFirst({
        where: { id: workId, techId: technicianId },
        select: { id: true },
      });
      if (!work) throw new NotFoundException('归因作品不存在');
    }
    const normalized = normalizeChannel(channel);
    return this.prisma.$transaction(async (tx) => {
      await tx.attributionCorrection.create({
        data: {
          technicianId,
          entityType: 'lead',
          entityId: id,
          oldChannel: lead.sourceChannel,
          newChannel: normalized,
          oldWorkId: lead.sourceWorkId,
          newWorkId: workId ?? null,
          reason: reason.trim(),
        },
      });
      const updated = await tx.lead.update({
        where: { id },
        data: {
          sourceChannel: normalized,
          sourceWorkId: workId ?? null,
          latestTouchpoint: 'manual_correction',
        },
      });
      if (lead.convertedOrderId)
        await tx.order.update({
          where: { id: lead.convertedOrderId },
          data: {
            attributionChannel: normalized,
            sourceWorkId: workId ?? null,
          },
        });
      return updated;
    });
  }
}

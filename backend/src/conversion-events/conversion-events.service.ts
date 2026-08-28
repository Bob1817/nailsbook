import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RecordConversionEventDto } from './dto/record-conversion-event.dto';

@Injectable()
export class ConversionEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordPublic(dto: RecordConversionEventDto) {
    const technician = await this.prisma.technician.findFirst({
      where: { id: dto.technicianId, status: { in: ['active', 'inactive'] } },
      select: { id: true },
    });
    if (!technician) throw new NotFoundException('美甲师不存在或未启用');

    if (['work_view', 'poster_saved', 'poster_generated'].includes(dto.eventType) && !dto.workId) {
      throw new BadRequestException('作品浏览事件缺少作品');
    }
    if (dto.workId) {
      const work = await this.prisma.nailWork.findFirst({
        where: {
          id: dto.workId,
          techId: dto.technicianId,
          isVisible: true,
          publicationStatus: 'approved',
          archivedAt: null,
          ...(dto.shareToken ? {
            shareGrants: { some: { token: dto.shareToken, revokedAt: null,
              expiresAt: { gt: new Date() }, access: { canView: true, canShare: true } } },
          } : { visibilityScope: 'public' }),
        },
        select: { id: true },
      });
      if (!work) throw new NotFoundException('作品不存在或未公开');
    }

    const event = await this.prisma.conversionEvent.upsert({
      where: { eventId: dto.eventId },
      create: {
        eventId: dto.eventId,
        technicianId: dto.technicianId,
        workId: dto.workId,
        visitorId: dto.visitorId?.trim() || null,
        eventType: dto.eventType,
        source: this.normalizeSource(dto.source),
      },
      update: {},
      select: { id: true },
    });
    return { recorded: true, id: event.id };
  }

  private normalizeSource(source?: string) {
    const normalized = String(source || 'unknown')
      .trim()
      .toLowerCase();
    return /^[a-z0-9_-]{1,32}$/.test(normalized) ? normalized : 'unknown';
  }
}

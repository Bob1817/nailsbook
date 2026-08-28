import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
  Optional,
  BadRequestException,
} from '@nestjs/common';
import { WorkShareCodeService } from './work-share-code.service';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  isLaunchTechnician,
  launchTechnicianFilterId,
} from '../common/miniprogram-launch-mode';

const UPLOAD_BASE_URL = process.env.UPLOAD_BASE_URL || 'http://localhost:3000';

function toAbsoluteUrl(url: string | null): string | null {
  if (!url) return null;
  return url.startsWith('http') ? url : `${UPLOAD_BASE_URL}${url}`;
}

function parseImageUrls(
  images: string | null,
  coverUrl: string | null,
): string[] {
  if (!images) return coverUrl ? [coverUrl] : [];
  try {
    const parsed = JSON.parse(images);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
  } catch {
    return images
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean);
  }
  return coverUrl ? [coverUrl] : [];
}

@ApiTags('公开-作品')
@Controller('public/works')
export class PublicWorksController {
  constructor(private readonly prisma: PrismaService, @Optional() private readonly shareCodes?: WorkShareCodeService) {}

  @Get(':id/share-code')
  async getShareCode(@Param('id', ParseIntPipe) id: number, @Query('shareToken') shareToken?: string) {
    if (shareToken && !/^[a-f0-9]{48}$/.test(shareToken)) throw new BadRequestException('分享参数无效');
    const detail = shareToken ? await this.getSharedDetail(shareToken, false) : await this.getDetail(id);
    if (detail.id !== id) throw new NotFoundException('分享作品不匹配');
    if (!this.shareCodes) throw new BadRequestException('分享服务暂不可用');
    return this.shareCodes.generate(id, shareToken);
  }

  @Get()
  @ApiOperation({ summary: '获取游客可浏览的公开作品流' })
  async getPublicFeed(
    @Query('limit') limit?: string,
    @Query('techId') techId?: string,
  ) {
    const take = Math.min(50, Math.max(1, Number(limit) || 30));
    const requestedTechnicianId = Number(techId);
    const technicianId = launchTechnicianFilterId() ?? requestedTechnicianId;
    const works = await this.prisma.nailWork.findMany({
      where: {
        isVisible: true,
        visibilityScope: 'public',
        publicationStatus: 'approved',
        technician: { status: 'active' },
        ...(Number.isInteger(technicianId) && technicianId > 0
          ? { techId: technicianId }
          : {}),
      },
      include: {
        technician: {
          select: { id: true, name: true, avatarUrl: true, city: true },
        },
        _count: { select: { likes: true, comments: true } },
        serviceLines: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: [
        { isHomepageFeatured: 'desc' },
        { isFeatured: 'desc' },
        { createdAt: 'desc' },
      ],
      take,
    });
    return works.map((work) => {
      const imageUrls = parseImageUrls(work.images, work.coverUrl)
        .map(toAbsoluteUrl)
        .filter(Boolean);
      return {
        id: work.id,
        title: work.title,
        coverUrl: toAbsoluteUrl(work.coverUrl) ?? imageUrls[0] ?? null,
        imageUrls,
        tags: work.tags
          ? work.tags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
        technicianId: work.technician.id,
        technicianName: work.technician.name,
        technicianAvatarUrl: toAbsoluteUrl(work.technician.avatarUrl),
        technicianCity: work.technician.city,
        price: work.price,
        serviceSubtotalFen: work.serviceSubtotalFen,
        standardPriceFen: work.standardPriceFen,
        totalDurationMinutes: work.totalDurationMinutes,
        likeCount: work._count.likes,
        commentCount: work._count.comments,
        createdAt: work.createdAt,
      };
    });
  }

  @Get('featured')
  @ApiOperation({ summary: '获取精选作品列表' })
  @ApiResponse({ status: 200, description: '返回精选作品列表' })
  async getFeatured() {
    const technicianId = launchTechnicianFilterId();
    const works = await this.prisma.nailWork.findMany({
      where: {
        isFeatured: true,
        isVisible: true,
        visibilityScope: 'public',
        publicationStatus: 'approved',
        technician: { status: 'active' },
        ...(technicianId ? { techId: technicianId } : {}),
      },
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            city: true,
          },
        },
        serviceLines: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return works.map((work) => ({
      id: work.id,
      title: work.title,
      coverUrl: work.coverUrl,
      images: work.images,
      tags: work.tags,
      price: work.price,
      serviceSubtotalFen: work.serviceSubtotalFen,
      standardPriceFen: work.standardPriceFen,
      totalDurationMinutes: work.totalDurationMinutes,
      technician: work.technician,
    }));
  }

  @Get('homepage-featured')
  @ApiOperation({ summary: '获取官网精选作品列表（超管标记）' })
  @ApiResponse({ status: 200, description: '返回官网精选作品列表' })
  async getHomepageFeatured(@Query('limit') limit?: string) {
    const take = Math.min(50, Math.max(1, Number(limit) || 20));

    const technicianId = launchTechnicianFilterId();
    const works = await this.prisma.nailWork.findMany({
      where: {
        isHomepageFeatured: true,
        isVisible: true,
        visibilityScope: 'public',
        publicationStatus: 'approved',
        technician: { status: 'active' },
        ...(technicianId ? { techId: technicianId } : {}),
      },
      include: {
        technician: { select: { name: true, avatarUrl: true } },
        _count: { select: { likes: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take,
    });

    return works.map((work) => {
      const imageUrls = parseImageUrls(work.images, work.coverUrl)
        .map((url) => toAbsoluteUrl(url))
        .filter((url): url is string => Boolean(url));

      return {
        id: work.id,
        title: work.title,
        coverUrl: toAbsoluteUrl(work.coverUrl) ?? imageUrls[0] ?? null,
        imageUrls,
        tags: work.tags
          ? work.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        technicianName: work.technician?.name ?? '',
        technicianAvatarUrl: toAbsoluteUrl(work.technician?.avatarUrl ?? null),
        likeCount: work._count.likes,
      };
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '获取作品公开详情（只读）' })
  @ApiParam({ name: 'id', type: Number, description: '作品ID' })
  @ApiResponse({ status: 200, description: '返回作品详情' })
  @ApiResponse({ status: 404, description: '作品不存在' })
  async getDetail(@Param('id', ParseIntPipe) id: number) {
    return this.getMappedDetail({
      id,
      isVisible: true,
      visibilityScope: 'public',
      archivedAt: null,
      publicationStatus: 'approved',
      technician: { status: { in: ['active', 'inactive'] } },
    });
  }

  @Get('shared/:token')
  @ApiOperation({ summary: '通过限时分享授权查看作品' })
  async getSharedDetail(@Param('token') token: string, recordOpen = true) {
    const grant = await this.prisma.nailWorkShareGrant.findFirst({
      where: {
        token,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        access: { canView: true, canShare: true },
      },
      select: { id: true, workId: true },
    });
    if (!grant) throw new NotFoundException('分享已失效或授权已撤销');
    const detail = await this.getMappedDetail({
      id: grant.workId,
      technician: { status: { in: ['active', 'inactive'] } },
      isVisible: true,
      archivedAt: null,
      publicationStatus: 'approved',
    });
    if (recordOpen) await this.prisma.nailWorkShareEvent.create({
      data: {
        workId: grant.workId,
        shareGrantId: grant.id,
        eventType: 'open',
        channel: 'wechat',
      },
    });
    return detail;
  }

  private async getMappedDetail(where: any) {
    const work = await this.prisma.nailWork.findFirst({
      where,
      include: {
        _count: { select: { likes: true, comments: true } },
        technician: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            invitationCode: true,
            city: true,
            bio: true,
            status: true,
            shopAddresses: true,
          },
        },
        serviceLines: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!work) {
      throw new NotFoundException('作品不存在');
    }
    if (!isLaunchTechnician(work.technician.id)) {
      throw new NotFoundException('作品不存在');
    }

    const imageUrls = parseImageUrls(work.images, work.coverUrl)
      .map((url) => toAbsoluteUrl(url))
      .filter((url): url is string => Boolean(url));

    let shops: Array<{ name: string; address: string }> = [];
    try {
      const parsed = JSON.parse(work.technician.shopAddresses || '[]');
      if (Array.isArray(parsed)) {
        shops = parsed.filter((shop) => shop && shop.enabled !== false).map((shop) => ({
          name: typeof shop.name === 'string' ? shop.name : '服务店铺',
          address: [shop.province, shop.city, shop.district, shop.detailAddress]
            .filter((part) => typeof part === 'string' && part.trim()).join(' '),
        }));
      }
    } catch { /* 未配置有效店铺时不展示虚构地址。 */ }

    return {
      id: work.id,
      title: work.title,
      description: work.description ?? null,
      designIdea: work.designIdea ?? null,
      suitableScene: work.suitableScene ?? null,
      recommendationScore: work.recommendationScore ?? null,
      tags: work.tags
        ? work.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      coverUrl: toAbsoluteUrl(work.coverUrl) ?? imageUrls[0] ?? null,
      imageUrls,
      serviceSubtotalFen: work.serviceSubtotalFen,
      standardPriceFen: work.standardPriceFen,
      totalDurationMinutes: work.totalDurationMinutes,
      serviceLines: work.serviceLines.map((line) => ({
        serviceId: line.servicePublicIdSnapshot,
        name: line.nameSnapshot,
        unitPriceFen: line.unitPriceFen,
        durationMinutes: line.durationMinutes,
        quantity: line.quantity,
        subtotalFen: line.subtotalFen,
      })),
      likeCount: work._count?.likes ?? 0,
      commentCount: work._count?.comments ?? 0,
      technician: {
        id: work.technician.id,
        name: work.technician.name,
        avatarUrl: toAbsoluteUrl(work.technician.avatarUrl),
        invitationCode: work.technician.invitationCode,
        city: work.technician.city,
        bio: work.technician.bio,
        acceptingBookings: work.technician.status === 'active',
      },
      shops,
      comments: [],
      createdAt: work.createdAt,
    };
  }
}

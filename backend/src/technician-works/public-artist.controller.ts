import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma/prisma.service';
import { bookingReadiness } from '../technicians/booking-readiness';
import { isLaunchTechnician } from '../common/miniprogram-launch-mode';

const UPLOAD_BASE_URL = process.env.UPLOAD_BASE_URL || 'http://localhost:3000';

function toAbsoluteUrl(url: string | null): string | null {
  if (!url) return null;
  return url.startsWith('http') ? url : `${UPLOAD_BASE_URL}${url}`;
}

function parseJsonObject(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function parseJsonArray(value: string | null): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return coverUrl ? [coverUrl] : [];
}

@ApiTags('公开-美甲师名片')
@Controller('public/artist')
export class PublicArtistController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('id/:id')
  @ApiOperation({ summary: '通过 ID 获取美甲师公开经营主页' })
  async getBusinessPage(@Param('id', ParseIntPipe) id: number) {
    return this.getPublicCard({ id });
  }

  @Get('id/:id/shop-guidance')
  @ApiOperation({ summary: '获取无需登录的公开店铺到店指引' })
  async getShopGuidance(
    @Param('id', ParseIntPipe) id: number,
    @Query('shopName') shopName?: string,
    @Query('address') address?: string,
  ) {
    const technician = await this.prisma.technician.findFirst({
      where: { id, status: 'active' },
      select: { id: true, name: true, shopAddresses: true },
    });
    if (!technician || !isLaunchTechnician(technician.id)) {
      throw new NotFoundException('美甲师不存在或未启用');
    }
    const normalizedAddress = String(address || '').replace(/\s+/g, '');
    const shops = parseJsonArray(technician.shopAddresses).filter(
      (item: any) => item && item.enabled !== false && item.guidance?.enabled === true,
    ) as any[];
    const shop = shops.find((item: any) => {
      if (shopName && item.name === shopName) return true;
      const fullAddress = [item.province, item.city, item.district, item.detailAddress]
        .filter(Boolean).join('').replace(/\s+/g, '');
      const detailAddress = String(item.detailAddress || '').replace(/\s+/g, '');
      return normalizedAddress && (
        fullAddress === normalizedAddress ||
        (detailAddress && normalizedAddress.includes(detailAddress)) ||
        fullAddress.includes(normalizedAddress)
      );
    }) || (shops.length === 1 ? shops[0] : null);
    if (!shop) throw new NotFoundException('到店指引不存在或未公开');

    const section = (value: any) => {
      const blocks = Array.isArray(value?.blocks) ? value.blocks.map((block: any) => (
        block?.type === 'image'
          ? { ...block, url: toAbsoluteUrl(block.url) }
          : block
      )).filter(Boolean) : [];
      return {
        blocks,
        text: typeof value?.text === 'string' ? value.text : '',
        images: Array.isArray(value?.images) ? value.images.map((url: string) => toAbsoluteUrl(url)) : [],
      };
    };
    return {
      technicianId: technician.id,
      technicianName: technician.name,
      shop: {
        id: shop.id,
        name: shop.name,
        province: shop.province,
        city: shop.city,
        district: shop.district,
        detailAddress: shop.detailAddress,
        latitude: shop.latitude,
        longitude: shop.longitude,
      },
      guidance: {
        enabled: true,
        metro: section(shop.guidance.metro),
        bus: section(shop.guidance.bus),
        driving: section(shop.guidance.driving),
      },
    };
  }

  @Get(':code')
  @ApiOperation({ summary: '通过邀请码获取美甲师公开名片（含作品）' })
  @ApiParam({ name: 'code', type: String, description: '美甲师邀请码' })
  @ApiResponse({ status: 200, description: '返回名片信息与作品列表' })
  @ApiResponse({ status: 404, description: '美甲师不存在或未启用' })
  async getCard(@Param('code') code: string) {
    return this.getPublicCard({ invitationCode: code });
  }

  private async getPublicCard(where: { id?: number; invitationCode?: string }) {
    const technician = await this.prisma.technician.findFirst({
      where: { ...where, status: 'active' },
    });

    if (!technician) {
      throw new NotFoundException('美甲师不存在或未启用');
    }
    if (!isLaunchTechnician(technician.id)) {
      throw new NotFoundException('美甲师不存在或未启用');
    }

    const rawWorks = await this.prisma.nailWork.findMany({
      where: {
        techId: technician.id,
        isVisible: true,
        visibilityScope: 'public',
        publicationStatus: 'approved',
      },
      orderBy: [
        { isFeatured: 'desc' },
        { isPinned: 'desc' },
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
      take: 30,
    });

    const homepageWorks = rawWorks.some((work) => work.isFeatured)
      ? rawWorks.filter((work) => work.isFeatured)
      : rawWorks;
    const works = homepageWorks.map((work) => {
      const imageUrls = parseImageUrls(work.images, work.coverUrl)
        .map((url) => toAbsoluteUrl(url))
        .filter((url): url is string => Boolean(url));
      return {
        id: work.id,
        title: work.title,
        coverUrl: toAbsoluteUrl(work.coverUrl) ?? imageUrls[0] ?? null,
        imageUrls,
      };
    });
    const readiness = bookingReadiness(technician);

    // Get qualifications
    const qualifications = await this.prisma.technicianQualification.findMany({
      where: { technicianId: technician.id },
      orderBy: [{ sortOrder: 'asc' }, { year: 'desc' }],
    });

    // Get featured comments with review details
    const featuredComments =
      await this.prisma.technicianFeaturedComment.findMany({
        where: { technicianId: technician.id },
        orderBy: { sortOrder: 'asc' },
        take: 5,
      });

    const featuredReviews: Array<{
      id: number;
      content: string | null;
      rating: number;
      client: { id: number; name: string; avatarUrl: string | null };
      createdAt: Date;
    } | null> = [];

    for (const fc of featuredComments) {
      const review = await this.prisma.serviceReview.findUnique({
        where: { id: fc.commentId },
        include: {
          clientUser: {
            select: {
              id: true,
              nickname: true,
              avatarUrl: true,
            },
          },
        },
      });
      if (review) {
        featuredReviews.push({
          id: review.id,
          content: review.content,
          rating: review.rating,
          client: {
            id: review.clientUser.id,
            name: review.clientUser.nickname || '匿名用户',
            avatarUrl: toAbsoluteUrl(review.clientUser.avatarUrl),
          },
          createdAt: review.createdAt,
        });
      }
    }

    // Get like count (from nail works belonging to this technician)
    const workIds = works.map((w) => w.id);
    const likeCount =
      workIds.length > 0
        ? await this.prisma.nailWorkLike.count({
            where: { workId: { in: workIds } },
          })
        : 0;

    // Get favorite count
    const favoriteCount =
      workIds.length > 0
        ? await this.prisma.nailWorkFavorite.count({
            where: { workId: { in: workIds } },
          })
        : 0;

    // Get rating from service reviews
    const reviews = await this.prisma.serviceReview.findMany({
      where: { technicianId: technician.id },
      select: { rating: true },
    });
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : null;
    const followerCount = await this.prisma.technicianFollow.count({
      where: { technicianId: technician.id },
    });

    return {
      artist: {
        id: technician.id,
        name: technician.name,
        avatarUrl: toAbsoluteUrl(technician.avatarUrl),
        coverImageUrl: toAbsoluteUrl(technician.coverImageUrl),
        city: technician.city,
        serviceArea: technician.serviceArea,
        bio: technician.bio,
        servicePhilosophy: technician.servicePhilosophy,
        bookingNotes: technician.bookingNotes,
        styleTags: parseJsonArray(technician.styleTags),
        isVerified: technician.isVerified,
        homeService: false,
        shopService: technician.shopService,
        invitationCode: technician.invitationCode,
        serviceItems: parseJsonArray(technician.serviceItems).filter(
          (item: any) => item && item.isActive !== false,
        ),
        shopAddresses: parseJsonArray(technician.shopAddresses).filter(
          (item: any) => item && item.enabled !== false,
        ),
        serviceSchedule: parseJsonObject(technician.serviceSchedule),
        socialMedia: parseJsonObject(technician.socialMedia),
        followerCount,
        stats: {
          followerCount,
          likeCount,
          favoriteCount,
          workCount: works.length,
          rating: avgRating ? Math.round(avgRating * 10) / 10 : null,
          reviewCount: reviews.length,
        },
        bookingReady: readiness.ready,
        bookingReadinessIssues: readiness.issues,
      },
      works,
      qualifications: qualifications.map((q) => ({
        id: q.id,
        type: q.type,
        title: q.title,
        detail: q.detail,
        organization: q.organization,
        year: q.year,
        month: q.month,
        imageUrl: toAbsoluteUrl(q.imageUrl),
        isVerified: q.isVerified,
      })),
      featuredReviews,
    };
  }
}

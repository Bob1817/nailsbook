import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma/prisma.service';

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

function parseImageUrls(images: string | null, coverUrl: string | null): string[] {
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

  @Get(':code')
  @ApiOperation({ summary: '通过邀请码获取美甲师公开名片（含作品）' })
  @ApiParam({ name: 'code', type: String, description: '美甲师邀请码' })
  @ApiResponse({ status: 200, description: '返回名片信息与作品列表' })
  @ApiResponse({ status: 404, description: '美甲师不存在或未启用' })
  async getCard(@Param('code') code: string) {
    const technician = await this.prisma.technician.findFirst({
      where: { invitationCode: code, status: 'active' },
    });

    if (!technician) {
      throw new NotFoundException('美甲师不存在或未启用');
    }

    const rawWorks = await this.prisma.nailWork.findMany({
      where: { techId: technician.id, isVisible: true },
      orderBy: [{ isPinned: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: 30,
    });

    const works = rawWorks.map((work) => {
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

    return {
      artist: {
        id: technician.id,
        name: technician.name,
        avatarUrl: toAbsoluteUrl(technician.avatarUrl),
        city: technician.city,
        serviceArea: technician.serviceArea,
        homeService: technician.homeService,
        shopService: technician.shopService,
        status: technician.status,
        invitationCode: technician.invitationCode,
        socialMedia: parseJsonObject(technician.socialMedia),
      },
      works,
    };
  }
}

import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma/prisma.service';

const UPLOAD_BASE_URL = process.env.UPLOAD_BASE_URL || 'http://localhost:3000';

function toAbsoluteUrl(url: string | null): string | null {
  if (!url) return null;
  return url.startsWith('http') ? url : `${UPLOAD_BASE_URL}${url}`;
}

function parseImageUrls(images: string | null, coverUrl: string | null): string[] {
  if (!images) return coverUrl ? [coverUrl] : [];
  try {
    const parsed = JSON.parse(images);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
  } catch {
    return images.split(',').map((i) => i.trim()).filter(Boolean);
  }
  return coverUrl ? [coverUrl] : [];
}

@ApiTags('公开-作品')
@Controller('public/works')
export class PublicWorksController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('featured')
  @ApiOperation({ summary: '获取精选作品列表' })
  @ApiResponse({ status: 200, description: '返回精选作品列表' })
  async getFeatured() {
    const works = await this.prisma.nailWork.findMany({
      where: {
        isFeatured: true,
        isVisible: true,
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
      technician: work.technician,
    }));
  }

  @Get(':id')
  @ApiOperation({ summary: '获取作品公开详情（只读）' })
  @ApiParam({ name: 'id', type: Number, description: '作品ID' })
  @ApiResponse({ status: 200, description: '返回作品详情' })
  @ApiResponse({ status: 404, description: '作品不存在' })
  async getDetail(@Param('id', ParseIntPipe) id: number) {
    const work = await this.prisma.nailWork.findFirst({
      where: { id, isVisible: true },
      include: {
        likes: true,
        comments: {
          where: { parentId: null, isHidden: false },
          orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
          include: {
            client: { select: { id: true, nickname: true, avatarUrl: true } },
            technician: { select: { id: true, name: true, avatarUrl: true } },
            replies: {
              orderBy: { createdAt: 'asc' },
              include: {
                client: { select: { id: true, nickname: true, avatarUrl: true } },
                technician: { select: { id: true, name: true, avatarUrl: true } },
              },
            },
          },
        },
        technician: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    if (!work) {
      throw new NotFoundException('作品不存在');
    }

    const imageUrls = parseImageUrls(work.images, work.coverUrl)
      .map((url) => toAbsoluteUrl(url))
      .filter((url): url is string => Boolean(url));

    const mapComment = (c: any): any => {
      const user = c.technician
        ? { id: c.technician.id, name: c.technician.name, avatarUrl: toAbsoluteUrl(c.technician.avatarUrl), role: 'technician' as const }
        : c.client
          ? { id: c.client.id, name: c.client.nickname || '客户', avatarUrl: toAbsoluteUrl(c.client.avatarUrl), role: 'client' as const }
          : { id: 0, name: '已删除用户', avatarUrl: null, role: 'unknown' as const };
      return {
        id: c.id,
        content: c.content,
        isPinned: c.isPinned ?? false,
        user,
        replies: (c.replies || []).map(mapComment),
        createdAt: c.createdAt,
      };
    };

    return {
      id: work.id,
      title: work.title,
      description: work.description ?? null,
      tags: work.tags ? work.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      coverUrl: toAbsoluteUrl(work.coverUrl) ?? imageUrls[0] ?? null,
      imageUrls,
      likeCount: work.likes?.length ?? 0,
      commentCount: work.comments?.length ?? 0,
      technician: {
        id: work.technician.id,
        name: work.technician.name,
        avatarUrl: toAbsoluteUrl(work.technician.avatarUrl),
      },
      comments: (work.comments || []).map(mapComment),
      createdAt: work.createdAt,
    };
  }
}

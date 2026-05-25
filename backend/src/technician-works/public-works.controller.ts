import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma/prisma.service';

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
}

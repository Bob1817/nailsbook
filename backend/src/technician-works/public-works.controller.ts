import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Controller('public/works')
export class PublicWorksController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('featured')
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

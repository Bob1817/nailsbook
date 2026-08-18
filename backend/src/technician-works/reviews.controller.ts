import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma/prisma.service';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';

@ApiTags('美甲师-评价管理')
@Controller('technician/reviews')
@UseGuards(TechnicianJwtAuthGuard)
@ApiBearerAuth()
export class ReviewsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: '获取评价列表' })
  async list(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const technicianId = req.user.id;
    const pageNum = parseInt(page || '1');
    const limitNum = parseInt(limit || '20');
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      this.prisma.serviceReview.findMany({
        where: { technicianId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          clientUser: {
            select: {
              id: true,
              nickname: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.serviceReview.count({
        where: { technicianId },
      }),
    ]);

    // Get featured comment IDs
    const featuredComments = await this.prisma.technicianFeaturedComment.findMany({
      where: { technicianId },
      select: { commentId: true },
    });
    const featuredCommentIds = new Set(featuredComments.map((fc) => fc.commentId));

    return {
      reviews: reviews.map((review) => ({
        id: review.id,
        content: review.content,
        rating: review.rating,
        client: {
          id: review.clientUser.id,
          name: review.clientUser.nickname || '匿名用户',
          avatarUrl: review.clientUser.avatarUrl,
        },
        isFeatured: featuredCommentIds.has(review.id),
        createdAt: review.createdAt,
      })),
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  @Get('featured')
  @ApiOperation({ summary: '获取精选评价列表' })
  async getFeatured(@Request() req: any) {
    const technicianId = req.user.id;

    const featuredComments = await this.prisma.technicianFeaturedComment.findMany({
      where: { technicianId },
      orderBy: { sortOrder: 'asc' },
      take: 10,
    });

    const reviews = await Promise.all(
      featuredComments.map(async (fc) => {
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
        if (!review) return null;
        return {
          id: review.id,
          content: review.content,
          rating: review.rating,
          client: {
            id: review.clientUser.id,
            name: review.clientUser.nickname || '匿名用户',
            avatarUrl: review.clientUser.avatarUrl,
          },
          sortOrder: fc.sortOrder,
          createdAt: review.createdAt,
        };
      }),
    );

    return reviews.filter(Boolean);
  }

  @Post(':id/featured')
  @ApiOperation({ summary: '设为精选评价' })
  async setFeatured(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    const technicianId = req.user.id;

    // Verify the review belongs to this technician
    const review = await this.prisma.serviceReview.findFirst({
      where: { id, technicianId },
    });

    if (!review) {
      throw new Error('评价不存在');
    }

    // Check if already featured
    const existing = await this.prisma.technicianFeaturedComment.findFirst({
      where: { technicianId, commentId: id },
    });

    if (existing) {
      return { success: true, message: '已经是精选评价' };
    }

    // Get max sort order
    const maxOrder = await this.prisma.technicianFeaturedComment.findFirst({
      where: { technicianId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    await this.prisma.technicianFeaturedComment.create({
      data: {
        technicianId,
        commentId: id,
        sortOrder: (maxOrder?.sortOrder || 0) + 1,
      },
    });

    return { success: true };
  }

  @Delete(':id/featured')
  @ApiOperation({ summary: '取消精选评价' })
  async removeFeatured(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    const technicianId = req.user.id;

    await this.prisma.technicianFeaturedComment.deleteMany({
      where: { technicianId, commentId: id },
    });

    return { success: true };
  }
}

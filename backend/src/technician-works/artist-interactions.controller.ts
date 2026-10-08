import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TouristGuard } from '../technician-auth/tourist.guard';

function avatarUrl(url: string | null) {
  if (!url) return null;
  return url.startsWith('http')
    ? url
    : `${process.env.UPLOAD_BASE_URL || 'http://localhost:3000'}${url}`;
}

@Controller('technician/artist-interactions')
@UseGuards(TechnicianJwtAuthGuard, TouristGuard)
export class ArtistInteractionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Req() req: { user: { technicianId: number } },
    @Query('type') type = 'follow',
    @Query('page') pageValue = '1',
  ) {
    const page = Number(pageValue);
    if (
      !['follow', 'like', 'favorite', 'comment'].includes(type) ||
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 100000
    ) {
      throw new BadRequestException('无效的记录类型或页码');
    }
    const technicianId = req.user.technicianId;
    const pagination = {
      skip: (page - 1) * 20,
      take: 21,
      orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
    };
    if (type === 'follow') {
      const rows = await this.prisma.technicianFollow.findMany({
        where: { technicianId },
        ...pagination,
        select: {
          id: true,
          createdAt: true,
          clientUser: {
            select: { nickname: true, avatarUrl: true, status: true },
          },
        },
      });
      return {
        hasMore: rows.length > 20,
        list: rows.slice(0, 20).map((row) => ({
          id: row.id,
          createdAt: row.createdAt,
          name:
            row.clientUser.status === 'deleted'
              ? '已注销用户'
              : row.clientUser.nickname || '微信用户',
          avatarUrl:
            row.clientUser.status === 'deleted'
              ? null
              : avatarUrl(row.clientUser.avatarUrl),
        })),
      };
    }
    const query = {
      where: { technicianId },
      ...pagination,
      select: {
        id: true,
        createdAt: true,
        clientUser: {
          select: { nickname: true, avatarUrl: true, status: true },
        },
      },
    };
    const rows =
      type === 'like'
        ? await this.prisma.artistHomepageLike.findMany(query)
        : type === 'favorite'
          ? await this.prisma.artistHomepageFavorite.findMany(query)
          : await this.prisma.artistHomepageComment.findMany({
              where: { technicianId },
              ...pagination,
              select: {
                ...query.select,
                content: true,
                isPinned: true,
                isHidden: true,
              },
            });
    return {
      hasMore: rows.length > 20,
      list: rows.slice(0, 20).map((row) => ({
        id: row.id,
        createdAt: row.createdAt,
        name:
          row.clientUser.status === 'deleted'
            ? '已注销用户'
            : row.clientUser.nickname || '微信用户',
        avatarUrl:
          row.clientUser.status === 'deleted'
            ? null
            : avatarUrl(row.clientUser.avatarUrl),
        content: 'content' in row ? row.content : undefined,
        isPinned: 'isPinned' in row ? row.isPinned : undefined,
        isHidden: 'isHidden' in row ? row.isHidden : undefined,
      })),
    };
  }

  @Patch('comments/:id')
  async manageComment(
    @Req() req: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body('action') action: string,
  ) {
    if (!['pin', 'hide'].includes(action)) {
      throw new BadRequestException('无效的评论操作');
    }
    const comment = await this.prisma.artistHomepageComment.findFirst({
      where: { id, technicianId: req.user.technicianId },
    });
    if (!comment) throw new NotFoundException('评论不存在');
    const data =
      action === 'pin'
        ? { isPinned: !comment.isPinned }
        : { isHidden: !comment.isHidden };
    return this.prisma.artistHomepageComment.update({ where: { id }, data });
  }

  @Delete('comments/:id')
  async deleteComment(
    @Req() req: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const result = await this.prisma.artistHomepageComment.deleteMany({
      where: { id, technicianId: req.user.technicianId },
    });
    if (!result.count) throw new NotFoundException('评论不存在');
    return { deleted: true };
  }
}

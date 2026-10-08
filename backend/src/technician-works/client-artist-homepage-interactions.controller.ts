import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../common/prisma/prisma.service';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { isLaunchTechnician } from '../common/miniprogram-launch-mode';

class CreateArtistHomepageCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content!: string;
}

@Controller('client/artists')
@UseGuards(ClientJwtAuthGuard)
export class ClientArtistHomepageInteractionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id/homepage-interactions')
  async status(
    @Req() req: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) technicianId: number,
  ) {
    await this.assertArtist(technicianId);
    const clientUserId = req.user.clientUserId;
    const [like, favorite, likeCount, favoriteCount, commentCount] =
      await Promise.all([
        this.prisma.artistHomepageLike.findUnique({
          where: { clientUserId_technicianId: { clientUserId, technicianId } },
          select: { id: true },
        }),
        this.prisma.artistHomepageFavorite.findUnique({
          where: { clientUserId_technicianId: { clientUserId, technicianId } },
          select: { id: true },
        }),
        this.prisma.artistHomepageLike.count({ where: { technicianId } }),
        this.prisma.artistHomepageFavorite.count({ where: { technicianId } }),
        this.prisma.artistHomepageComment.count({
          where: { technicianId, isHidden: false },
        }),
      ]);
    return {
      isLiked: Boolean(like),
      isFavorited: Boolean(favorite),
      likeCount,
      favoriteCount,
      commentCount,
    };
  }

  @Post(':id/homepage-like')
  async toggleLike(
    @Req() req: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) technicianId: number,
  ) {
    await this.assertArtist(technicianId);
    const clientUserId = req.user.clientUserId;
    const existing = await this.prisma.artistHomepageLike.findUnique({
      where: { clientUserId_technicianId: { clientUserId, technicianId } },
    });
    if (existing) {
      await this.prisma.artistHomepageLike.delete({
        where: { id: existing.id },
      });
    } else {
      await this.prisma.artistHomepageLike.create({
        data: { clientUserId, technicianId },
      });
    }
    return {
      liked: !existing,
      count: await this.prisma.artistHomepageLike.count({
        where: { technicianId },
      }),
    };
  }

  @Post(':id/homepage-favorite')
  async toggleFavorite(
    @Req() req: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) technicianId: number,
  ) {
    await this.assertArtist(technicianId);
    const clientUserId = req.user.clientUserId;
    const existing = await this.prisma.artistHomepageFavorite.findUnique({
      where: { clientUserId_technicianId: { clientUserId, technicianId } },
    });
    if (existing) {
      await this.prisma.artistHomepageFavorite.delete({
        where: { id: existing.id },
      });
    } else {
      await this.prisma.artistHomepageFavorite.create({
        data: { clientUserId, technicianId },
      });
    }
    return {
      favorited: !existing,
      count: await this.prisma.artistHomepageFavorite.count({
        where: { technicianId },
      }),
    };
  }

  @Post(':id/homepage-comments')
  async comment(
    @Req() req: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) technicianId: number,
    @Body() dto: CreateArtistHomepageCommentDto,
  ) {
    await this.assertArtist(technicianId);
    const content = dto.content.trim();
    if (!content) throw new BadRequestException('评论内容不能为空');
    const comment = await this.prisma.artistHomepageComment.create({
      data: { clientUserId: req.user.clientUserId, technicianId, content },
      select: { id: true, content: true, createdAt: true },
    });
    return { comment };
  }

  private async assertArtist(technicianId: number) {
    if (!isLaunchTechnician(technicianId)) {
      throw new NotFoundException('美甲师主页不存在');
    }
    const artist = await this.prisma.technician.findFirst({
      where: { id: technicianId, status: 'active' },
      select: { id: true },
    });
    if (!artist) throw new NotFoundException('美甲师主页不存在');
  }
}

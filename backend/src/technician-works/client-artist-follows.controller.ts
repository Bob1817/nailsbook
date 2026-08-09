import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';

@Controller('client/artists')
@UseGuards(ClientJwtAuthGuard)
export class ClientArtistFollowsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id/follow')
  async getFollow(
    @Req() req: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) technicianId: number,
  ) {
    const follow = await this.prisma.technicianFollow.findUnique({
      where: {
        clientUserId_technicianId: {
          clientUserId: req.user.clientUserId,
          technicianId,
        },
      },
    });
    return { followed: Boolean(follow) };
  }

  @Post(':id/follow')
  async follow(
    @Req() req: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) technicianId: number,
  ) {
    await this.prisma.technicianFollow.upsert({
      where: {
        clientUserId_technicianId: {
          clientUserId: req.user.clientUserId,
          technicianId,
        },
      },
      create: { clientUserId: req.user.clientUserId, technicianId },
      update: {},
    });
    return { followed: true };
  }

  @Delete(':id/follow')
  async unfollow(
    @Req() req: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) technicianId: number,
  ) {
    await this.prisma.technicianFollow.deleteMany({
      where: { clientUserId: req.user.clientUserId, technicianId },
    });
    return { followed: false };
  }
}

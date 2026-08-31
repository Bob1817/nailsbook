import { Controller, NotFoundException, Post, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TouristGuard } from '../technician-auth/tourist.guard';
import { WorkShareCodeService } from './work-share-code.service';

@Controller('technician/invitation')
@UseGuards(TechnicianJwtAuthGuard, TouristGuard)
export class ArtistInvitationController {
  constructor(private readonly prisma: PrismaService, private readonly share: WorkShareCodeService) {}

  @Post('link')
  async link(@Req() req: { user: { technicianId: number } }) {
    const artist = await this.prisma.technician.findUnique({ where: { id: req.user.technicianId }, select: { invitationCode: true, status: true } });
    if (!artist?.invitationCode || artist.status !== 'active') throw new NotFoundException('当前美甲师暂不可邀请注册');
    return this.share.generateInviteLink(artist.invitationCode);
  }
}

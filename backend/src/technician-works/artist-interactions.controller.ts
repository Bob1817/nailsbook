import { BadRequestException, Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TouristGuard } from '../technician-auth/tourist.guard';

function avatarUrl(url: string | null) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${process.env.UPLOAD_BASE_URL || 'http://localhost:3000'}${url}`;
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
    if (!['follow', 'like', 'favorite'].includes(type) || !Number.isSafeInteger(page) || page < 1 || page > 100000) {
      throw new BadRequestException('无效的记录类型或页码');
    }
    const technicianId = req.user.technicianId;
    const pagination = { skip: (page - 1) * 20, take: 21, orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }] };
    if (type === 'follow') {
      const rows = await this.prisma.technicianFollow.findMany({
        where: { technicianId }, ...pagination,
        select: { id: true, createdAt: true, clientUser: { select: { nickname: true, avatarUrl: true, status: true } } },
      });
      return { hasMore: rows.length > 20, list: rows.slice(0, 20).map(row => ({
        id: row.id, createdAt: row.createdAt,
        name: row.clientUser.status === 'deleted' ? '已注销用户' : row.clientUser.nickname || '微信用户',
        avatarUrl: row.clientUser.status === 'deleted' ? null : avatarUrl(row.clientUser.avatarUrl),
      })) };
    }
    const query = {
      where: { work: { techId: technicianId } }, ...pagination,
      select: { id: true, createdAt: true, clientId: true, technicianId: true, work: { select: { id: true, title: true } } },
    };
    const rows = type === 'like'
      ? await this.prisma.nailWorkLike.findMany(query)
      : await this.prisma.nailWorkFavorite.findMany(query);
    const visible = rows.slice(0, 20);
    const [clients, artists] = await Promise.all([
      this.prisma.clientUser.findMany({ where: { id: { in: visible.flatMap(r => r.clientId ? [r.clientId] : []) } }, select: { id: true, nickname: true, avatarUrl: true, status: true } }),
      this.prisma.technician.findMany({ where: { id: { in: visible.flatMap(r => r.technicianId ? [r.technicianId] : []) } }, select: { id: true, name: true, avatarUrl: true, status: true } }),
    ]);
    return { hasMore: rows.length > 20, list: visible.map(row => {
      const client = clients.find(c => c.id === row.clientId);
      const artist = artists.find(a => a.id === row.technicianId);
      const person = row.clientId ? client : artist;
      const deleted = !person || person.status === 'deleted';
      return { id: row.id, createdAt: row.createdAt, workId: row.work.id, workTitle: row.work.title,
        name: deleted ? '已注销用户' : (client?.nickname || artist?.name || '微信用户'),
        avatarUrl: deleted ? null : avatarUrl(person.avatarUrl) };
    }) };
  }
}

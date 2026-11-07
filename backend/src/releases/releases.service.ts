import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { SaveReleaseDto } from './releases.dto';

export function compareVersions(a: string, b: string) {
  const left = a.split('.').map(Number), right = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] - right[i];
  return 0;
}
@Injectable()
export class ReleasesService {
  constructor(private readonly prisma: PrismaService) {}
  list() { return this.prisma.releaseNotice.findMany({ orderBy: { createdAt:'desc' }, take:100 }); }
  async publicList(role: string, version?: string) {
    const rows = await this.prisma.releaseNotice.findMany({
      where:{ audience:{ in:['all', role] }, publishedAt:{ lte:new Date() } },
      orderBy:{ publishedAt:'desc' }, take:100,
      select:{ id:true,version:true,audience:true,title:true,content:true,important:true,publishedAt:true },
    });
    return rows.filter(row => !version || compareVersions(row.version, version) <= 0)
      .sort((a,b) => compareVersions(b.version,a.version));
  }
  async save(dto: SaveReleaseDto, id?: number) {
    if (id && !await this.prisma.releaseNotice.findUnique({where:{id}})) throw new NotFoundException('更新说明不存在');
    const now = new Date();
    const scheduled = dto.scheduledFor ? new Date(dto.scheduledFor) : null;
    if (scheduled && (!dto.published || scheduled <= now)) {
      throw new BadRequestException('定时发布需启用发布，并选择未来的发布时间');
    }
    const data = { version:dto.version, audience:dto.audience, title:dto.title.trim(), content:dto.content.trim(),
      important:dto.important ?? true, ...(dto.published === undefined ? {} : {publishedAt:dto.published ? (scheduled || now) : null}) };
    try {
      return id ? await this.prisma.releaseNotice.update({where:{id},data}) : await this.prisma.releaseNotice.create({data});
    } catch(error) {
      if (error.code === 'P2002') throw new ConflictException('该版本和用户类型已存在更新说明');
      throw error;
    }
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateArtistApplicationDto } from './dto/create-artist-application.dto';

@Injectable()
export class ArtistApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateArtistApplicationDto) {
    return this.prisma.artistApplication.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        city: dto.city,
        serviceMode: dto.serviceMode ?? null,
        experience: dto.experience ?? null,
        specialty: dto.specialty ?? null,
        note: dto.note ?? null,
      },
    });
  }

  async findAll(page = 1, limit = 20, status?: string) {
    const where = status ? { status } : {};
    const [data, total] = await Promise.all([
      this.prisma.artistApplication.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.artistApplication.count({ where }),
    ]);
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    return this.prisma.artistApplication.findUnique({ where: { id } });
  }

  async approve(id: number, reviewedBy: number) {
    return this.prisma.artistApplication.update({
      where: { id },
      data: { status: 'approved', reviewedBy, reviewedAt: new Date() },
    });
  }

  async reject(id: number, reviewedBy: number) {
    return this.prisma.artistApplication.update({
      where: { id },
      data: { status: 'rejected', reviewedBy, reviewedAt: new Date() },
    });
  }
}

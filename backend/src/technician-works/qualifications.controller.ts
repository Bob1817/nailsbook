import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma/prisma.service';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';

const UPLOAD_BASE_URL = process.env.UPLOAD_BASE_URL || 'http://localhost:3000';

function toAbsoluteUrl(url: string | null): string | null {
  if (!url) return null;
  return url.startsWith('http') ? url : `${UPLOAD_BASE_URL}${url}`;
}

@ApiTags('美甲师-资质管理')
@Controller('technician/qualifications')
@UseGuards(TechnicianJwtAuthGuard)
@ApiBearerAuth()
export class QualificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: '获取资质列表' })
  async list(@Request() req: any) {
    const technicianId = req.user.id;
    const qualifications = await this.prisma.technicianQualification.findMany({
      where: { technicianId },
      orderBy: [{ sortOrder: 'asc' }, { year: 'desc' }],
    });

    return qualifications.map((q) => ({
      id: q.id,
      type: q.type,
      title: q.title,
      detail: q.detail,
      organization: q.organization,
      year: q.year,
      month: q.month,
      imageUrl: toAbsoluteUrl(q.imageUrl),
      isVerified: q.isVerified,
      sortOrder: q.sortOrder,
    }));
  }

  @Post()
  @ApiOperation({ summary: '添加资质' })
  async create(@Request() req: any, @Body() body: {
    type: string;
    title: string;
    detail: string;
    organization?: string;
    year: number;
    month?: number;
    imageUrl?: string;
    sortOrder?: number;
  }) {
    const technicianId = req.user.id;

    const qualification = await this.prisma.technicianQualification.create({
      data: {
        technicianId,
        type: body.type,
        title: body.title,
        detail: body.detail,
        organization: body.organization,
        year: body.year,
        month: body.month,
        imageUrl: body.imageUrl,
        sortOrder: body.sortOrder || 0,
      },
    });

    return {
      id: qualification.id,
      type: qualification.type,
      title: qualification.title,
      detail: qualification.detail,
      organization: qualification.organization,
      year: qualification.year,
      month: qualification.month,
      imageUrl: toAbsoluteUrl(qualification.imageUrl),
      isVerified: qualification.isVerified,
      sortOrder: qualification.sortOrder,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: '更新资质' })
  async update(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      type?: string;
      title?: string;
      detail?: string;
      organization?: string;
      year?: number;
      month?: number;
      imageUrl?: string;
      sortOrder?: number;
    },
  ) {
    const technicianId = req.user.id;

    // Verify ownership
    const existing = await this.prisma.technicianQualification.findFirst({
      where: { id, technicianId },
    });

    if (!existing) {
      throw new Error('资质不存在');
    }

    const qualification = await this.prisma.technicianQualification.update({
      where: { id },
      data: {
        type: body.type,
        title: body.title,
        detail: body.detail,
        organization: body.organization,
        year: body.year,
        month: body.month,
        imageUrl: body.imageUrl,
        sortOrder: body.sortOrder,
      },
    });

    return {
      id: qualification.id,
      type: qualification.type,
      title: qualification.title,
      detail: qualification.detail,
      organization: qualification.organization,
      year: qualification.year,
      month: qualification.month,
      imageUrl: toAbsoluteUrl(qualification.imageUrl),
      isVerified: qualification.isVerified,
      sortOrder: qualification.sortOrder,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除资质' })
  async delete(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    const technicianId = req.user.id;

    // Verify ownership
    const existing = await this.prisma.technicianQualification.findFirst({
      where: { id, technicianId },
    });

    if (!existing) {
      throw new Error('资质不存在');
    }

    await this.prisma.technicianQualification.delete({
      where: { id },
    });

    return { success: true };
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateBrandProfileDto } from './dto/update-brand-profile.dto';

const clean = (value?: string) => value?.trim() || null;

@Injectable()
export class BrandProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getForOwner(technicianId: number) {
    const technician = await this.prisma.technician.findUnique({
      where: { id: technicianId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        city: true,
        serviceArea: true,
        bio: true,
      },
    });
    if (!technician) throw new NotFoundException('美甲师不存在');

    const profile = await this.prisma.brandProfile.findUnique({
      where: { technicianId },
      include: {
        environmentPhotos: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
        faqs: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
      },
    });
    return profile
      ? {
          ...profile,
          specialties: this.parseArray(profile.specialties),
          featuredReviewIds: this.parseArray(profile.featuredReviewIds),
        }
      : {
          technicianId,
          brandName: technician.name,
          tagline: null,
          heroImageUrl: null,
          experienceYears: null,
          specialties: [],
          certificationTitle: null,
          featuredReviewIds: [],
          city: technician.city,
          publicServiceArea: technician.serviceArea,
          artistIntroduction: technician.bio,
          aestheticPhilosophy: null,
          transportationNotes: null,
          hygieneStandards: null,
          materialStandards: null,
          allergyNotice: null,
          latePolicy: null,
          cancellationPolicy: null,
          aftercarePolicy: null,
          shareTitle: null,
          shareDescription: null,
          shareCoverUrl: null,
          publicationStatus: 'draft',
          environmentPhotos: [],
          faqs: [],
        };
  }

  async update(technicianId: number, dto: UpdateBrandProfileDto) {
    const technician = await this.prisma.technician.findUnique({
      where: { id: technicianId },
      select: { id: true, avatarUrl: true },
    });
    if (!technician) throw new NotFoundException('美甲师不存在');
    if (dto.publicationStatus === 'published') {
      const required = [
        [dto.brandName, '品牌名称'],
        [technician.avatarUrl, '品牌头像'],
        [dto.tagline, '一句话定位'],
        [dto.city, '城市'],
        [dto.publicServiceArea, '公开服务区域'],
        [dto.artistIntroduction, '美甲师介绍'],
        [dto.hygieneStandards, '卫生与消毒说明'],
        [dto.cancellationPolicy, '取消规则'],
        [dto.shareTitle, '分享标题'],
        [dto.shareCoverUrl, '分享封面'],
      ];
      const missing = required
        .filter(([value]) => !String(value || '').trim())
        .map(([, label]) => label);
      if (!dto.environmentPhotos?.length) missing.push('环境照片');
      const activeServices = await this.prisma.service.count({
        where: { technicianId, archivedAt: null, isBookable: true },
      });
      if (!activeServices) missing.push('可预约服务与价格');
      if (missing.length)
        throw new BadRequestException(`发布前请完善：${missing.join('、')}`);
    }

    await this.prisma.$transaction(async (tx) => {
      const data = {
        brandName: dto.brandName.trim(),
        tagline: clean(dto.tagline),
        heroImageUrl: clean(dto.heroImageUrl),
        experienceYears: dto.experienceYears ?? null,
        specialties: dto.specialties?.length
          ? JSON.stringify(dto.specialties)
          : null,
        certificationTitle: clean(dto.certificationTitle),
        featuredReviewIds: dto.featuredReviewIds?.length
          ? JSON.stringify(dto.featuredReviewIds)
          : null,
        city: clean(dto.city),
        publicServiceArea: clean(dto.publicServiceArea),
        artistIntroduction: clean(dto.artistIntroduction),
        aestheticPhilosophy: clean(dto.aestheticPhilosophy),
        transportationNotes: clean(dto.transportationNotes),
        hygieneStandards: clean(dto.hygieneStandards),
        materialStandards: clean(dto.materialStandards),
        allergyNotice: clean(dto.allergyNotice),
        latePolicy: clean(dto.latePolicy),
        cancellationPolicy: clean(dto.cancellationPolicy),
        aftercarePolicy: clean(dto.aftercarePolicy),
        shareTitle: clean(dto.shareTitle),
        shareDescription: clean(dto.shareDescription),
        shareCoverUrl: clean(dto.shareCoverUrl),
        publicationStatus: dto.publicationStatus,
        publishedAt: dto.publicationStatus === 'published' ? new Date() : null,
      };
      const profile = await tx.brandProfile.upsert({
        where: { technicianId },
        create: { technicianId, ...data },
        update: data,
      });
      await tx.brandEnvironmentPhoto.deleteMany({
        where: { brandProfileId: profile.id },
      });
      await tx.brandFaq.deleteMany({ where: { brandProfileId: profile.id } });
      if (dto.environmentPhotos?.length) {
        await tx.brandEnvironmentPhoto.createMany({
          data: dto.environmentPhotos.map((item, index) => ({
            brandProfileId: profile.id,
            imageUrl: item.imageUrl.trim(),
            caption: clean(item.caption),
            sortOrder: item.sortOrder ?? index,
          })),
        });
      }
      if (dto.faqs?.length) {
        await tx.brandFaq.createMany({
          data: dto.faqs.map((item, index) => ({
            brandProfileId: profile.id,
            question: item.question.trim(),
            answer: item.answer.trim(),
            sortOrder: item.sortOrder ?? index,
            isActive: item.isActive ?? true,
          })),
        });
      }
    });
    return this.getForOwner(technicianId);
  }

  async getPublic(technicianId: number) {
    const profile = await this.prisma.brandProfile.findFirst({
      where: {
        technicianId,
        publicationStatus: 'published',
        technician: { status: 'active' },
      },
      include: {
        technician: {
          select: {
            id: true,
            avatarUrl: true,
            homeService: true,
            shopService: true,
          },
        },
        environmentPhotos: {
          select: { imageUrl: true, caption: true, sortOrder: true },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
        faqs: {
          where: { isActive: true },
          select: { question: true, answer: true, sortOrder: true },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (!profile) throw new NotFoundException('品牌主页不存在或未发布');

    // Explicit whitelist: never spread the database object into a public response.
    return {
      technicianId: profile.technician.id,
      brandName: profile.brandName,
      avatarUrl: profile.technician.avatarUrl,
      tagline: profile.tagline,
      heroImageUrl: profile.heroImageUrl,
      experienceYears: profile.experienceYears,
      specialties: this.parseArray(profile.specialties),
      certificationTitle: profile.certificationTitle,
      featuredReviewIds: this.parseArray(profile.featuredReviewIds),
      city: profile.city,
      publicServiceArea: profile.publicServiceArea,
      artistIntroduction: profile.artistIntroduction,
      aestheticPhilosophy: profile.aestheticPhilosophy,
      transportationNotes: profile.transportationNotes,
      hygieneStandards: profile.hygieneStandards,
      materialStandards: profile.materialStandards,
      allergyNotice: profile.allergyNotice,
      latePolicy: profile.latePolicy,
      cancellationPolicy: profile.cancellationPolicy,
      aftercarePolicy: profile.aftercarePolicy,
      shareTitle: profile.shareTitle,
      shareDescription: profile.shareDescription,
      shareCoverUrl: profile.shareCoverUrl,
      serviceModes: {
        home: profile.technician.homeService,
        appointmentLocation: profile.technician.shopService,
      },
      environmentPhotos: profile.environmentPhotos.map((item) => ({
        imageUrl: item.imageUrl,
        caption: item.caption,
        sortOrder: item.sortOrder,
      })),
      faqs: profile.faqs.map((item) => ({
        question: item.question,
        answer: item.answer,
        sortOrder: item.sortOrder,
      })),
    };
  }

  private parseArray(value: string | null) {
    if (!value) return [];
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
}

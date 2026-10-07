import {
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
          featuredServiceIds:
            profile.featuredServiceIds === null
              ? null
              : this.parseArray(profile.featuredServiceIds),
          timeline: this.parseArray(profile.timeline),
          serviceProcess: this.parseArray(profile.serviceProcess),
          featuredShopKey: profile.featuredShopKey,
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
          featuredServiceIds: null,
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
          timeline: [],
          exclusiveServiceNote: null,
          privacyNote: null,
          serviceProcess: [],
          featuredShopKey: null,
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
      select: { id: true, name: true },
    });
    if (!technician) throw new NotFoundException('美甲师不存在');

    await this.prisma.$transaction(async (tx) => {
      const data = {
        brandName: clean(dto.brandName) || technician.name || '美甲师',
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
        featuredServiceIds:
          dto.featuredServiceIds === undefined
            ? undefined
            : JSON.stringify(dto.featuredServiceIds),
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
        timeline: dto.timeline?.length ? JSON.stringify(dto.timeline) : null,
        exclusiveServiceNote: clean(dto.exclusiveServiceNote),
        privacyNote: clean(dto.privacyNote),
        serviceProcess: dto.serviceProcess?.length
          ? JSON.stringify(dto.serviceProcess)
          : null,
        featuredShopKey: clean(dto.featuredShopKey),
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
            sceneTag: clean(item.sceneTag),
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
          select: {
            imageUrl: true,
            caption: true,
            sceneTag: true,
            sortOrder: true,
          },
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
      featuredServiceIds:
        profile.featuredServiceIds === null
          ? null
          : this.parseArray(profile.featuredServiceIds),
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
      timeline: this.parseArray(profile.timeline),
      exclusiveServiceNote: profile.exclusiveServiceNote,
      privacyNote: profile.privacyNote,
      serviceProcess: this.parseArray(profile.serviceProcess),
      featuredShopKey: profile.featuredShopKey,
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
        sceneTag: item.sceneTag,
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

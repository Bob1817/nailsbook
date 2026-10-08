import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { bookingReadiness } from '../technicians/booking-readiness';
import {
  isLaunchTechnician,
  isMiniProgramLaunchMode,
} from '../common/miniprogram-launch-mode';

const UPLOAD_BASE_URL = process.env.UPLOAD_BASE_URL || 'http://localhost:3000';
type ImageSize = 'thumbnail' | 'medium' | 'original';
const DEFAULT_RULES = {
  hygiene:
    '每位顾客服务前后都会清洁操作台面；可重复使用的工具按流程完成清洁与消毒，直接接触皮肤的一次性耗材原则上单客使用。',
  materials:
    '使用正规渠道采购的美甲产品与耗材。服务开始前会沟通所用产品和操作步骤，如有特殊需求可提前说明。',
  allergyNotice:
    '如有皮肤敏感、过敏史、甲面损伤或其他需要注意的情况，请在预约前主动告知；服务过程中如有不适，请立即提出并暂停操作。',
  late: '如可能迟到，请尽早联系说明。迟到 15 分钟以内将根据当天排期尽量保留服务；超过 15 分钟可能需要缩短项目、调整款式或另行改期。',
  cancellation:
    '如需取消或改期，请尽量提前 24 小时联系。临时变更将根据当天排期协商处理，已产生的定制材料或其他实际费用另行沟通。',
  aftercare:
    '服务完成后请按护理建议使用双手并避免长时间接触刺激性物质。如在约定保障期内出现非人为开裂或脱落，请及时联系并提供照片，确认情况后安排补修。',
};

@Injectable()
export class PublicBrandService {
  private readonly cache = new Map<
    string,
    { expiresAt: number; value: unknown }
  >();

  constructor(private readonly prisma: PrismaService) {}

  async profile(id: number, query: Record<string, string | undefined>) {
    return this.cached(
      `profile:${id}:${this.paramsKey(query)}`,
      60_000,
      async () => {
        const technician = await this.prisma.technician.findFirst({
          where: { id, status: 'active' },
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            city: true,
            serviceArea: true,
            homeService: true,
            shopService: true,
            serviceItems: true,
            serviceSchedule: true,
            brandProfile: {
              select: {
                brandName: true,
                tagline: true,
                heroImageUrl: true,
                experienceYears: true,
                specialties: true,
                certificationTitle: true,
                featuredReviewIds: true,
                featuredServiceIds: true,
                city: true,
                publicServiceArea: true,
                artistIntroduction: true,
                aestheticPhilosophy: true,
                transportationNotes: true,
                hygieneStandards: true,
                materialStandards: true,
                allergyNotice: true,
                latePolicy: true,
                cancellationPolicy: true,
                aftercarePolicy: true,
                timeline: true,
                exclusiveServiceNote: true,
                privacyNote: true,
                serviceProcess: true,
                featuredShopKey: true,
                shareTitle: true,
                shareDescription: true,
                shareCoverUrl: true,
                publicationStatus: true,
                environmentPhotos: {
                  select: { imageUrl: true, caption: true, sceneTag: true },
                  orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                },
                faqs: {
                  where: { isActive: true },
                  select: { question: true, answer: true },
                  orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                },
              },
            },
            _count: {
              select: {
                homepageLikes: true,
                homepageFavorites: true,
                homepageComments: { where: { isHidden: false } },
              },
            },
          },
        });
        if (!technician)
          throw new NotFoundException('公开品牌主页不存在或已下架');
        if (!isLaunchTechnician(technician.id)) {
          throw new NotFoundException('公开品牌主页不存在或已下架');
        }
        const brand =
          technician.brandProfile?.publicationStatus === 'published'
            ? technician.brandProfile
            : null;
        const hasSavedRules =
          !!brand &&
          [
            brand.hygieneStandards,
            brand.materialStandards,
            brand.allergyNotice,
            brand.latePolicy,
            brand.cancellationPolicy,
            brand.aftercarePolicy,
          ].some((value) => !!value?.trim());
        const size = this.imageSize(query.imageSize);
        return {
          brand: {
            id: technician.id,
            name: brand?.brandName || technician.name,
            avatarUrl: this.image(technician.avatarUrl, size),
            tagline: brand?.tagline || null,
            heroImageUrl: this.image(
              brand?.heroImageUrl || brand?.shareCoverUrl || null,
              size,
            ),
            experienceYears: brand?.experienceYears || null,
            specialties: this.listJson(brand?.specialties || null),
            certificationTitle: brand?.certificationTitle || null,
            featuredReviewIds: this.listJson(brand?.featuredReviewIds || null)
              .map(Number)
              .filter(Boolean),
            featuredServiceIds:
              brand?.featuredServiceIds == null
                ? null
                : this.listJson(brand.featuredServiceIds),
            city: brand?.city || null,
            serviceArea: brand?.publicServiceArea || null,
            introduction: brand?.artistIntroduction || null,
            aestheticPhilosophy: brand?.aestheticPhilosophy || null,
            transportationNotes: brand?.transportationNotes || null,
            standards: brand
              ? {
                  hygiene:
                    brand.hygieneStandards ||
                    (!hasSavedRules ? DEFAULT_RULES.hygiene : null),
                  materials:
                    brand.materialStandards ||
                    (!hasSavedRules ? DEFAULT_RULES.materials : null),
                  allergyNotice:
                    brand.allergyNotice ||
                    (!hasSavedRules ? DEFAULT_RULES.allergyNotice : null),
                }
              : null,
            policies: brand
              ? {
                  late:
                    brand.latePolicy ||
                    (!hasSavedRules ? DEFAULT_RULES.late : null),
                  cancellation:
                    brand.cancellationPolicy ||
                    (!hasSavedRules ? DEFAULT_RULES.cancellation : null),
                  aftercare:
                    brand.aftercarePolicy ||
                    (!hasSavedRules ? DEFAULT_RULES.aftercare : null),
                }
              : null,
            timeline: this.objectList(brand?.timeline || null),
            exclusiveServiceNote: brand?.exclusiveServiceNote || null,
            privacyNote: brand?.privacyNote || null,
            serviceProcess: this.objectList(brand?.serviceProcess || null),
            featuredShopKey: brand?.featuredShopKey || null,
            environmentPhotos: (brand?.environmentPhotos || []).map((item) => ({
              ...item,
              imageUrl: this.image(item.imageUrl, size),
            })),
            faqs: brand?.faqs || [],
            share: brand
              ? {
                  title: brand.shareTitle,
                  description: brand.shareDescription,
                  coverUrl: this.image(brand.shareCoverUrl, size),
                }
              : null,
            serviceModes: {
              home: isMiniProgramLaunchMode() ? false : technician.homeService,
              studio: technician.shopService,
            },
            bookingReady: bookingReadiness(technician).ready,
            interactionCounts: {
              likes: technician._count.homepageLikes,
              favorites: technician._count.homepageFavorites,
              comments: technician._count.homepageComments,
            },
          },
          attribution: this.attribution(query),
        };
      },
    );
  }

  async services(id: number, query: Record<string, string | undefined>) {
    await this.assertActive(id);
    const { page, pageSize, skip } = this.page(query);
    const profile = await this.prisma.brandProfile.findUnique({
      where: { technicianId: id },
      select: { featuredServiceIds: true },
    });
    let featuredServiceIds = this.listJson(profile?.featuredServiceIds || null);
    const baseWhere = {
      technicianId: id,
      archivedAt: null,
      isBookable: true,
    };
    if (profile?.featuredServiceIds == null) {
      const defaults = await this.prisma.service.findMany({
        where: baseWhere,
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        take: 6,
        select: { publicId: true },
      });
      featuredServiceIds = defaults.map((item) => item.publicId);
    }
    const where = {
      ...baseWhere,
      publicId: { in: featuredServiceIds },
    };
    const [items, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.service.count({ where }),
    ]);
    return {
      items: items.map((item) => ({
        id: item.publicId,
        name: item.name,
        description: item.description,
        category: item.category,
        durationMinutes: item.durationMinutes,
        price: {
          type: item.priceType,
          min: item.priceMinFen == null ? null : item.priceMinFen / 100,
          max: item.priceMaxFen == null ? null : item.priceMaxFen / 100,
        },
      })),
      pagination: this.pagination(page, pageSize, total),
      attribution: this.attribution(query),
    };
  }

  async homepageComments(
    id: number,
    query: Record<string, string | undefined>,
  ) {
    await this.assertActive(id);
    const { page, pageSize, skip } = this.page(query);
    const where = { technicianId: id, isHidden: false };
    const [items, total] = await Promise.all([
      this.prisma.artistHomepageComment.findMany({
        where,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
        select: {
          id: true,
          content: true,
          isPinned: true,
          createdAt: true,
          clientUser: {
            select: { nickname: true, avatarUrl: true, status: true },
          },
        },
      }),
      this.prisma.artistHomepageComment.count({ where }),
    ]);
    return {
      items: items.map((item) => ({
        id: item.id,
        content: item.content,
        isPinned: item.isPinned,
        createdAt: item.createdAt,
        clientName:
          item.clientUser.status === 'deleted'
            ? '已注销用户'
            : item.clientUser.nickname || '微信用户',
        clientAvatarUrl:
          item.clientUser.status === 'deleted'
            ? null
            : this.image(item.clientUser.avatarUrl, 'thumbnail'),
      })),
      total,
      page,
      pageSize,
    };
  }

  async works(id: number, query: Record<string, string | undefined>) {
    await this.assertActive(id);
    const { page, pageSize, skip } = this.page(query);
    const where = {
      techId: id,
      isVisible: true,
      visibilityScope: 'public',
      publicationStatus: 'approved',
      assetStatus: 'public',
      publicAuthorizationStatus: 'authorized',
      archivedAt: null,
    };
    const [items, total] = await Promise.all([
      this.prisma.nailWork.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [
          { isFeatured: 'desc' },
          { publicSortOrder: 'asc' },
          { createdAt: 'desc' },
        ],
        select: {
          id: true,
          title: true,
          coverUrl: true,
          images: true,
          style: true,
          color: true,
          nailShape: true,
          nailLength: true,
          tags: true,
          priceDisplayPolicy: true,
          referencePriceMinFen: true,
          referencePriceMaxFen: true,
          isReproducible: true,
          isFeatured: true,
          createdAt: true,
        },
      }),
      this.prisma.nailWork.count({ where }),
    ]);
    const size = this.imageSize(query.imageSize);
    return {
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        coverUrl: this.image(item.coverUrl, size),
        style: item.style,
        color: item.color,
        nailShape: item.nailShape,
        nailLength: item.nailLength,
        tags: this.list(item.tags),
        referencePrice: this.price(item),
        isReproducible: item.isReproducible,
        isFeatured: item.isFeatured,
        createdAt: item.createdAt,
      })),
      pagination: this.pagination(page, pageSize, total),
      attribution: this.attribution(query),
    };
  }

  async workDetail(
    id: number,
    workId: number,
    query: Record<string, string | undefined>,
  ) {
    await this.assertActive(id);
    const item = await this.prisma.nailWork.findFirst({
      where: {
        id: workId,
        techId: id,
        isVisible: true,
        visibilityScope: 'public',
        publicationStatus: 'approved',
        assetStatus: 'public',
        publicAuthorizationStatus: 'authorized',
        archivedAt: null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        designIdea: true,
        coverUrl: true,
        images: true,
        style: true,
        color: true,
        nailShape: true,
        nailLength: true,
        suitableSkinTones: true,
        scenes: true,
        productionMinutes: true,
        craftHighlights: true,
        tags: true,
        priceDisplayPolicy: true,
        referencePriceMinFen: true,
        referencePriceMaxFen: true,
        isReproducible: true,
        reproductionNotes: true,
        createdAt: true,
        service: { select: { publicId: true, name: true } },
      },
    });
    if (!item) throw new NotFoundException('公开作品不存在或已下架');
    const size = this.imageSize(query.imageSize);
    return {
      work: {
        id: item.id,
        title: item.title,
        description: item.description,
        designIdea: item.designIdea,
        coverUrl: this.image(item.coverUrl, size),
        images: this.images(item.images, item.coverUrl).map((url) =>
          this.image(url, size),
        ),
        style: item.style,
        color: item.color,
        nailShape: item.nailShape,
        nailLength: item.nailLength,
        suitableSkinTones: this.list(item.suitableSkinTones),
        scenes: this.list(item.scenes),
        productionMinutes: item.productionMinutes,
        craftHighlights: item.craftHighlights,
        tags: this.list(item.tags),
        referencePrice: this.price(item),
        isReproducible: item.isReproducible,
        reproductionNotes: item.isReproducible ? item.reproductionNotes : null,
        service: item.service
          ? { id: item.service.publicId, name: item.service.name }
          : null,
        createdAt: item.createdAt,
      },
      attribution: this.attribution(query),
    };
  }

  async reviews(id: number, query: Record<string, string | undefined>) {
    await this.assertActive(id);
    const { page, pageSize, skip } = this.page(query);
    const where = {
      technicianId: id,
      order: { status: 'completed' },
      verificationSource: 'completed_order',
      moderationStatus: 'approved',
      publicationStatus: 'public',
      publicationConsents: {
        some: { contentType: 'review_publication', revokedAt: null },
      },
    };
    const [items, total, aggregate] = await Promise.all([
      this.prisma.serviceReview.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          publicationConsents: {
            where: { contentType: 'review_publication', revokedAt: null },
            take: 1,
          },
        },
      }),
      this.prisma.serviceReview.count({ where }),
      this.prisma.serviceReview.aggregate({ where, _avg: { rating: true } }),
    ]);
    const size = this.imageSize(query.imageSize);
    return {
      summary: {
        count: total,
        averageRating:
          aggregate._avg.rating == null
            ? null
            : Number(aggregate._avg.rating.toFixed(1)),
      },
      items: items.map((item) => ({
        id: item.id,
        rating: item.rating,
        content: item.content || '',
        authorName:
          item.publicationConsents[0]?.displayIdentity === 'nickname'
            ? item.publicationConsents[0].displayName || '客户'
            : '匿名客户',
        photos: item.photoUseAuthorized
          ? this.listJson(item.photos).map((url) => this.image(url, size))
          : [],
        createdAt: item.createdAt,
        technicianReply: item.technicianReply || null,
        repliedAt: item.repliedAt || null,
      })),
      pagination: this.pagination(page, pageSize, total),
      attribution: this.attribution(query),
    };
  }

  async availability(id: number, query: Record<string, string | undefined>) {
    const technician = await this.prisma.technician.findFirst({
      where: { id, status: 'active' },
      select: {
        homeService: true,
        shopService: true,
        serviceItems: true,
        serviceSchedule: true,
        shopAddresses: true,
      },
    });
    if (!technician) throw new NotFoundException('公开品牌主页不存在或已下架');
    return {
      bookingReady: bookingReadiness(technician).ready,
      serviceModes: {
        home: technician.homeService,
        studio: technician.shopService,
      },
      nextAvailableDates: this.availableDates(technician.serviceSchedule),
      timezone: 'Asia/Shanghai',
      attribution: this.attribution(query),
    };
  }

  private async assertActive(id: number) {
    if (!isLaunchTechnician(id)) {
      throw new NotFoundException('公开品牌主页不存在或已下架');
    }
    const exists = await this.prisma.technician.count({
      where: { id, status: 'active' },
    });
    if (!exists) throw new NotFoundException('公开品牌主页不存在或已下架');
  }

  private page(query: Record<string, string | undefined>) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 20));
    return { page, pageSize, skip: (page - 1) * pageSize };
  }
  private pagination(page: number, pageSize: number, total: number) {
    return { page, pageSize, total, hasMore: page * pageSize < total };
  }
  private attribution(query: Record<string, string | undefined>) {
    return {
      source: this.text(query.source),
      campaign: this.text(query.campaign),
      content: this.text(query.content),
    };
  }
  private paramsKey(query: Record<string, string | undefined>) {
    return (
      JSON.stringify(this.attribution(query)) + this.imageSize(query.imageSize)
    );
  }
  private text(value?: string) {
    return value?.trim().slice(0, 100) || null;
  }
  private imageSize(value?: string): ImageSize {
    return value === 'thumbnail' || value === 'original' ? value : 'medium';
  }
  private image(url: string | null, size: ImageSize) {
    if (!url) return null;
    let selected = url;
    if (/-medium\.webp(?:\?|$)/.test(url))
      selected =
        size === 'thumbnail'
          ? url.replace('-medium.webp', '-thumb.webp')
          : size === 'original'
            ? url.replace('-medium.webp', '-high.webp')
            : url;
    return selected.startsWith('http')
      ? selected
      : `${UPLOAD_BASE_URL}${selected}`;
  }
  private images(images: string | null, cover: string | null) {
    const parsed = this.listJson(images);
    return parsed.length ? parsed : cover ? [cover] : [];
  }
  private list(value: string | null) {
    return value
      ? value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  }
  private objectList(value: string | null) {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  private listJson(value: string | null) {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item) => typeof item === 'string')
        : [];
    } catch {
      return this.list(value);
    }
  }
  private price(item: any) {
    if (item.priceDisplayPolicy === 'hidden') return null;
    return {
      policy: item.priceDisplayPolicy || 'exact',
      min:
        item.referencePriceMinFen == null
          ? null
          : item.referencePriceMinFen / 100,
      max:
        item.referencePriceMaxFen == null
          ? null
          : item.referencePriceMaxFen / 100,
    };
  }
  private availableDates(value: string | null) {
    let days: string[] = [];
    try {
      const parsed = value ? JSON.parse(value) : null;
      const scheme = parsed?.schemes?.find(
        (item: any) => item.id === parsed.activeSchemeId,
      );
      days = Array.isArray(scheme?.days) ? scheme.days : [];
    } catch {
      days = [];
    }
    const names = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const result: string[] = [];
    for (let offset = 1; offset <= 21 && result.length < 7; offset += 1) {
      const date = new Date();
      date.setDate(date.getDate() + offset);
      if (days.includes(names[date.getDay()]))
        result.push(
          `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
        );
    }
    return result;
  }
  private async cached<T>(
    key: string,
    ttl: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value as T;
    const value = await loader();
    if (this.cache.size >= 500)
      this.cache.delete(this.cache.keys().next().value as string);
    this.cache.set(key, { expiresAt: Date.now() + ttl, value });
    return value;
  }
}

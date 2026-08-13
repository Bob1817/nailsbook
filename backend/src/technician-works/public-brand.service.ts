import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { bookingReadiness } from '../technicians/booking-readiness';

const UPLOAD_BASE_URL = process.env.UPLOAD_BASE_URL || 'http://localhost:3000';
type ImageSize = 'thumbnail' | 'medium' | 'original';

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
                shareTitle: true,
                shareDescription: true,
                shareCoverUrl: true,
                publicationStatus: true,
                environmentPhotos: {
                  select: { imageUrl: true, caption: true },
                  orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                },
                faqs: {
                  where: { isActive: true },
                  select: { question: true, answer: true },
                  orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                },
              },
            },
          },
        });
        if (!technician)
          throw new NotFoundException('公开品牌主页不存在或已下架');
        const brand =
          technician.brandProfile?.publicationStatus === 'published'
            ? technician.brandProfile
            : null;
        const size = this.imageSize(query.imageSize);
        return {
          brand: {
            id: technician.id,
            name: brand?.brandName || technician.name,
            avatarUrl: this.image(technician.avatarUrl, size),
            tagline: brand?.tagline || null,
            city: brand?.city || technician.city,
            serviceArea: brand?.publicServiceArea || technician.serviceArea,
            introduction: brand?.artistIntroduction || null,
            aestheticPhilosophy: brand?.aestheticPhilosophy || null,
            transportationNotes: brand?.transportationNotes || null,
            standards: brand
              ? {
                  hygiene: brand.hygieneStandards,
                  materials: brand.materialStandards,
                  allergyNotice: brand.allergyNotice,
                }
              : null,
            policies: brand
              ? {
                  late: brand.latePolicy,
                  cancellation: brand.cancellationPolicy,
                  aftercare: brand.aftercarePolicy,
                }
              : null,
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
              home: technician.homeService,
              studio: technician.shopService,
            },
            bookingReady: bookingReadiness(technician).ready,
          },
          attribution: this.attribution(query),
        };
      },
    );
  }

  async services(id: number, query: Record<string, string | undefined>) {
    await this.assertActive(id);
    const { page, pageSize, skip } = this.page(query);
    const where = { technicianId: id, archivedAt: null, isBookable: true };
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

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateWorkDto, UpdateWorkDto } from './dto/create-work.dto';
import { UpdateWorkAccessDto } from './dto/work-access.dto';
import { SaveHeroRecommendationsDto } from './dto/hero-recommendations.dto';
import { SaveWorkPromotionDto } from './dto/work-promotion.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { StorageService } from '../common/storage/storage.service';
import {
  buildServiceSnapshotLines,
  summarizeSnapshotLines,
} from '../orders/booking-pricing';

// Configurable base URL for uploads
const UPLOAD_BASE_URL = process.env.UPLOAD_BASE_URL || 'http://localhost:3000';

@Injectable()
export class TechnicianWorksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
    private readonly storage: StorageService,
  ) {}

  async findAll(technicianId: number) {
    const works = await this.prisma.nailWork.findMany({
      where: { techId: technicianId },
      orderBy: [
        { isPinned: 'desc' },
        { isFeatured: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        likes: true,
        favorites: true,
        comments: true,
        technician: {
          select: { name: true },
        },
        clientAccesses: {
          include: {
            customer: { select: { id: true, name: true, avatarUrl: true } },
            order: {
              select: {
                id: true,
                orderNo: true,
                startTime: true,
                serviceType: true,
              },
            },
          },
        },
        _count: { select: { shareEvents: true } },
        serviceLines: { orderBy: { sortOrder: 'asc' } },
        promotion: true,
      },
    });

    return works.map((work) => this.mapWork(work, technicianId));
  }

  async findOne(technicianId: number, id: number) {
    const work = await this.prisma.nailWork.findFirst({
      where: { id, techId: technicianId },
      include: {
        likes: true,
        favorites: true,
        comments: {
          orderBy: { createdAt: 'desc' },
        },
        clientAccesses: {
          include: {
            customer: { select: { id: true, name: true, avatarUrl: true } },
            order: {
              select: {
                id: true,
                orderNo: true,
                startTime: true,
                serviceType: true,
              },
            },
          },
        },
        _count: { select: { shareEvents: true } },
        serviceLines: { orderBy: { sortOrder: 'asc' } },
        promotion: true,
      },
    });

    if (!work) {
      throw new NotFoundException('作品不存在');
    }

    return this.mapWork(work, technicianId);
  }

  async getHeroRecommendations(technicianId: number) {
    const works = await this.prisma.nailWork.findMany({
      where: { techId: technicianId, heroSlot: { not: null } },
      orderBy: { heroSlot: 'asc' },
      select: { id: true, title: true, coverUrl: true, heroSlot: true },
    });
    return { works: works.map(work => ({ ...work, coverUrl: work.coverUrl?.startsWith('/') ? `${UPLOAD_BASE_URL}${work.coverUrl}` : work.coverUrl })), limit: 3 };
  }

  async saveHeroRecommendations(technicianId: number, dto: SaveHeroRecommendationsDto) {
    if (dto.workIds.length > 3 || new Set(dto.workIds).size !== dto.workIds.length) {
      throw new BadRequestException('客户首页最多推荐 3 个不同作品');
    }
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.nailWork.findMany({
        where: { techId: technicianId, heroSlot: { not: null } },
        orderBy: { heroSlot: 'asc' },
        select: { id: true },
      });
      const ids = current.map((work) => work.id);
      if (JSON.stringify(ids) === JSON.stringify(dto.workIds)) return;
      if (JSON.stringify(ids) !== JSON.stringify(dto.expectedWorkIds)) {
        throw new ConflictException('推荐作品已变更，请刷新后重试');
      }
      const eligible = await tx.nailWork.count({ where: {
        id: { in: dto.workIds }, techId: technicianId, isVisible: true,
        visibilityScope: 'public', publicationStatus: 'approved', archivedAt: null,
        coverUrl: { not: null },
      } });
      if (eligible !== dto.workIds.length) {
        throw new BadRequestException('仅可推荐本人公开可见、审核通过、未归档且有封面的作品');
      }
      await tx.nailWork.updateMany({
        where: { techId: technicianId, heroSlot: { not: null } }, data: { heroSlot: null },
      });
      for (const [index, id] of dto.workIds.entries()) {
        await tx.nailWork.update({ where: { id }, data: { heroSlot: index + 1 } });
      }
    });
    return this.getHeroRecommendations(technicianId);
  }

  async getPromotion(technicianId: number, workId: number) {
    const work = await this.prisma.nailWork.findFirst({
      where: { id: workId, techId: technicianId },
      select: { id: true },
    });
    if (!work) throw new NotFoundException('作品不存在');
    const promotion = await this.prisma.workPromotion.findUnique({ where: { workId } });
    return this.mapPromotion(promotion);
  }

  async savePromotion(technicianId: number, workId: number, dto: SaveWorkPromotionDto) {
    const work = await this.prisma.nailWork.findFirst({
      where: { id: workId, techId: technicianId },
      select: { id: true, standardPriceFen: true },
    });
    if (!work) throw new NotFoundException('作品不存在');
    if (dto.enabled === true && dto.discountAmountFen <= 0) {
      throw new BadRequestException('开启优惠时请填写大于 0 的优惠金额');
    }
    if (dto.discountAmountFen > (work.standardPriceFen || 0)) {
      throw new BadRequestException('优惠金额不能超过作品综合报价');
    }
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if ((startsAt && Number.isNaN(startsAt.getTime())) || (endsAt && Number.isNaN(endsAt.getTime()))) {
      throw new BadRequestException('优惠时间格式无效');
    }
    if (startsAt && endsAt && endsAt <= startsAt) throw new BadRequestException('优惠结束时间必须晚于开始时间');
    const promotion = await this.prisma.workPromotion.upsert({
      where: { workId },
      create: {
        workId,
        technicianId,
        title: dto.title?.trim() || '作品分享优惠',
        discountAmountFen: dto.discountAmountFen,
        enabled: dto.enabled === true,
        startsAt,
        endsAt,
      },
      update: {
        title: dto.title?.trim() || '作品分享优惠',
        discountAmountFen: dto.discountAmountFen,
        enabled: dto.enabled === true,
        startsAt,
        endsAt,
      },
    });
    return this.mapPromotion(promotion);
  }

  async create(technicianId: number, dto: CreateWorkDto) {
    const createRequestId = dto.createRequestId?.trim() || undefined;
    if (createRequestId) {
      const existing = await this.prisma.nailWork.findFirst({
        where: { techId: technicianId, createRequestId },
        select: { id: true },
      });
      if (existing) return this.findOne(technicianId, existing.id);
    }
    await this.subscriptions.assertCanCreateWork(technicianId);
    this.assertImageLimit(dto.images);
    const pricing = await this.resolveWorkPricing(
      technicianId,
      dto.selectedServiceIds,
      dto.standardPrice,
    );
    let work;
    try {
      work = await this.prisma.nailWork.create({
        data: {
          techId: technicianId,
          createRequestId,
          title: dto.title,
          coverUrl: dto.coverUrl ?? null,
          images: dto.images ?? null,
          description: dto.description ?? null,
          designIdea: dto.designIdea ?? null,
          suitableScene: dto.suitableScene ?? null,
          recommendationScore: dto.recommendationScore ?? null,
          tags: dto.tags ?? null,
          price: dto.price ?? null,
          serviceSubtotalFen: pricing.serviceSubtotalFen,
          standardPriceFen: pricing.standardPriceFen,
          totalDurationMinutes: pricing.totalDurationMinutes,
          serviceLines: {
            create: pricing.lines,
          },
          isVisible: dto.isVisible ?? true,
          sortOrder: dto.sortOrder ?? 0,
          publicationStatus: 'pending',
        },
        include: {
          likes: true,
          favorites: true,
          comments: true,
          serviceLines: { orderBy: { sortOrder: 'asc' } },
        },
      });
    } catch (error) {
      // 并发重试可能先命中唯一约束；回读同一美甲师的作品即可恢复原结果。
      if (createRequestId && error && typeof error === 'object' && (error as { code?: string }).code === 'P2002') {
        const existing = await this.prisma.nailWork.findFirst({
          where: { techId: technicianId, createRequestId },
          select: { id: true },
        });
        if (existing) return this.findOne(technicianId, existing.id);
      }
      throw error;
    }

    return this.mapWork(work, technicianId);
  }

  async createDraft(technicianId: number, dto: UpdateWorkDto) {
    this.assertImageLimit(dto.images);
    const work = await this.prisma.nailWork.create({
      data: {
        techId: technicianId,
        title: dto.title?.trim() || null,
        coverUrl: dto.coverUrl ?? null,
        images: dto.images ?? null,
        description: dto.description ?? null,
        designIdea: dto.designIdea ?? null,
        suitableScene: dto.suitableScene ?? null,
        recommendationScore: dto.recommendationScore ?? null,
        tags: dto.tags ?? null,
        price: dto.price ?? null,
        isVisible: dto.isVisible ?? true,
        sortOrder: dto.sortOrder ?? 0,
        publicationStatus: 'draft',
      },
      include: { likes: true, favorites: true, comments: true },
    });
    return this.mapWork(work, technicianId);
  }

  async getAccessOptions(technicianId: number) {
    const customers = await this.prisma.customer.findMany({
      where: { technicianId },
      orderBy: { updatedAt: 'desc' },
      include: {
        orders: {
          where: { technicianId },
          orderBy: { startTime: 'desc' },
          select: {
            id: true,
            orderNo: true,
            startTime: true,
            serviceType: true,
            status: true,
          },
        },
      },
    });
    return customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      avatarUrl: customer.avatarUrl,
      clientUserId: customer.clientUserId,
      canAuthorize: Boolean(customer.clientUserId),
      orders: customer.orders,
    }));
  }

  async updateAccess(
    technicianId: number,
    workId: number,
    dto: UpdateWorkAccessDto,
  ) {
    const work = await this.prisma.nailWork.findFirst({
      where: { id: workId, techId: technicianId },
    });
    if (!work) throw new NotFoundException('作品不存在');

    const customerIds = dto.grants.map((grant) => grant.customerId);
    if (new Set(customerIds).size !== customerIds.length) {
      throw new BadRequestException('同一客户不能重复授权');
    }

    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds }, technicianId },
      select: { id: true, clientUserId: true },
    });
    if (customers.length !== customerIds.length)
      throw new BadRequestException('包含无效客户');
    const customerById = new Map(customers.map((item) => [item.id, item]));

    for (const grant of dto.grants) {
      const customer = customerById.get(grant.customerId)!;
      if (!customer.clientUserId)
        throw new BadRequestException('客户尚未绑定客户端账号，不能授权');
      if (grant.orderId) {
        const order = await this.prisma.order.findFirst({
          where: {
            id: grant.orderId,
            technicianId,
            customerId: grant.customerId,
          },
          select: { id: true },
        });
        if (!order) throw new BadRequestException('关联订单不属于所选客户');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.nailWorkShareGrant.updateMany({
        where: { workId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.nailWorkClientAccess.deleteMany({ where: { workId } });
      for (const grant of dto.grants) {
        const customer = customerById.get(grant.customerId)!;
        await tx.nailWorkClientAccess.create({
          data: {
            workId,
            customerId: grant.customerId,
            clientUserId: customer.clientUserId,
            orderId: grant.orderId,
            canView: grant.canView,
            canShare: grant.canShare,
            canFavorite: grant.canFavorite,
            canLike: grant.canLike,
            canComment: grant.canComment,
          },
        });
      }
      await tx.nailWork.update({
        where: { id: workId },
        data: { visibilityScope: dto.visibilityScope },
      });
    });

    return this.findOne(technicianId, workId);
  }

  async update(technicianId: number, id: number, dto: UpdateWorkDto) {
    this.assertImageLimit(dto.images);
    const existing = await this.prisma.nailWork.findFirst({
      where: { id, techId: technicianId },
    });

    if (!existing) {
      throw new NotFoundException('作品不存在');
    }

    if (existing.publicationStatus === 'draft') {
      await this.subscriptions.assertCanCreateWork(technicianId);
    }

    const pricing =
      dto.selectedServiceIds !== undefined || dto.standardPrice !== undefined
        ? await this.resolveWorkPricing(
            technicianId,
            dto.selectedServiceIds ?? [],
            dto.standardPrice,
          )
        : null;
    const work = await this.prisma.$transaction(async (tx) => {
      if (pricing) {
        await tx.nailWorkServiceLine.deleteMany({ where: { workId: id } });
      }
      return tx.nailWork.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.coverUrl !== undefined && { coverUrl: dto.coverUrl }),
          ...(dto.images !== undefined && { images: dto.images }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(dto.designIdea !== undefined && { designIdea: dto.designIdea }),
          ...(dto.suitableScene !== undefined && {
            suitableScene: dto.suitableScene,
          }),
          ...(dto.recommendationScore !== undefined && {
            recommendationScore: dto.recommendationScore,
          }),
          ...(dto.tags !== undefined && { tags: dto.tags }),
          ...(dto.price !== undefined && { price: dto.price }),
          ...(pricing && {
            serviceSubtotalFen: pricing.serviceSubtotalFen,
            standardPriceFen: pricing.standardPriceFen,
            totalDurationMinutes: pricing.totalDurationMinutes,
            serviceLines: { create: pricing.lines },
          }),
          ...(dto.isVisible !== undefined && { isVisible: dto.isVisible }),
          ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
          publicationStatus: 'pending',
          reviewNote: null,
          reviewedAt: null,
          reviewedBy: null,
          publishedAt: null,
          isHomepageFeatured: false,
        },
        include: {
          likes: true,
          favorites: true,
          comments: true,
          serviceLines: { orderBy: { sortOrder: 'asc' } },
        },
      });
    });

    return this.mapWork(work, technicianId);
  }

  async saveDraft(technicianId: number, id: number, dto: UpdateWorkDto) {
    this.assertImageLimit(dto.images);
    const existing = await this.prisma.nailWork.findFirst({
      where: { id, techId: technicianId },
    });
    if (!existing) throw new NotFoundException('作品不存在');

    const work = await this.prisma.nailWork.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() || null }),
        ...(dto.coverUrl !== undefined && { coverUrl: dto.coverUrl || null }),
        ...(dto.images !== undefined && { images: dto.images }),
        ...(dto.description !== undefined && {
          description: dto.description || null,
        }),
        ...(dto.designIdea !== undefined && {
          designIdea: dto.designIdea || null,
        }),
        ...(dto.suitableScene !== undefined && {
          suitableScene: dto.suitableScene || null,
        }),
        ...(dto.recommendationScore !== undefined && {
          recommendationScore: dto.recommendationScore,
        }),
        ...(dto.tags !== undefined && { tags: dto.tags || null }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.isVisible !== undefined && { isVisible: dto.isVisible }),
        publicationStatus: 'draft',
        reviewNote: null,
        reviewedAt: null,
        reviewedBy: null,
        publishedAt: null,
        isHomepageFeatured: false,
      },
      include: { likes: true, favorites: true, comments: true },
    });
    return this.mapWork(work, technicianId);
  }

  async publish(technicianId: number, id: number) {
    const existing = await this.prisma.nailWork.findFirst({
      where: { id, techId: technicianId },
      include: { clientAccesses: true },
    });
    if (!existing) throw new NotFoundException('作品不存在');
    if (!existing.title?.trim())
      throw new BadRequestException('请输入作品标题');
    if (!existing.coverUrl?.trim())
      throw new BadRequestException('请上传封面图片');
    if (
      existing.visibilityScope === 'authorized_clients' &&
      existing.clientAccesses.length === 0
    ) {
      throw new BadRequestException('客户专属作品至少需要授权一位客户');
    }
    if (existing.publicationStatus !== 'draft') {
      throw new BadRequestException('当前作品状态不能重复发布');
    }
    await this.subscriptions.assertCanCreateWork(technicianId);
    const work = await this.prisma.nailWork.update({
      where: { id },
      data: {
        publicationStatus: 'pending',
        reviewNote: null,
        reviewedAt: null,
        reviewedBy: null,
        publishedAt: null,
      },
      include: { likes: true, favorites: true, comments: true },
    });
    return this.mapWork(work, technicianId);
  }

  async createFromOrder(technicianId: number, orderId: number) {
    const existing = await this.prisma.nailWork.findUnique({
      where: { sourceOrderId: orderId },
      select: { id: true, techId: true },
    });
    if (existing) {
      if (existing.techId !== technicianId)
        throw new NotFoundException('已完成订单不存在');
      return this.findOne(technicianId, existing.id);
    }
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, technicianId, status: 'completed' },
      include: {
        service: { select: { name: true } },
        serviceRecord: { select: { actualAmount: true } },
      },
    });
    if (!order) throw new NotFoundException('已完成订单不存在');
    const clientPhotos = this.parseStoredImageUrls(order.clientPhotos);
    const images = clientPhotos.length
      ? clientPhotos
      : this.parseStoredImageUrls(order.customImages);
    const amount = order.serviceRecord?.actualAmount ?? order.actualAmount ?? 0;
    const work = await this.prisma.$transaction(async (tx) => {
      const created = await tx.nailWork.create({
        data: {
          techId: technicianId,
          sourceOrderId: order.id,
          visibilityScope: 'authorized_clients',
          serviceId: order.serviceId,
          title: order.service?.name
            ? `${order.service.name}服务案例`
            : '服务案例',
          coverUrl: images[0] || null,
          images: JSON.stringify(images.slice(0, 9)),
          price: amount,
          referencePriceMinFen: Math.round(amount * 100),
          assetStatus: 'draft',
          publicationStatus: 'draft',
          publicAuthorizationStatus: 'pending',
          isVisible: false,
        },
      });
      await tx.nailWorkClientAccess.create({
        data: {
          workId: created.id,
          customerId: order.customerId,
          clientUserId: order.clientUserId,
          orderId: order.id,
          canView: true,
          canShare: false,
          canFavorite: true,
          canLike: true,
          canComment: true,
        },
      });
      return created;
    }).catch(async (error) => {
      if (error.code !== 'P2002') throw error;
      const existing = await this.prisma.nailWork.findUnique({ where: { sourceOrderId: orderId } });
      if (!existing || existing.techId !== technicianId) throw error;
      return existing;
    });
    return this.findOne(technicianId, work.id);
  }

  private assertImageLimit(images?: string) {
    if (!images) return;
    try {
      const parsed = JSON.parse(images);
      if (!Array.isArray(parsed)) throw new Error('not array');
      if (parsed.length > 9) {
        throw new BadRequestException('每个作品最多上传 9 张图片');
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('作品图片列表格式无效');
    }
  }

  async remove(technicianId: number, id: number) {
    const existing = await this.prisma.nailWork.findFirst({
      where: { id, techId: technicianId },
    });

    if (!existing) {
      throw new NotFoundException('作品不存在');
    }

    const imageUrls = [
      existing.coverUrl,
      ...this.parseStoredImageUrls(existing.images),
    ].filter((url): url is string => Boolean(url));
    const assets = imageUrls.length
      ? await this.prisma.uploadedAsset.findMany({
          where: {
            technicianId,
            deletedAt: null,
            url: { in: imageUrls },
          },
        })
      : [];

    await this.prisma.nailWork.delete({
      where: { id },
    });
    let cleanupPending = 0;
    for (const asset of assets) {
      try {
        await this.storage.deleteImageVariants([
          asset.highUrl,
          asset.mediumUrl,
          asset.thumbnailUrl,
        ]);
        await this.prisma.uploadedAsset.update({
          where: { id: asset.id },
          data: { deletedAt: new Date() },
        });
        await this.subscriptions.releaseStorageUsage(
          technicianId,
          asset.bytesStored,
        );
      } catch {
        cleanupPending += 1;
      }
    }

    return { success: true, cleanupPending };
  }

  private parseStoredImageUrls(images?: string | null) {
    if (!images) return [];
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : [];
    } catch {
      return [];
    }
  }

  async toggleVisible(technicianId: number, id: number) {
    const existing = await this.prisma.nailWork.findFirst({
      where: { id, techId: technicianId },
    });

    if (!existing) {
      throw new NotFoundException('作品不存在');
    }

    const work = await this.prisma.nailWork.update({
      where: { id },
      data: { isVisible: !existing.isVisible },
      include: {
        likes: true,
        favorites: true,
        comments: true,
      },
    });

    return this.mapWork(work, technicianId);
  }

  // Like functionality
  async likeWork(workId: number, technicianId?: number, clientId?: number) {
    if (!technicianId && !clientId) {
      throw new BadRequestException(
        'Must provide either technicianId or clientId',
      );
    }

    const existing = await this.prisma.nailWorkLike.findFirst({
      where: {
        workId,
        ...(technicianId ? { technicianId } : { clientId }),
      },
    });

    if (existing) {
      // Unlike
      await this.prisma.nailWorkLike.delete({
        where: { id: existing.id },
      });
      return { liked: false };
    }

    // Like
    await this.prisma.nailWorkLike.create({
      data: {
        workId,
        technicianId,
        clientId,
      },
    });
    return { liked: true };
  }

  // Favorite functionality
  async favoriteWork(workId: number, technicianId?: number, clientId?: number) {
    if (!technicianId && !clientId) {
      throw new BadRequestException(
        'Must provide either technicianId or clientId',
      );
    }

    const existing = await this.prisma.nailWorkFavorite.findFirst({
      where: {
        workId,
        ...(technicianId ? { technicianId } : { clientId }),
      },
    });

    if (existing) {
      // Remove favorite
      await this.prisma.nailWorkFavorite.delete({
        where: { id: existing.id },
      });
      return { favorited: false };
    }

    // Add favorite
    await this.prisma.nailWorkFavorite.create({
      data: {
        workId,
        technicianId,
        clientId,
      },
    });
    return { favorited: true };
  }

  async togglePinned(technicianId: number, id: number) {
    const existing = await this.prisma.nailWork.findFirst({
      where: { id, techId: technicianId },
    });

    if (!existing) {
      throw new NotFoundException('作品不存在');
    }

    const work = await this.prisma.nailWork.update({
      where: { id },
      data: { isPinned: !existing.isPinned },
      include: {
        likes: true,
        favorites: true,
        comments: true,
        technician: { select: { name: true } },
      },
    });

    return this.mapWork(work, technicianId);
  }

  async toggleFeatured(technicianId: number, id: number) {
    const existing = await this.prisma.nailWork.findFirst({
      where: { id, techId: technicianId },
    });

    if (!existing) {
      throw new NotFoundException('作品不存在');
    }

    const work = await this.prisma.nailWork.update({
      where: { id },
      data: { isFeatured: !existing.isFeatured },
      include: {
        likes: true,
        favorites: true,
        comments: true,
        technician: { select: { name: true } },
      },
    });

    return this.mapWork(work, technicianId);
  }

  async getComments(workId: number, currentTechnicianId?: number) {
    const comments = await this.prisma.nailWorkComment.findMany({
      where: { workId, parentId: null },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      include: {
        client: { select: { id: true, nickname: true, avatarUrl: true } },
        technician: { select: { id: true, name: true, avatarUrl: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            client: { select: { id: true, nickname: true, avatarUrl: true } },
            technician: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });

    // Map comments with user info
    const mapped = comments.map((c) => this.mapComment(c, currentTechnicianId));

    // Separate pinned and non-pinned, hidden go to bottom
    const pinned = mapped.filter((c) => c.isPinned);
    const normal = mapped.filter((c) => !c.isPinned && !c.isHidden);
    const hidden = mapped.filter((c) => c.isHidden && !c.isPinned);

    return [...pinned, ...normal, ...hidden];
  }

  async addComment(
    workId: number,
    content: string,
    technicianId?: number,
    clientId?: number,
    parentId?: number,
  ) {
    if (!technicianId && !clientId) {
      throw new BadRequestException(
        'Must provide either technicianId or clientId',
      );
    }

    // Validate parent comment exists and belongs to same work
    if (parentId) {
      const parent = await this.prisma.nailWorkComment.findFirst({
        where: { id: parentId, workId },
      });
      if (!parent) {
        throw new NotFoundException('回复的评论不存在');
      }
    }

    const comment = await this.prisma.nailWorkComment.create({
      data: {
        workId,
        content,
        technicianId,
        clientId,
        parentId,
      },
      include: {
        client: { select: { id: true, nickname: true, avatarUrl: true } },
        technician: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return this.mapComment(comment, technicianId);
  }

  async deleteComment(commentId: number, technicianId: number) {
    const comment = await this.prisma.nailWorkComment.findFirst({
      where: { id: commentId },
      include: { work: true, replies: true },
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    if (
      comment.work.techId !== technicianId &&
      comment.technicianId !== technicianId
    ) {
      throw new BadRequestException('无权删除此评论');
    }

    // If has replies, soft delete (keep for context)
    if (comment.replies && comment.replies.length > 0) {
      await this.prisma.nailWorkComment.update({
        where: { id: commentId },
        data: { content: '该评论已被删除', clientId: null, technicianId: null },
      });
    } else {
      // No replies, hard delete
      await this.prisma.nailWorkComment.delete({
        where: { id: commentId },
      });
    }

    return { success: true };
  }

  async pinComment(commentId: number, technicianId: number) {
    const comment = await this.prisma.nailWorkComment.findFirst({
      where: { id: commentId },
      include: { work: true },
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    if (comment.work.techId !== technicianId) {
      throw new BadRequestException('无权操作此评论');
    }

    if (comment.isPinned) {
      // Unpin
      await this.prisma.nailWorkComment.update({
        where: { id: commentId },
        data: { isPinned: false },
      });
      return { pinned: false };
    }

    // Unpin all other comments for this work first (only one pinned at a time)
    await this.prisma.nailWorkComment.updateMany({
      where: { workId: comment.workId, isPinned: true },
      data: { isPinned: false },
    });

    // Pin this comment
    await this.prisma.nailWorkComment.update({
      where: { id: commentId },
      data: { isPinned: true },
    });
    return { pinned: true };
  }

  async hideComment(commentId: number, technicianId: number) {
    const comment = await this.prisma.nailWorkComment.findFirst({
      where: { id: commentId },
      include: { work: true },
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    if (comment.work.techId !== technicianId) {
      throw new BadRequestException('无权操作此评论');
    }

    await this.prisma.nailWorkComment.update({
      where: { id: commentId },
      data: { isHidden: !comment.isHidden },
    });
    return { hidden: !comment.isHidden };
  }

  async markCommentsAsRead(workId: number, technicianId: number) {
    // Verify the work belongs to this technician
    const work = await this.prisma.nailWork.findFirst({
      where: { id: workId, techId: technicianId },
    });

    if (!work) {
      throw new NotFoundException('作品不存在');
    }

    // Mark all unread comments as read
    await this.prisma.nailWorkComment.updateMany({
      where: { workId, isRead: false },
      data: { isRead: true },
    });

    return { success: true };
  }

  async incrementViewCount(workId: number) {
    await this.prisma.nailWork.update({
      where: { id: workId },
      data: { viewCount: { increment: 1 } },
    });
  }

  async markLikesAsRead(workId: number, technicianId: number) {
    const work = await this.prisma.nailWork.findFirst({
      where: { id: workId, techId: technicianId },
    });

    if (!work) {
      throw new NotFoundException('作品不存在');
    }

    await this.prisma.nailWorkLike.updateMany({
      where: { workId, isRead: false },
      data: { isRead: true },
    });

    return { success: true };
  }

  async markFavoritesAsRead(workId: number, technicianId: number) {
    const work = await this.prisma.nailWork.findFirst({
      where: { id: workId, techId: technicianId },
    });

    if (!work) {
      throw new NotFoundException('作品不存在');
    }

    await this.prisma.nailWorkFavorite.updateMany({
      where: { workId, isRead: false },
      data: { isRead: true },
    });

    return { success: true };
  }

  private toAbsoluteUrl(url: string | null): string | null {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${UPLOAD_BASE_URL}${url}`;
  }

  private mapComment(comment: any, currentTechnicianId?: number) {
    const isAuthor = comment.technicianId === currentTechnicianId;
    const user = comment.technician
      ? {
          id: comment.technician.id,
          name: comment.technician.name,
          avatarUrl: this.toAbsoluteUrl(comment.technician.avatarUrl),
          role: 'technician' as const,
        }
      : comment.client
        ? {
            id: comment.client.id,
            name: comment.client.nickname || '客户',
            avatarUrl: this.toAbsoluteUrl(comment.client.avatarUrl),
            role: 'client' as const,
          }
        : {
            id: 0,
            name: '已删除用户',
            avatarUrl: null,
            role: 'unknown' as const,
          };

    return {
      id: comment.id,
      workId: comment.workId,
      parentId: comment.parentId,
      content: comment.content,
      isPinned: comment.isPinned ?? false,
      isHidden: comment.isHidden ?? false,
      isRead: comment.isRead ?? false,
      isAuthor,
      user,
      replies: (comment.replies || []).map((r: any) =>
        this.mapComment(r, currentTechnicianId),
      ),
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }

  private async resolveWorkPricing(
    technicianId: number,
    selectedServiceIds: string[],
    standardPrice?: number,
  ) {
    if (!selectedServiceIds.length) {
      throw new BadRequestException('请选择至少一项作品基础服务');
    }
    if (
      standardPrice == null ||
      !Number.isFinite(standardPrice) ||
      standardPrice <= 0
    ) {
      throw new BadRequestException('请填写作品标准报价');
    }
    const services = await this.prisma.service.findMany({
      where: {
        technicianId,
        publicId: { in: selectedServiceIds },
        isBookable: true,
        archivedAt: null,
      },
      select: {
        id: true,
        publicId: true,
        name: true,
        priceMinFen: true,
        durationMinutes: true,
      },
    });
    const quantities = selectedServiceIds.reduce(
      (result, servicePublicId) => {
        result.set(servicePublicId, (result.get(servicePublicId) ?? 0) + 1);
        return result;
      },
      new Map<string, number>(),
    );
    const lines = buildServiceSnapshotLines(
      services,
      Array.from(quantities, ([servicePublicId, quantity]) => ({
        servicePublicId,
        quantity,
      })),
    );
    const summary = summarizeSnapshotLines(lines);
    return {
      lines,
      ...summary,
      standardPriceFen: Math.round(standardPrice * 100),
    };
  }

  private mapWork(
    work: {
      id: number;
      title: string | null;
      coverUrl: string | null;
      images: string | null;
      description: string | null;
      designIdea?: string | null;
      suitableScene?: string | null;
      recommendationScore?: number | null;
      tags: string | null;
      isVisible: boolean;
      isPinned?: boolean;
      isFeatured?: boolean;
      heroSlot?: number | null;
      archivedAt?: Date | null;
      sortOrder: number;
      price?: number | null;
      viewCount?: number;
      createdAt: Date;
      updatedAt: Date;
      likes?: {
        id: number;
        technicianId?: number | null;
        clientId?: number | null;
        isRead?: boolean;
      }[];
      favorites?: {
        id: number;
        technicianId?: number | null;
        clientId?: number | null;
        isRead?: boolean;
      }[];
      comments?: { id: number; isRead?: boolean }[];
      technician?: { name: string | null };
      visibilityScope?: string;
      publicationStatus?: string;
      reviewNote?: string | null;
      publishedAt?: Date | null;
      clientAccesses?: any[];
      _count?: { shareEvents?: number };
      serviceSubtotalFen?: number;
      standardPriceFen?: number | null;
      totalDurationMinutes?: number;
      serviceLines?: any[];
      promotion?: any;
    },
    currentTechnicianId?: number,
  ) {
    const rawImageUrls = this.parseImageUrls(work.images, work.coverUrl);
    const imageUrls = rawImageUrls
      .map((url) => this.toAbsoluteUrl(url))
      .filter(Boolean) as string[];
    const coverUrl = this.toAbsoluteUrl(work.coverUrl) ?? imageUrls[0] ?? null;

    // Check if current technician has liked/favorited this work
    const isLiked = currentTechnicianId
      ? (work.likes?.some(
          (like) => like.technicianId === currentTechnicianId,
        ) ?? false)
      : false;
    const isFavorited = currentTechnicianId
      ? (work.favorites?.some(
          (fav) => fav.technicianId === currentTechnicianId,
        ) ?? false)
      : false;

    // Count unread comments
    const unreadComments = work.comments?.filter((c) => !c.isRead).length ?? 0;
    // Count unread likes and favorites
    const unreadLikes = work.likes?.filter((l) => !l.isRead).length ?? 0;
    const unreadFavorites =
      work.favorites?.filter((f) => !f.isRead).length ?? 0;

    return {
      id: work.id,
      title: work.title,
      coverUrl,
      imageUrls,
      description: work.description ?? null,
      designIdea: work.designIdea ?? null,
      suitableScene: work.suitableScene ?? null,
      recommendationScore: work.recommendationScore ?? null,
      tags: this.parseTags(work.tags ?? null),
      price: work.price ?? null,
      serviceSubtotalFen: work.serviceSubtotalFen ?? 0,
      standardPriceFen: work.standardPriceFen ?? null,
      standardPrice:
        work.standardPriceFen == null ? null : work.standardPriceFen / 100,
      totalDurationMinutes: work.totalDurationMinutes ?? 0,
      serviceLines: (work.serviceLines ?? []).map((line) => ({
        serviceId: line.servicePublicIdSnapshot ?? null,
        name: line.nameSnapshot,
        unitPriceFen: line.unitPriceFen,
        durationMinutes: line.durationMinutes,
        quantity: line.quantity,
        subtotalFen: line.subtotalFen,
      })),
      promotion: this.mapPromotion(work.promotion),
      isVisible: work.isVisible,
      isPinned: work.isPinned ?? false,
      isFeatured: work.isFeatured ?? false,
      heroSlot: work.heroSlot ?? null,
      archivedAt: work.archivedAt ?? null,
      visibilityScope: work.visibilityScope ?? 'public',
      publicationStatus: work.publicationStatus ?? 'pending',
      reviewNote: work.reviewNote ?? null,
      publishedAt: work.publishedAt ?? null,
      clientAccesses: work.clientAccesses ?? [],
      shareEventCount: work._count?.shareEvents ?? 0,
      sortOrder: work.sortOrder,
      viewCount: work.viewCount ?? 0,
      likeCount: work.likes?.length ?? 0,
      favoriteCount: work.favorites?.length ?? 0,
      commentCount: work.comments?.length ?? 0,
      unreadComments,
      unreadLikes,
      unreadFavorites,
      isLiked,
      isFavorited,
      technicianName: work.technician?.name ?? '美甲师',
      createdAt: work.createdAt,
      updatedAt: work.updatedAt,
    };
  }

  private mapPromotion(promotion: any) {
    if (!promotion) return null;
    const now = Date.now();
    const startsAt = promotion.startsAt ? new Date(promotion.startsAt) : null;
    const endsAt = promotion.endsAt ? new Date(promotion.endsAt) : null;
    return {
      id: promotion.id,
      title: promotion.title,
      discountAmountFen: promotion.discountAmountFen,
      discountAmount: promotion.discountAmountFen / 100,
      enabled: promotion.enabled,
      startsAt: promotion.startsAt,
      endsAt: promotion.endsAt,
      isActive: promotion.enabled && (!startsAt || startsAt.getTime() <= now) && (!endsAt || endsAt.getTime() > now),
    };
  }

  private parseImageUrls(images: string | null, coverUrl: string | null) {
    if (!images) {
      return coverUrl ? [coverUrl] : [];
    }

    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is string => typeof item === 'string',
        );
      }
    } catch {
      return images
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return coverUrl ? [coverUrl] : [];
  }

  private parseTags(tags: string | null) {
    if (!tags) {
      return [];
    }

    return tags
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

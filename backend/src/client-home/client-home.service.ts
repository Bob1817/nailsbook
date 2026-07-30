import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ClientHomeService {
  constructor(private readonly prisma: PrismaService) {}

  private visibilityWhere(clientUserId: number) {
    return {
      OR: [
        { visibilityScope: 'public' },
        { clientAccesses: { some: { clientUserId, canView: true } } },
      ],
    };
  }

  async getHome(clientUserId: number) {
    const binding = await this.getDefaultBinding(clientUserId);
    const [works, latestBooking] = await Promise.all([
      this.prisma.nailWork.findMany({
        where: {
          techId: binding.techId,
          isVisible: true,
          isFeatured: true, // 只显示精品作品
          ...this.visibilityWhere(clientUserId),
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        take: 6,
        include: {
          likes: true,
          comments: true,
          technician: {
            select: { name: true, id: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.order.findFirst({
        where: {
          clientUserId,
          technicianId: binding.techId,
        },
        orderBy: [{ startTime: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    const UPLOAD_BASE_URL =
      process.env.UPLOAD_BASE_URL || 'http://localhost:3000';
    const toAbsoluteUrl = (url: string | null): string | null => {
      if (!url) return null;
      if (url.startsWith('http')) return url;
      return `${UPLOAD_BASE_URL}${url}`;
    };

    return {
      technician: {
        id: binding.technician.id,
        name: binding.technician.name,
        phone: binding.technician.phone,
        avatarUrl: toAbsoluteUrl(binding.technician.avatarUrl),
        city: binding.technician.city,
        serviceArea: binding.technician.serviceArea,
      },
      works: works.map((work) => ({
        ...this.mapWork(work),
        technicianId: work.techId,
        isLiked: work.likes.some((like) => like.clientId === clientUserId),
      })),
      latestOrder: latestBooking
        ? {
            id: latestBooking.id,
            orderNo: latestBooking.orderNo,
            status: latestBooking.status,
            startTime: latestBooking.startTime,
            endTime: latestBooking.endTime,
            address: latestBooking.address,
          }
        : null,
    };
  }

  async getBeautyArchive(clientUserId: number) {
    const [orders, standaloneAccesses, favorites, bindings] = await Promise.all(
      [
        this.prisma.order.findMany({
          where: { clientUserId, status: 'completed' },
          orderBy: { completedAt: 'desc' },
          include: {
            technician: { select: { id: true, name: true, avatarUrl: true } },
            workAccesses: {
              where: { clientUserId, canView: true },
              include: { work: true },
              take: 1,
            },
          },
        }),
        this.prisma.nailWorkClientAccess.findMany({
          where: {
            clientUserId,
            canView: true,
            orderId: null,
            work: { isVisible: true },
          },
          orderBy: { createdAt: 'desc' },
          include: {
            work: {
              include: {
                technician: {
                  select: { id: true, name: true, avatarUrl: true },
                },
              },
            },
          },
        }),
        this.prisma.nailWorkFavorite.findMany({
          where: {
            clientId: clientUserId,
            work: { isVisible: true, ...this.visibilityWhere(clientUserId) },
          },
          include: { work: { select: { id: true, tags: true } } },
        }),
        this.prisma.clientTechBinding.findMany({
          where: { clientId: clientUserId, status: 'active' },
          select: { techId: true },
        }),
      ],
    );

    const records: any[] = orders.map((order) => {
      const access = order.workAccesses[0];
      const work = access?.work;
      const clientPhotos = this.parseImageUrls(order.clientPhotos, null);
      const linkedWorkPhotos = work ? this.absoluteWorkImages(work) : [];
      const imageUrls = Array.from(
        new Set([
          ...clientPhotos.map((url) => this.absoluteUrl(url)),
          ...linkedWorkPhotos,
        ]),
      );
      return {
        id: `order-${order.id}`,
        targetType: 'order',
        targetId: order.id,
        orderId: order.id,
        workId: work?.id ?? null,
        title: work?.title || order.serviceType || '私人美甲服务',
        coverUrl: imageUrls[0] || null,
        imageUrls,
        clientPhotos: clientPhotos.map((url) => this.absoluteUrl(url)),
        clientPhotoCount: clientPhotos.length,
        clientRecordNote: order.clientRecordNote ?? null,
        linkedWorkPhotoCount: linkedWorkPhotos.length,
        tags: this.parseTags(work?.tags ?? null),
        technicianId: order.technician.id,
        technicianName: order.technician.name,
        serviceDate: order.completedAt || order.startTime,
        price: order.quotePrice ?? 0,
        permissions: access
          ? this.resolvePermissions('authorized_clients', access)
          : null,
      };
    });

    standaloneAccesses.forEach((access) => {
      const imageUrls = this.absoluteWorkImages(access.work);
      records.push({
        id: `work-${access.work.id}`,
        targetType: 'work',
        targetId: access.work.id,
        orderId: null,
        workId: access.work.id,
        title: access.work.title || '客户专属作品',
        coverUrl: imageUrls[0] || this.absoluteWorkCover(access.work),
        imageUrls,
        clientPhotos: [],
        clientPhotoCount: 0,
        linkedWorkPhotoCount: imageUrls.length,
        tags: this.parseTags(access.work.tags),
        technicianId: access.work.technician.id,
        technicianName: access.work.technician.name,
        serviceDate: access.work.createdAt,
        price: access.work.price ?? 0,
        permissions: this.resolvePermissions('authorized_clients', access),
      });
    });

    records.sort(
      (a, b) =>
        new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime(),
    );
    const tagCounts: Record<string, number> = {};
    records.forEach((record) =>
      record.tags.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }),
    );
    favorites.forEach((favorite) =>
      this.parseTags(favorite.work.tags).forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 2;
      }),
    );
    const styleTags = Object.keys(tagCounts)
      .sort((a, b) => tagCounts[b] - tagCounts[a])
      .slice(0, 4);
    const archivedWorkIds = new Set(
      records.map((record) => record.workId).filter(Boolean),
    );
    const techIds = bindings.map((binding) => binding.techId);
    const candidates = techIds.length
      ? await this.prisma.nailWork.findMany({
          where: {
            techId: { in: techIds },
            isVisible: true,
            id: archivedWorkIds.size
              ? { notIn: [...archivedWorkIds] }
              : undefined,
            ...this.visibilityWhere(clientUserId),
          },
          orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
          take: 30,
          include: {
            likes: true,
            comments: true,
            favorites: true,
            technician: { select: { id: true, name: true, avatarUrl: true } },
          },
        })
      : [];
    const recommendations = candidates
      .map((work) => {
        const tags = this.parseTags(work.tags);
        const matchedTags = tags.filter((tag) => styleTags.includes(tag));
        const score =
          matchedTags.reduce((sum, tag) => sum + (tagCounts[tag] || 0), 0) +
          (work.isFeatured ? 2 : 0) +
          (work.recommendationScore || 0);
        return {
          ...this.mapWork(work),
          matchedTags,
          recommendationReason: matchedTags.length
            ? `延续你喜欢的${matchedTags.slice(0, 2).join('、')}风格`
            : work.isFeatured
              ? '美甲师近期精选设计'
              : '为你探索新的审美方向',
          _score: score,
        };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, 6)
      .map(({ _score, ...work }) => work);

    return {
      records,
      recommendations,
      summary: {
        recordCount: records.length,
        totalSpent: orders.reduce(
          (sum, order) => sum + (order.quotePrice ?? 0),
          0,
        ),
        favoriteStyle: styleTags[0] || '待探索',
        favoriteScene: this.inferScene(styleTags),
        styleTags,
      },
    };
  }

  async getWorks(
    clientUserId: number,
    techId?: number,
    sortBy: 'latest' | 'likes' | 'comments' | 'favorites' = 'latest',
    sortDir: 'asc' | 'desc' = 'desc',
  ) {
    let techFilter: number | { in: number[] };
    if (techId) {
      const binding = await this.prisma.clientTechBinding.findFirst({
        where: { clientId: clientUserId, techId, status: 'active' },
      });
      if (!binding) {
        throw new NotFoundException('未绑定该美甲师');
      }
      techFilter = techId;
    } else {
      const boundTechIds = (
        await this.prisma.clientTechBinding.findMany({
          where: { clientId: clientUserId, status: 'active' },
          select: { techId: true },
        })
      ).map((b) => b.techId);
      if (boundTechIds.length === 0) {
        return [];
      }
      techFilter = { in: boundTechIds };
    }
    const works = await this.prisma.nailWork.findMany({
      where: {
        techId: techFilter,
        isVisible: true,
        ...this.visibilityWhere(clientUserId),
      },
      orderBy: this.buildWorksOrderBy(sortBy, sortDir),
      include: {
        likes: true,
        comments: true,
        favorites: true,
        technician: {
          select: { name: true, id: true, avatarUrl: true },
        },
      },
    });

    return works.map((work) => ({
      ...this.mapWork(work),
      technicianId: work.techId,
      isLiked: work.likes.some((like) => like.clientId === clientUserId),
    }));
  }

  private buildWorksOrderBy(
    sortBy: 'latest' | 'likes' | 'comments' | 'favorites',
    sortDir: 'asc' | 'desc' = 'desc',
  ): any[] {
    switch (sortBy) {
      case 'likes':
        return [{ likes: { _count: sortDir } }, { createdAt: 'desc' }];
      case 'comments':
        return [{ comments: { _count: sortDir } }, { createdAt: 'desc' }];
      case 'favorites':
        return [{ favorites: { _count: sortDir } }, { createdAt: 'desc' }];
      default:
        return [
          { isPinned: 'desc' },
          { sortOrder: 'asc' },
          { createdAt: sortDir },
        ];
    }
  }

  // 首页"最新动态"：所有已绑定美甲师的推荐作品，分页（无限上拉）
  async getFeaturedWorks(clientUserId: number, page = 1, limit = 10) {
    const boundTechIds = (
      await this.prisma.clientTechBinding.findMany({
        where: { clientId: clientUserId, status: 'active' },
        select: { techId: true },
      })
    ).map((b) => b.techId);

    if (boundTechIds.length === 0) {
      return { works: [], hasMore: false };
    }

    const where = {
      techId: { in: boundTechIds },
      isVisible: true,
      isFeatured: true,
      ...this.visibilityWhere(clientUserId),
    };

    const [works, total] = await Promise.all([
      this.prisma.nailWork.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          likes: true,
          comments: true,
          favorites: true,
          technician: { select: { name: true, id: true, avatarUrl: true } },
        },
      }),
      this.prisma.nailWork.count({ where }),
    ]);

    return {
      works: works.map((work) => ({
        ...this.mapWork(work),
        technicianId: work.techId,
        isLiked: work.likes.some((like) => like.clientId === clientUserId),
      })),
      hasMore: page * limit < total,
    };
  }

  async getFavorites(clientUserId: number) {
    const favorites = await this.prisma.nailWorkFavorite.findMany({
      where: {
        clientId: clientUserId,
        work: { isVisible: true, ...this.visibilityWhere(clientUserId) },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        work: {
          include: {
            likes: true,
            comments: true,
            technician: { select: { name: true, id: true, avatarUrl: true } },
          },
        },
      },
    });

    return favorites
      .filter((f) => f.work && f.work.isVisible)
      .map((f) => ({
        ...this.mapWork(f.work),
        technicianId: f.work.techId,
        favoritedAt: f.createdAt,
      }));
  }

  async getLikes(clientUserId: number) {
    const likes = await this.prisma.nailWorkLike.findMany({
      where: {
        clientId: clientUserId,
        work: { isVisible: true, ...this.visibilityWhere(clientUserId) },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        work: {
          include: {
            likes: true,
            comments: true,
            technician: { select: { name: true, id: true, avatarUrl: true } },
          },
        },
      },
    });

    return likes
      .filter((l) => l.work && l.work.isVisible)
      .map((l) => ({
        ...this.mapWork(l.work),
        technicianId: l.work.techId,
        likedAt: l.createdAt,
      }));
  }

  async getWork(clientUserId: number, id: number) {
    // 允许查看任意「已绑定美甲师」的作品（不限默认美甲师）
    const boundTechIds = (
      await this.prisma.clientTechBinding.findMany({
        where: { clientId: clientUserId, status: 'active' },
        select: { techId: true },
      })
    ).map((b) => b.techId);
    const work = await this.prisma.nailWork.findFirst({
      where: {
        id,
        techId: { in: boundTechIds },
        isVisible: true,
        ...this.visibilityWhere(clientUserId),
      },
      include: {
        likes: true,
        favorites: true,
        comments: {
          where: { parentId: null },
          orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
          include: {
            client: { select: { id: true, nickname: true, avatarUrl: true } },
            technician: { select: { id: true, name: true, avatarUrl: true } },
            replies: {
              orderBy: { createdAt: 'asc' },
              include: {
                client: {
                  select: { id: true, nickname: true, avatarUrl: true },
                },
                technician: {
                  select: { id: true, name: true, avatarUrl: true },
                },
              },
            },
          },
        },
        technician: {
          select: { name: true, avatarUrl: true, id: true },
        },
        clientAccesses: { where: { clientUserId }, take: 1 },
      },
    });

    if (!work) {
      throw new NotFoundException('作品不存在');
    }

    const isLiked = work.likes.some((like) => like.clientId === clientUserId);
    const isFavorited = work.favorites.some(
      (fav) => fav.clientId === clientUserId,
    );

    const mapped = work.comments.map((c) => this.mapComment(c, clientUserId));
    const pinned = mapped.filter((c) => c.isPinned);
    const normal = mapped.filter((c) => !c.isPinned && !c.isHidden);
    const hidden = mapped.filter((c) => c.isHidden && !c.isPinned);

    return {
      ...this.mapWork(work),
      isLiked,
      isFavorited,
      permissions: this.resolvePermissions(
        work.visibilityScope,
        work.clientAccesses[0],
      ),
      comments: [...pinned, ...normal, ...hidden],
    };
  }

  private async getDefaultBinding(clientUserId: number) {
    const binding = await this.prisma.clientTechBinding.findFirst({
      where: {
        clientId: clientUserId,
        status: 'active',
        isDefault: true,
      },
      include: {
        technician: true,
      },
    });

    if (binding) {
      return binding;
    }

    // Fallback to any active binding
    const anyBinding = await this.prisma.clientTechBinding.findFirst({
      where: {
        clientId: clientUserId,
        status: 'active',
      },
      include: {
        technician: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!anyBinding) {
      throw new NotFoundException('客户未绑定美甲师');
    }

    return anyBinding;
  }

  private mapWork(work: {
    id: number;
    title: string | null;
    coverUrl: string | null;
    images: string | null;
    description?: string | null;
    designIdea?: string | null;
    suitableScene?: string | null;
    recommendationScore?: number | null;
    tags?: string | null;
    createdAt: Date;
    updatedAt: Date;
    likes?: { id: number }[];
    comments?: { id: number }[];
    favorites?: { id: number }[];
    technician?: {
      name: string | null;
      id?: number;
      avatarUrl?: string | null;
    };
    techId?: number;
    visibilityScope?: string;
  }) {
    const imageUrls = this.parseImageUrls(work.images, work.coverUrl);
    const UPLOAD_BASE_URL =
      process.env.UPLOAD_BASE_URL || 'http://localhost:3000';

    const toAbsoluteUrl = (url: string | null): string | null => {
      if (!url) return null;
      if (url.startsWith('http')) return url;
      return `${UPLOAD_BASE_URL}${url}`;
    };

    // Get technicianId from either work.techId or work.technician.id
    const technicianId = work.techId ?? work.technician?.id;

    return {
      id: work.id,
      title: work.title,
      coverUrl:
        toAbsoluteUrl(work.coverUrl) ?? toAbsoluteUrl(imageUrls[0]) ?? null,
      imageUrls: imageUrls
        .map((url) => toAbsoluteUrl(url))
        .filter(Boolean) as string[],
      description: work.description ?? null,
      designIdea: work.designIdea ?? null,
      suitableScene: work.suitableScene ?? null,
      recommendationScore: work.recommendationScore ?? null,
      tags: this.parseTags(work.tags ?? null),
      likeCount: work.likes?.length ?? 0,
      commentCount: work.comments?.length ?? 0,
      favoriteCount: work.favorites?.length ?? 0,
      technicianName: work.technician?.name ?? '美甲师',
      technicianAvatarUrl: work.technician?.avatarUrl
        ? toAbsoluteUrl(work.technician.avatarUrl)
        : null,
      technicianId: technicianId,
      visibilityScope: work.visibilityScope ?? 'public',
      createdAt: work.createdAt,
      updatedAt: work.updatedAt,
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

  private absoluteWorkCover(work: {
    coverUrl: string | null;
    images: string | null;
  }) {
    const first = work.coverUrl || this.parseImageUrls(work.images, null)[0];
    if (!first) return null;
    return first.startsWith('http')
      ? first
      : `${process.env.UPLOAD_BASE_URL || 'http://localhost:3000'}${first}`;
  }

  private absoluteWorkImages(work: {
    coverUrl: string | null;
    images: string | null;
  }) {
    return this.parseImageUrls(work.images, work.coverUrl).map((url) =>
      this.absoluteUrl(url),
    );
  }

  private absoluteUrl(url: string) {
    return url.startsWith('http')
      ? url
      : `${process.env.UPLOAD_BASE_URL || 'http://localhost:3000'}${url}`;
  }

  private inferScene(tags: string[]) {
    const text = tags.join('');
    if (/婚|新娘/.test(text)) return '婚礼';
    if (/职场|极简|裸色/.test(text)) return '职场';
    if (/旅行|度假/.test(text)) return '旅行';
    return tags.length ? '精致日常' : '待探索';
  }

  // Like functionality
  async likeWork(clientUserId: number, workId: number) {
    const work = await this.getAccessibleWork(clientUserId, workId);
    const access = await this.getClientAccess(clientUserId, workId);
    if (work.visibilityScope !== 'public' && !access?.canLike)
      throw new ForbiddenException('美甲师未授权点赞此作品');

    const existing = await this.prisma.nailWorkLike.findFirst({
      where: { workId, clientId: clientUserId },
    });

    if (existing) {
      await this.prisma.nailWorkLike.delete({ where: { id: existing.id } });
      return { liked: false };
    }

    await this.prisma.nailWorkLike.create({
      data: { workId, clientId: clientUserId },
    });
    return { liked: true };
  }

  // Favorite functionality
  async favoriteWork(clientUserId: number, workId: number) {
    const work = await this.getAccessibleWork(clientUserId, workId);
    const access = await this.getClientAccess(clientUserId, workId);
    if (work.visibilityScope !== 'public' && !access?.canFavorite)
      throw new ForbiddenException('美甲师未授权收藏此作品');

    const existing = await this.prisma.nailWorkFavorite.findFirst({
      where: { workId, clientId: clientUserId },
    });

    if (existing) {
      await this.prisma.nailWorkFavorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }

    await this.prisma.nailWorkFavorite.create({
      data: { workId, clientId: clientUserId },
    });
    return { favorited: true };
  }

  // Comment functionality
  async getComments(clientUserId: number, workId: number) {
    await this.getAccessibleWork(clientUserId, workId);

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

    const mapped = comments.map((c) => this.mapComment(c, clientUserId));
    const pinned = mapped.filter((c) => c.isPinned);
    const normal = mapped.filter((c) => !c.isPinned && !c.isHidden);
    const hidden = mapped.filter((c) => c.isHidden && !c.isPinned);
    return [...pinned, ...normal, ...hidden];
  }

  async addComment(
    clientUserId: number,
    workId: number,
    content: string,
    parentId?: number,
  ) {
    const work = await this.getAccessibleWork(clientUserId, workId);
    const access = await this.getClientAccess(clientUserId, workId);
    if (work.visibilityScope !== 'public' && !access?.canComment)
      throw new ForbiddenException('美甲师未授权评论此作品');

    if (parentId) {
      const parent = await this.prisma.nailWorkComment.findFirst({
        where: { id: parentId, workId },
      });
      if (!parent) {
        throw new NotFoundException('回复的评论不存在');
      }
    }

    const comment = await this.prisma.nailWorkComment.create({
      data: { workId, clientId: clientUserId, content, parentId },
      include: {
        client: { select: { id: true, nickname: true, avatarUrl: true } },
        technician: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return this.mapComment(comment, clientUserId);
  }

  async createShareGrant(clientUserId: number, workId: number) {
    const work = await this.getAccessibleWork(clientUserId, workId);
    const access = await this.getClientAccess(clientUserId, workId);
    if (work.visibilityScope !== 'public' && !access?.canShare)
      throw new ForbiddenException('美甲师未授权分享此作品');
    if (work.visibilityScope === 'public') return { public: true, workId };
    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.nailWorkShareGrant.create({
      data: { token, workId, accessId: access!.id, clientUserId, expiresAt },
    });
    return { public: false, token, expiresAt };
  }

  async recordShare(clientUserId: number, workId: number, channel: string) {
    const work = await this.getAccessibleWork(clientUserId, workId);
    const access = await this.getClientAccess(clientUserId, workId);
    if (work.visibilityScope !== 'public' && !access?.canShare) {
      throw new ForbiddenException('美甲师未授权分享此作品');
    }
    await this.prisma.nailWorkShareEvent.create({
      data: {
        workId,
        clientUserId,
        eventType: 'share',
        channel: channel || 'wechat_friend',
      },
    });
    return { success: true };
  }

  private async getAccessibleWork(clientUserId: number, workId: number) {
    const work = await this.prisma.nailWork.findFirst({
      where: {
        id: workId,
        isVisible: true,
        technician: {
          clientBindings: {
            some: { clientId: clientUserId, status: 'active' },
          },
        },
        ...this.visibilityWhere(clientUserId),
      },
      select: { id: true, visibilityScope: true },
    });
    if (!work) throw new NotFoundException('作品不存在或未获查看授权');
    return work;
  }

  private getClientAccess(clientUserId: number, workId: number) {
    return this.prisma.nailWorkClientAccess.findFirst({
      where: { workId, clientUserId, canView: true },
    });
  }

  private resolvePermissions(scope: string, access?: any) {
    if (scope === 'public')
      return {
        canView: true,
        canShare: true,
        canFavorite: true,
        canLike: true,
        canComment: true,
      };
    return {
      canView: Boolean(access?.canView),
      canShare: Boolean(access?.canShare),
      canFavorite: Boolean(access?.canFavorite),
      canLike: Boolean(access?.canLike),
      canComment: Boolean(access?.canComment),
    };
  }

  async deleteComment(clientUserId: number, commentId: number) {
    const comment = await this.prisma.nailWorkComment.findFirst({
      where: { id: commentId },
      include: { replies: true },
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    if (comment.clientId !== clientUserId) {
      throw new NotFoundException('无权删除此评论');
    }

    if (comment.replies && comment.replies.length > 0) {
      await this.prisma.nailWorkComment.update({
        where: { id: commentId },
        data: { content: '该评论已被删除', clientId: null },
      });
    } else {
      await this.prisma.nailWorkComment.delete({ where: { id: commentId } });
    }

    return { success: true };
  }

  private mapComment(comment: any, clientUserId: number) {
    const UPLOAD_BASE_URL =
      process.env.UPLOAD_BASE_URL || 'http://localhost:3000';
    const toAbs = (url: string | null) => {
      if (!url) return null;
      return url.startsWith('http') ? url : `${UPLOAD_BASE_URL}${url}`;
    };

    const isAuthor = comment.clientId === clientUserId;
    const user = comment.technician
      ? {
          id: comment.technician.id,
          name: comment.technician.name,
          avatarUrl: toAbs(comment.technician.avatarUrl),
          role: 'technician' as const,
        }
      : comment.client
        ? {
            id: comment.client.id,
            name: comment.client.nickname || '客户',
            avatarUrl: toAbs(comment.client.avatarUrl),
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
      parentId: comment.parentId ?? null,
      content: comment.content,
      isPinned: comment.isPinned ?? false,
      isHidden: comment.isHidden ?? false,
      isAuthor,
      user,
      replies: (comment.replies || []).map((r: any) =>
        this.mapComment(r, clientUserId),
      ),
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}

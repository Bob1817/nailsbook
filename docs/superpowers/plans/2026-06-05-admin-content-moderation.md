# 超管内容审查与运营能力 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为超管后台新增作品管理（CMS级）、评论管理、举报队列、美甲师申请审核四个模块，同时为客户端新增评论举报入口，并提供官网公开精选作品 API。

**Architecture:** 后端采用独立 admin 子模块模式（与 admin-invite-keys 等保持一致），每个模块有独立的 module/controller/service 三层结构。前端 admin-frontend 新增四个 Ant Design 页面，client-frontend 在评论组件增加举报按钮。

**Tech Stack:** NestJS + Prisma（后端）、React + Ant Design（admin-frontend）、React + Tailwind（client-frontend）

---

## 文件结构总览

**新建（后端）：**
- `backend/src/admin-works/admin-works.module.ts`
- `backend/src/admin-works/admin-works.controller.ts`
- `backend/src/admin-works/admin-works.service.ts`
- `backend/src/admin-comments/admin-comments.module.ts`
- `backend/src/admin-comments/admin-comments.controller.ts`
- `backend/src/admin-comments/admin-comments.service.ts`
- `backend/src/admin-reports/admin-reports.module.ts`
- `backend/src/admin-reports/admin-reports.controller.ts`
- `backend/src/admin-reports/admin-reports.service.ts`
- `backend/src/client-reports/client-reports.module.ts`
- `backend/src/client-reports/client-reports.controller.ts`
- `backend/src/client-reports/client-reports.service.ts`

**修改（后端）：**
- `backend/prisma/schema.prisma` — 新增字段和表
- `backend/src/production-seed.service.ts` — 注册 8 个新权限码
- `backend/src/app.module.ts` — 注册 4 个新模块
- `backend/src/technician-works/public-works.controller.ts` — 新增精选作品路由

**新建（admin-frontend）：**
- `admin-frontend/src/pages/Works.tsx`
- `admin-frontend/src/pages/Comments.tsx`
- `admin-frontend/src/pages/Reports.tsx`
- `admin-frontend/src/pages/ArtistApplications.tsx`
- `admin-frontend/src/services/adminWork.ts`
- `admin-frontend/src/services/adminComment.ts`
- `admin-frontend/src/services/adminReport.ts`
- `admin-frontend/src/services/artistApplication.ts`

**修改（admin-frontend）：**
- `admin-frontend/src/App.tsx` — 新增 4 条路由
- `admin-frontend/src/layouts/MainLayout.tsx` — 新增 4 个菜单项

**修改（client-frontend）：**
- `client-frontend/src/pages/WorkDetailPage.tsx` — 评论举报按钮
- `client-frontend/src/services/works.ts` — 新增 reportComment 方法

---

## Task 1: Prisma Schema 变更 + Migration

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: 在 NailWork model 中新增 isHomepageFeatured 字段**

找到 `NailWork` model（约在 schema.prisma 中搜索 `model NailWork`），在 `viewCount` 字段后增加：

```prisma
isHomepageFeatured Boolean @default(false)
```

完整 NailWork model 应包含：
```prisma
model NailWork {
  id                 Int                @id @default(autoincrement())
  techId             Int
  title              String?
  coverUrl           String?
  images             String?
  description        String?
  tags               String?
  isVisible          Boolean            @default(true)
  isPinned           Boolean            @default(false)
  isFeatured         Boolean            @default(false)
  isHomepageFeatured Boolean            @default(false)
  sortOrder          Int                @default(0)
  price              Float?
  viewCount          Int                @default(0)
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @default(now()) @updatedAt
  technician         Technician         @relation(fields: [techId], references: [id])
  likes              NailWorkLike[]
  favorites          NailWorkFavorite[]
  comments           NailWorkComment[]

  @@index([techId])
  @@index([isVisible])
  @@index([isHomepageFeatured])
}
```

- [ ] **Step 2: 在 schema.prisma 末尾新增 NailWorkReport model**

在 `NailWorkComment` model 之后追加：

```prisma
model NailWorkReport {
  id           Int             @id @default(autoincrement())
  commentId    Int
  reporterId   Int
  reporterType String
  reason       String
  status       String          @default("pending")
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @default(now()) @updatedAt
  comment      NailWorkComment @relation(fields: [commentId], references: [id], onDelete: Cascade)

  @@unique([commentId, reporterId, reporterType])
  @@index([status])
  @@index([commentId])
}
```

- [ ] **Step 3: 在 NailWorkComment model 中添加反向关系**

找到 `model NailWorkComment`，在 `replies NailWorkComment[]` 这行之后添加：
```prisma
reports NailWorkReport[]
```

- [ ] **Step 4: 生成并运行 migration**

```bash
cd backend
npx prisma migrate dev --name add_homepage_featured_and_work_report
```

预期输出：`The following migration(s) have been created and applied from new schema changes`

- [ ] **Step 5: 验证 Prisma Client 已更新**

```bash
cd backend
npx prisma generate
```

预期：`Generated Prisma Client`

- [ ] **Step 6: Commit**

```bash
git add backend/prisma/
git commit -m "feat(db): add isHomepageFeatured to NailWork and NailWorkReport table"
```

---

## Task 2: 权限 Seed — 注册 8 个新权限码

**Files:**
- Modify: `backend/src/production-seed.service.ts`

- [ ] **Step 1: 在 permissions 数组末尾追加 8 条权限**

在 `production-seed.service.ts` 的 `permissions` 数组（搜索 `const permissions = [`），在最后一项 `{ name: '权限查看', code: 'permission:view', ... }` 之后追加：

```typescript
{ name: '作品查看', code: 'work:view', module: 'work', action: 'view' },
{ name: '作品管理', code: 'work:manage', module: 'work', action: 'manage' },
{ name: '评论查看', code: 'comment:view', module: 'comment', action: 'view' },
{ name: '评论管理', code: 'comment:manage', module: 'comment', action: 'manage' },
{ name: '举报查看', code: 'report:view', module: 'report', action: 'view' },
{ name: '举报管理', code: 'report:manage', module: 'report', action: 'manage' },
{ name: '申请查看', code: 'application:view', module: 'application', action: 'view' },
{ name: '申请管理', code: 'application:manage', module: 'application', action: 'manage' },
```

- [ ] **Step 2: 重启后端服务验证 seed 自动运行**

```bash
cd backend
npm run start:dev 2>&1 | grep -E "permission|seed|upsert" | head -20
```

预期：服务启动，`ProductionSeedService` 日志显示权限 upsert 成功。或直接查询数据库：

```bash
cd backend
npx prisma studio
# 在 AdminPermission 表中确认 work:view 等 8 条记录存在
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/production-seed.service.ts
git commit -m "feat(auth): register 8 new RBAC permissions for content moderation"
```

---

## Task 3: admin-works 后端模块

**Files:**
- Create: `backend/src/admin-works/admin-works.module.ts`
- Create: `backend/src/admin-works/admin-works.controller.ts`
- Create: `backend/src/admin-works/admin-works.service.ts`

- [ ] **Step 1: 创建 admin-works.service.ts**

```typescript
// backend/src/admin-works/admin-works.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

const UPLOAD_BASE_URL = process.env.UPLOAD_BASE_URL || 'http://localhost:3000';

@Injectable()
export class AdminWorksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    page?: number;
    pageSize?: number;
    technicianId?: number;
    keyword?: string;
    isVisible?: boolean;
    isHomepageFeatured?: boolean;
  }) {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, params.pageSize || 20);

    const where: any = {};
    if (params.technicianId) where.techId = params.technicianId;
    if (params.isVisible !== undefined) where.isVisible = params.isVisible;
    if (params.isHomepageFeatured !== undefined) where.isHomepageFeatured = params.isHomepageFeatured;
    if (params.keyword) {
      where.OR = [
        { title: { contains: params.keyword } },
        { tags: { contains: params.keyword } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.nailWork.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          technician: { select: { id: true, name: true } },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      this.prisma.nailWork.count({ where }),
    ]);

    return {
      items: items.map(w => this.mapWork(w)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: number) {
    const work = await this.prisma.nailWork.findUnique({
      where: { id },
      include: {
        technician: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true, favorites: true } },
      },
    });
    if (!work) throw new NotFoundException('作品不存在');
    return this.mapWork(work);
  }

  async toggleVisibility(id: number) {
    const work = await this.prisma.nailWork.findUnique({ where: { id } });
    if (!work) throw new NotFoundException('作品不存在');
    const updated = await this.prisma.nailWork.update({
      where: { id },
      data: { isVisible: !work.isVisible },
    });
    return { id, isVisible: updated.isVisible };
  }

  async toggleHomepageFeatured(id: number) {
    const work = await this.prisma.nailWork.findUnique({ where: { id } });
    if (!work) throw new NotFoundException('作品不存在');
    const updated = await this.prisma.nailWork.update({
      where: { id },
      data: { isHomepageFeatured: !work.isHomepageFeatured },
    });
    return { id, isHomepageFeatured: updated.isHomepageFeatured };
  }

  async updateTags(id: number, tags: string) {
    const work = await this.prisma.nailWork.findUnique({ where: { id } });
    if (!work) throw new NotFoundException('作品不存在');
    await this.prisma.nailWork.update({ where: { id }, data: { tags } });
    return { id, tags };
  }

  async remove(id: number) {
    const work = await this.prisma.nailWork.findUnique({ where: { id } });
    if (!work) throw new NotFoundException('作品不存在');
    await this.prisma.nailWork.delete({ where: { id } });
    return { success: true };
  }

  private toAbsoluteUrl(url: string | null): string | null {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${UPLOAD_BASE_URL}${url}`;
  }

  private mapWork(work: any) {
    let imageUrls: string[] = [];
    if (work.images) {
      try {
        const parsed = JSON.parse(work.images);
        if (Array.isArray(parsed)) imageUrls = parsed.filter((u: any) => typeof u === 'string');
      } catch {
        imageUrls = work.images.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }
    imageUrls = imageUrls.map((u) => this.toAbsoluteUrl(u) as string).filter(Boolean);

    return {
      id: work.id,
      title: work.title,
      coverUrl: this.toAbsoluteUrl(work.coverUrl) ?? imageUrls[0] ?? null,
      imageUrls,
      description: work.description,
      tags: work.tags ? work.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      price: work.price,
      isVisible: work.isVisible,
      isPinned: work.isPinned,
      isFeatured: work.isFeatured,
      isHomepageFeatured: work.isHomepageFeatured,
      viewCount: work.viewCount,
      likeCount: work._count?.likes ?? 0,
      commentCount: work._count?.comments ?? 0,
      favoriteCount: work._count?.favorites ?? 0,
      technician: work.technician,
      createdAt: work.createdAt,
      updatedAt: work.updatedAt,
    };
  }
}
```

- [ ] **Step 2: 创建 admin-works.controller.ts**

```typescript
// backend/src/admin-works/admin-works.controller.ts
import {
  Controller, Get, Param, Patch, Delete, Query,
  ParseIntPipe, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';
import { AdminWorksService } from './admin-works.service';

@ApiTags('管理-作品')
@ApiBearerAuth()
@Controller('admin/works')
@UseGuards(JwtAuthGuard)
export class AdminWorksController {
  constructor(private readonly service: AdminWorksService) {}

  @Get()
  @Permissions('work:view')
  @ApiOperation({ summary: '全平台作品列表' })
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('technicianId') technicianId?: string,
    @Query('keyword') keyword?: string,
    @Query('isVisible') isVisible?: string,
    @Query('isHomepageFeatured') isHomepageFeatured?: string,
  ) {
    return this.service.findAll({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      technicianId: technicianId ? Number(technicianId) : undefined,
      keyword,
      isVisible: isVisible === 'true' ? true : isVisible === 'false' ? false : undefined,
      isHomepageFeatured: isHomepageFeatured === 'true' ? true : isHomepageFeatured === 'false' ? false : undefined,
    });
  }

  @Get(':id')
  @Permissions('work:view')
  @ApiOperation({ summary: '作品详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id/visibility')
  @Permissions('work:manage')
  @ApiOperation({ summary: '切换作品可见性' })
  toggleVisibility(@Param('id', ParseIntPipe) id: number) {
    return this.service.toggleVisibility(id);
  }

  @Patch(':id/homepage-featured')
  @Permissions('work:manage')
  @ApiOperation({ summary: '切换官网精选' })
  toggleHomepageFeatured(@Param('id', ParseIntPipe) id: number) {
    return this.service.toggleHomepageFeatured(id);
  }

  @Patch(':id/tags')
  @Permissions('work:manage')
  @ApiOperation({ summary: '更新作品标签' })
  updateTags(
    @Param('id', ParseIntPipe) id: number,
    @Body('tags') tags: string,
  ) {
    return this.service.updateTags(id, tags);
  }

  @Delete(':id')
  @Permissions('work:manage')
  @ApiOperation({ summary: '删除作品' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
```

- [ ] **Step 3: 创建 admin-works.module.ts**

```typescript
// backend/src/admin-works/admin-works.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminWorksController } from './admin-works.controller';
import { AdminWorksService } from './admin-works.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminWorksController],
  providers: [AdminWorksService],
})
export class AdminWorksModule {}
```

- [ ] **Step 4: 在 app.module.ts 注册 AdminWorksModule**

在 `app.module.ts` 的 imports 数组中，在 `AdminInviteKeysModule` 之后添加：
```typescript
import { AdminWorksModule } from './admin-works/admin-works.module';
// ... 在 imports 数组中：
AdminWorksModule,
```

- [ ] **Step 5: 验证后端编译并测试接口**

```bash
cd backend
npm run build 2>&1 | tail -5
```

预期：`Successfully compiled`（无错误）

手动测试（需要有效 JWT）：
```bash
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/v1/admin/works?page=1&pageSize=5
```
预期：`{ "items": [...], "total": N, "page": 1, "pageSize": 5 }`

- [ ] **Step 6: Commit**

```bash
git add backend/src/admin-works/ backend/src/app.module.ts
git commit -m "feat(admin): add admin-works module with CMS endpoints"
```

---

## Task 4: admin-comments 后端模块

**Files:**
- Create: `backend/src/admin-comments/admin-comments.module.ts`
- Create: `backend/src/admin-comments/admin-comments.controller.ts`
- Create: `backend/src/admin-comments/admin-comments.service.ts`

- [ ] **Step 1: 创建 admin-comments.service.ts**

```typescript
// backend/src/admin-comments/admin-comments.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AdminCommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    status?: 'normal' | 'hidden';
    authorType?: 'client' | 'technician';
  }) {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, params.pageSize || 20);

    const where: any = {};
    if (params.status === 'normal') where.isHidden = false;
    if (params.status === 'hidden') where.isHidden = true;
    if (params.authorType === 'client') {
      where.clientId = { not: null };
      where.technicianId = null;
    }
    if (params.authorType === 'technician') {
      where.technicianId = { not: null };
      where.clientId = null;
    }
    if (params.keyword) {
      where.content = { contains: params.keyword };
    }

    const [items, total] = await Promise.all([
      this.prisma.nailWorkComment.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, nickname: true } },
          technician: { select: { id: true, name: true } },
          work: {
            select: {
              id: true,
              title: true,
              technician: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.nailWorkComment.count({ where }),
    ]);

    return {
      items: items.map((c) => this.mapComment(c)),
      total,
      page,
      pageSize,
    };
  }

  async toggleHide(id: number) {
    const comment = await this.prisma.nailWorkComment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('评论不存在');
    const updated = await this.prisma.nailWorkComment.update({
      where: { id },
      data: { isHidden: !comment.isHidden },
    });
    return { id, isHidden: updated.isHidden };
  }

  async remove(id: number) {
    const comment = await this.prisma.nailWorkComment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('评论不存在');
    // Admin hard-deletes regardless of replies
    await this.prisma.nailWorkComment.delete({ where: { id } });
    return { success: true };
  }

  private mapComment(c: any) {
    const authorType = c.technicianId ? 'technician' : 'client';
    const authorName = authorType === 'technician'
      ? (c.technician?.name ?? '美甲师')
      : (c.client?.nickname ?? '客户');

    return {
      id: c.id,
      workId: c.workId,
      parentId: c.parentId,
      content: c.content,
      isHidden: c.isHidden,
      isPinned: c.isPinned,
      authorType,
      authorName,
      work: c.work
        ? {
            id: c.work.id,
            title: c.work.title,
            technicianName: c.work.technician?.name ?? '',
          }
        : null,
      createdAt: c.createdAt,
    };
  }
}
```

- [ ] **Step 2: 创建 admin-comments.controller.ts**

```typescript
// backend/src/admin-comments/admin-comments.controller.ts
import {
  Controller, Get, Param, Patch, Delete,
  Query, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';
import { AdminCommentsService } from './admin-comments.service';

@ApiTags('管理-评论')
@ApiBearerAuth()
@Controller('admin/comments')
@UseGuards(JwtAuthGuard)
export class AdminCommentsController {
  constructor(private readonly service: AdminCommentsService) {}

  @Get()
  @Permissions('comment:view')
  @ApiOperation({ summary: '全平台评论列表' })
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('status') status?: 'normal' | 'hidden',
    @Query('authorType') authorType?: 'client' | 'technician',
  ) {
    return this.service.findAll({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      keyword,
      status,
      authorType,
    });
  }

  @Patch(':id/hide')
  @Permissions('comment:manage')
  @ApiOperation({ summary: '切换评论隐藏状态' })
  toggleHide(@Param('id', ParseIntPipe) id: number) {
    return this.service.toggleHide(id);
  }

  @Delete(':id')
  @Permissions('comment:manage')
  @ApiOperation({ summary: '强制删除评论' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
```

- [ ] **Step 3: 创建 admin-comments.module.ts**

```typescript
// backend/src/admin-comments/admin-comments.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminCommentsController } from './admin-comments.controller';
import { AdminCommentsService } from './admin-comments.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminCommentsController],
  providers: [AdminCommentsService],
})
export class AdminCommentsModule {}
```

- [ ] **Step 4: 在 app.module.ts 注册 AdminCommentsModule**

```typescript
import { AdminCommentsModule } from './admin-comments/admin-comments.module';
// 在 imports 数组中 AdminWorksModule 后面添加：
AdminCommentsModule,
```

- [ ] **Step 5: 编译验证**

```bash
cd backend && npm run build 2>&1 | tail -5
```

预期：`Successfully compiled`

- [ ] **Step 6: Commit**

```bash
git add backend/src/admin-comments/ backend/src/app.module.ts
git commit -m "feat(admin): add admin-comments module"
```

---

## Task 5: admin-reports 后端模块

**Files:**
- Create: `backend/src/admin-reports/admin-reports.module.ts`
- Create: `backend/src/admin-reports/admin-reports.controller.ts`
- Create: `backend/src/admin-reports/admin-reports.service.ts`

- [ ] **Step 1: 创建 admin-reports.service.ts**

```typescript
// backend/src/admin-reports/admin-reports.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AdminReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    page?: number;
    pageSize?: number;
    status?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, params.pageSize || 20);
    const where: any = params.status ? { status: params.status } : {};

    const [items, total] = await Promise.all([
      this.prisma.nailWorkReport.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [
          { status: 'asc' },   // pending first
          { createdAt: 'desc' },
        ],
        include: {
          comment: {
            select: {
              id: true,
              content: true,
              work: { select: { id: true, title: true } },
            },
          },
        },
      }),
      this.prisma.nailWorkReport.count({ where }),
    ]);

    const pendingCount = await this.prisma.nailWorkReport.count({
      where: { status: 'pending' },
    });

    return { items, total, page, pageSize, pendingCount };
  }

  async resolve(id: number) {
    const report = await this.prisma.nailWorkReport.findUnique({
      where: { id },
      include: { comment: true },
    });
    if (!report) throw new NotFoundException('举报记录不存在');

    // Delete the reported comment (admin hard delete)
    await this.prisma.nailWorkComment.delete({ where: { id: report.commentId } });

    // Mark all reports for this comment as resolved
    await this.prisma.nailWorkReport.updateMany({
      where: { commentId: report.commentId },
      data: { status: 'resolved' },
    });

    return { success: true };
  }

  async dismiss(id: number) {
    const report = await this.prisma.nailWorkReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('举报记录不存在');
    await this.prisma.nailWorkReport.update({
      where: { id },
      data: { status: 'dismissed' },
    });
    return { success: true };
  }
}
```

- [ ] **Step 2: 创建 admin-reports.controller.ts**

```typescript
// backend/src/admin-reports/admin-reports.controller.ts
import {
  Controller, Get, Param, Patch,
  Query, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';
import { AdminReportsService } from './admin-reports.service';

@ApiTags('管理-举报')
@ApiBearerAuth()
@Controller('admin/reports')
@UseGuards(JwtAuthGuard)
export class AdminReportsController {
  constructor(private readonly service: AdminReportsService) {}

  @Get()
  @Permissions('report:view')
  @ApiOperation({ summary: '举报列表' })
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status,
    });
  }

  @Patch(':id/resolve')
  @Permissions('report:manage')
  @ApiOperation({ summary: '处置举报（删除评论）' })
  resolve(@Param('id', ParseIntPipe) id: number) {
    return this.service.resolve(id);
  }

  @Patch(':id/dismiss')
  @Permissions('report:manage')
  @ApiOperation({ summary: '驳回举报' })
  dismiss(@Param('id', ParseIntPipe) id: number) {
    return this.service.dismiss(id);
  }
}
```

- [ ] **Step 3: 创建 admin-reports.module.ts**

```typescript
// backend/src/admin-reports/admin-reports.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from './admin-reports.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminReportsController],
  providers: [AdminReportsService],
})
export class AdminReportsModule {}
```

- [ ] **Step 4: 在 app.module.ts 注册 AdminReportsModule**

```typescript
import { AdminReportsModule } from './admin-reports/admin-reports.module';
// 在 imports 数组中添加：
AdminReportsModule,
```

- [ ] **Step 5: 编译验证**

```bash
cd backend && npm run build 2>&1 | tail -5
```

预期：`Successfully compiled`

- [ ] **Step 6: Commit**

```bash
git add backend/src/admin-reports/ backend/src/app.module.ts
git commit -m "feat(admin): add admin-reports module for report queue management"
```

---

## Task 6: 公开精选作品 API

**Files:**
- Modify: `backend/src/technician-works/public-works.controller.ts`

- [ ] **Step 1: 读取现有 public-works.controller.ts 了解已有路由**

```bash
cat backend/src/technician-works/public-works.controller.ts
```

- [ ] **Step 2: 在 public-works.controller.ts 中新增 featured-works 路由**

在现有 `PublicWorksController` 类中追加以下方法（在 `constructor` 后，最后一个方法之后）：

```typescript
@Get('featured-works')
@ApiOperation({ summary: '官网精选作品（公开）' })
async getFeaturedWorks(
  @Query('limit') limit?: string,
) {
  const take = Math.min(50, Math.max(1, Number(limit) || 20));
  const UPLOAD_BASE_URL = process.env.UPLOAD_BASE_URL || 'http://localhost:3000';

  const works = await this.prisma.nailWork.findMany({
    where: { isHomepageFeatured: true, isVisible: true },
    take,
    orderBy: { updatedAt: 'desc' },
    include: {
      technician: { select: { name: true, avatarUrl: true } },
      _count: { select: { likes: true } },
    },
  });

  return works.map((w) => {
    const toAbs = (url: string | null) =>
      url ? (url.startsWith('http') ? url : `${UPLOAD_BASE_URL}${url}`) : null;

    let imageUrls: string[] = [];
    if (w.images) {
      try {
        const parsed = JSON.parse(w.images);
        if (Array.isArray(parsed)) imageUrls = parsed.map(toAbs).filter(Boolean) as string[];
      } catch {
        imageUrls = w.images.split(',').map((s) => toAbs(s.trim())).filter(Boolean) as string[];
      }
    }

    return {
      id: w.id,
      title: w.title,
      coverUrl: toAbs(w.coverUrl) ?? imageUrls[0] ?? null,
      imageUrls,
      tags: w.tags ? w.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      technicianName: w.technician?.name ?? '',
      technicianAvatarUrl: toAbs(w.technician?.avatarUrl ?? null),
      likeCount: w._count.likes,
    };
  });
}
```

注意：该 controller 需要 `PrismaService` 注入。检查现有 constructor 是否已注入 `PrismaService`，如没有则在 constructor 中添加：
```typescript
constructor(private readonly prisma: PrismaService) {}
```
并在 import 中引入：
```typescript
import { PrismaService } from '../common/prisma/prisma.service';
```

- [ ] **Step 3: 检查 public-works 路由是否已在 app 路由前缀下**

```bash
grep -n "prefix\|global\|setGlobalPrefix" backend/src/main.ts
```

确认路由会被注册为 `/api/v1/public/featured-works`（根据项目的 globalPrefix 配置）。

- [ ] **Step 4: 编译验证**

```bash
cd backend && npm run build 2>&1 | tail -5
```

- [ ] **Step 5: 手动测试（无需认证）**

```bash
curl http://localhost:3000/api/v1/public/featured-works?limit=5
```

预期：返回 JSON 数组（初始为空数组 `[]` 是正常的，因为还没有 isHomepageFeatured=true 的作品）。

- [ ] **Step 6: Commit**

```bash
git add backend/src/technician-works/public-works.controller.ts
git commit -m "feat(public): add GET /public/featured-works endpoint for official website"
```

---

## Task 7: 客户端举报接口（client-reports 模块）

**Files:**
- Create: `backend/src/client-reports/client-reports.module.ts`
- Create: `backend/src/client-reports/client-reports.controller.ts`
- Create: `backend/src/client-reports/client-reports.service.ts`

- [ ] **Step 1: 创建 client-reports.service.ts**

```typescript
// backend/src/client-reports/client-reports.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

const VALID_REASONS = ['spam', 'inappropriate', 'harassment', 'other'];

@Injectable()
export class ClientReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(params: {
    commentId: number;
    reporterId: number;
    reporterType: 'client';
    reason: string;
  }) {
    if (!VALID_REASONS.includes(params.reason)) {
      throw new BadRequestException('无效的举报原因');
    }

    const comment = await this.prisma.nailWorkComment.findUnique({
      where: { id: params.commentId },
    });
    if (!comment) throw new BadRequestException('评论不存在');

    // Unique constraint handles duplicate — catch and return friendly message
    try {
      await this.prisma.nailWorkReport.create({
        data: {
          commentId: params.commentId,
          reporterId: params.reporterId,
          reporterType: params.reporterType,
          reason: params.reason,
          status: 'pending',
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        return { success: true, alreadyReported: true };
      }
      throw e;
    }

    return { success: true, alreadyReported: false };
  }
}
```

- [ ] **Step 2: 创建 client-reports.controller.ts**

```typescript
// backend/src/client-reports/client-reports.controller.ts
import {
  Controller, Post, Body, Req, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { ClientReportsService } from './client-reports.service';

@ApiTags('客户端-举报')
@ApiBearerAuth()
@Controller('client/reports')
@UseGuards(ClientJwtAuthGuard)
export class ClientReportsController {
  constructor(private readonly service: ClientReportsService) {}

  @Post()
  @ApiOperation({ summary: '举报评论' })
  createReport(
    @Req() req: { user: { clientId: number } },
    @Body() body: { commentId: number; reason: string },
  ) {
    return this.service.createReport({
      commentId: body.commentId,
      reporterId: req.user.clientId,
      reporterType: 'client',
      reason: body.reason,
    });
  }
}
```

- [ ] **Step 3: 验证 ClientJwtAuthGuard 中 user 的字段名**

```bash
cat backend/src/client-auth/client-jwt.strategy.ts
```

注意 `validate()` 方法返回的字段名（可能是 `clientId` 或 `userId`），据此调整 controller 中的 `req.user.clientId`。

- [ ] **Step 4: 创建 client-reports.module.ts**

```typescript
// backend/src/client-reports/client-reports.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ClientAuthModule } from '../client-auth/client-auth.module';
import { ClientReportsController } from './client-reports.controller';
import { ClientReportsService } from './client-reports.service';

@Module({
  imports: [PrismaModule, ClientAuthModule],
  controllers: [ClientReportsController],
  providers: [ClientReportsService],
})
export class ClientReportsModule {}
```

- [ ] **Step 5: 在 app.module.ts 注册 ClientReportsModule**

```typescript
import { ClientReportsModule } from './client-reports/client-reports.module';
// 在 imports 数组中添加：
ClientReportsModule,
```

- [ ] **Step 6: 编译验证**

```bash
cd backend && npm run build 2>&1 | tail -5
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/client-reports/ backend/src/app.module.ts
git commit -m "feat(client): add POST /client/reports endpoint for comment reporting"
```

---

## Task 8: admin-frontend — artistApplication service + ArtistApplications 页面

**Files:**
- Create: `admin-frontend/src/services/artistApplication.ts`
- Create: `admin-frontend/src/pages/ArtistApplications.tsx`

- [ ] **Step 1: 创建 artistApplication.ts service**

```typescript
// admin-frontend/src/services/artistApplication.ts
import api from './api';

export interface ArtistApplication {
  id: number;
  name: string;
  phone: string;
  city?: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewNote?: string;
}

export const artistApplicationService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => {
    const response = await api.get('/artist-applications', { params });
    return response.data as { data: ArtistApplication[]; total: number; page: number };
  },

  getById: async (id: number): Promise<ArtistApplication> => {
    const response = await api.get(`/artist-applications/${id}`);
    return response.data;
  },

  approve: async (id: number): Promise<{ success: boolean }> => {
    const response = await api.patch(`/artist-applications/${id}/approve`);
    return response.data;
  },

  reject: async (id: number, note?: string): Promise<{ success: boolean }> => {
    const response = await api.patch(`/artist-applications/${id}/reject`, { note });
    return response.data;
  },
};
```

- [ ] **Step 2: 创建 ArtistApplications.tsx**

```tsx
// admin-frontend/src/pages/ArtistApplications.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Tag, Button, Modal, Tabs, Space, Descriptions,
  Input, message, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import {
  artistApplicationService,
  type ArtistApplication,
} from '../services/artistApplication';

const { Text } = Typography;

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  pending: { text: '待审核', color: 'orange' },
  approved: { text: '已通过', color: 'green' },
  rejected: { text: '已拒绝', color: 'red' },
};

const ArtistApplications: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [data, setData] = useState<ArtistApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [current, setCurrent] = useState<ArtistApplication | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await artistApplicationService.getAll({
        page,
        limit: 20,
        status: activeTab,
      });
      setData(res.data ?? []);
      setTotal(res.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: number) => {
    await artistApplicationService.approve(id);
    message.success('已审核通过，美甲师账号已创建');
    load();
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    await artistApplicationService.reject(rejectTarget, rejectNote);
    message.success('已拒绝申请');
    setRejectModalVisible(false);
    setRejectNote('');
    load();
  };

  const columns: ColumnsType<ArtistApplication> = [
    { title: '姓名', dataIndex: 'name', width: 100 },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 130,
      render: (v: string) => v.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
    },
    { title: '城市', dataIndex: 'city', width: 90 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: string) => (
        <Tag color={STATUS_MAP[s]?.color}>{STATUS_MAP[s]?.text}</Tag>
      ),
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      width: 120,
      render: (v: string) => new Date(v).toLocaleDateString(),
    },
    {
      title: '操作',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => { setCurrent(record); setDetailVisible(true); }}
          >
            详情
          </Button>
          {record.status === 'pending' && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => handleApprove(record.id)}
              >
                通过
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => {
                  setRejectTarget(record.id);
                  setRejectModalVisible(true);
                }}
              >
                拒绝
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Tabs
        activeKey={activeTab}
        onChange={(k) => { setActiveTab(k); setPage(1); }}
        items={[
          { key: 'pending', label: '待审核' },
          { key: 'approved', label: '已通过' },
          { key: 'rejected', label: '已拒绝' },
        ]}
      />
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: setPage,
          showTotal: (t) => `共 ${t} 条`,
        }}
      />

      {/* Detail Modal */}
      <Modal
        title="申请详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={560}
      >
        {current && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="姓名">{current.name}</Descriptions.Item>
            <Descriptions.Item label="手机号">{current.phone}</Descriptions.Item>
            <Descriptions.Item label="城市">{current.city ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="自我介绍">
              <Text>{current.description ?? '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={STATUS_MAP[current.status]?.color}>
                {STATUS_MAP[current.status]?.text}
              </Tag>
            </Descriptions.Item>
            {current.reviewNote && (
              <Descriptions.Item label="审核备注">{current.reviewNote}</Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        title="拒绝申请"
        open={rejectModalVisible}
        onOk={handleRejectConfirm}
        onCancel={() => { setRejectModalVisible(false); setRejectNote(''); }}
        okText="确认拒绝"
        okButtonProps={{ danger: true }}
      >
        <Input.TextArea
          rows={3}
          placeholder="请输入拒绝原因（可选）"
          value={rejectNote}
          onChange={(e) => setRejectNote(e.target.value)}
        />
      </Modal>
    </>
  );
};

export default ArtistApplications;
```

- [ ] **Step 3: 编译检查**

```bash
cd admin-frontend && npm run build 2>&1 | tail -10
```

预期：无 TypeScript 错误。

- [ ] **Step 4: Commit**

```bash
git add admin-frontend/src/services/artistApplication.ts admin-frontend/src/pages/ArtistApplications.tsx
git commit -m "feat(admin-ui): add ArtistApplications page"
```

---

## Task 9: admin-frontend — adminWork service + Works 页面

**Files:**
- Create: `admin-frontend/src/services/adminWork.ts`
- Create: `admin-frontend/src/pages/Works.tsx`

- [ ] **Step 1: 创建 adminWork.ts service**

```typescript
// admin-frontend/src/services/adminWork.ts
import api from './api';

export interface AdminWork {
  id: number;
  title: string | null;
  coverUrl: string | null;
  imageUrls: string[];
  description: string | null;
  tags: string[];
  price: number | null;
  isVisible: boolean;
  isHomepageFeatured: boolean;
  isFeatured: boolean;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  technician: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export const adminWorkService = {
  getAll: async (params?: {
    page?: number;
    pageSize?: number;
    technicianId?: number;
    keyword?: string;
    isVisible?: boolean;
    isHomepageFeatured?: boolean;
  }) => {
    const response = await api.get('/admin/works', { params });
    return response.data as { items: AdminWork[]; total: number; page: number; pageSize: number };
  },

  getById: async (id: number): Promise<AdminWork> => {
    const response = await api.get(`/admin/works/${id}`);
    return response.data;
  },

  toggleVisibility: async (id: number): Promise<{ id: number; isVisible: boolean }> => {
    const response = await api.patch(`/admin/works/${id}/visibility`);
    return response.data;
  },

  toggleHomepageFeatured: async (id: number): Promise<{ id: number; isHomepageFeatured: boolean }> => {
    const response = await api.patch(`/admin/works/${id}/homepage-featured`);
    return response.data;
  },

  updateTags: async (id: number, tags: string): Promise<{ id: number; tags: string }> => {
    const response = await api.patch(`/admin/works/${id}/tags`, { tags });
    return response.data;
  },

  remove: async (id: number): Promise<{ success: boolean }> => {
    const response = await api.delete(`/admin/works/${id}`);
    return response.data;
  },
};
```

- [ ] **Step 2: 创建 Works.tsx**

```tsx
// admin-frontend/src/pages/Works.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Tag, Button, Space, Input, Select, Switch,
  Modal, message, Drawer, Image, Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EyeOutlined, StarOutlined } from '@ant-design/icons';
import { adminWorkService, type AdminWork } from '../services/adminWork';

const { Search } = Input;

const Works: React.FC = () => {
  const [data, setData] = useState<AdminWork[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [isVisibleFilter, setIsVisibleFilter] = useState<boolean | undefined>(undefined);
  const [isFeaturedFilter, setIsFeaturedFilter] = useState<boolean | undefined>(undefined);
  const [detailWork, setDetailWork] = useState<AdminWork | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminWorkService.getAll({
        page,
        pageSize: 20,
        keyword: keyword || undefined,
        isVisible: isVisibleFilter,
        isHomepageFeatured: isFeaturedFilter,
      });
      setData(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page, keyword, isVisibleFilter, isFeaturedFilter]);

  useEffect(() => { load(); }, [load]);

  const handleToggleVisibility = async (id: number) => {
    await adminWorkService.toggleVisibility(id);
    load();
  };

  const handleToggleFeatured = async (id: number) => {
    await adminWorkService.toggleHomepageFeatured(id);
    load();
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除作品后不可恢复，是否继续？',
      okText: '删除',
      okButtonProps: { danger: true },
      onOk: async () => {
        await adminWorkService.remove(id);
        message.success('已删除');
        load();
      },
    });
  };

  const columns: ColumnsType<AdminWork> = [
    {
      title: '封面',
      width: 64,
      render: (_, r) =>
        r.coverUrl ? (
          <Image src={r.coverUrl} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 4 }} />
        ) : (
          <div style={{ width: 48, height: 48, background: '#f5f5f5', borderRadius: 4 }} />
        ),
    },
    {
      title: '标题 / 标签',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.title ?? '无标题'}</div>
          <div style={{ marginTop: 4 }}>
            {r.tags.slice(0, 3).map((t) => (
              <Tag key={t} style={{ fontSize: 11 }}>{t}</Tag>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: '美甲师',
      width: 100,
      render: (_, r) => r.technician?.name ?? '—',
    },
    {
      title: '点赞 / 评论',
      width: 100,
      render: (_, r) => `${r.likeCount} / ${r.commentCount}`,
    },
    {
      title: '可见',
      width: 70,
      render: (_, r) => (
        <Switch
          size="small"
          checked={r.isVisible}
          onChange={() => handleToggleVisibility(r.id)}
        />
      ),
    },
    {
      title: '官网精选',
      width: 90,
      render: (_, r) => (
        <Switch
          size="small"
          checked={r.isHomepageFeatured}
          onChange={() => handleToggleFeatured(r.id)}
          checkedChildren="精选"
          unCheckedChildren="否"
        />
      ),
    },
    {
      title: '操作',
      width: 120,
      render: (_, r) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => { setDetailWork(r); setDrawerOpen(true); }}
            />
          </Tooltip>
          <Tooltip title="删除作品">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(r.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Search
          placeholder="搜索标题/标签"
          allowClear
          style={{ width: 200 }}
          onSearch={(v) => { setKeyword(v); setPage(1); }}
        />
        <Select
          style={{ width: 130 }}
          placeholder="可见性"
          allowClear
          onChange={(v) => { setIsVisibleFilter(v); setPage(1); }}
          options={[
            { value: true, label: '可见' },
            { value: false, label: '已下架' },
          ]}
        />
        <Select
          style={{ width: 130 }}
          placeholder="官网精选"
          allowClear
          onChange={(v) => { setIsFeaturedFilter(v); setPage(1); }}
          options={[
            { value: true, label: '精选中' },
            { value: false, label: '未精选' },
          ]}
        />
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: setPage,
          showTotal: (t) => `共 ${t} 条`,
        }}
      />

      <Drawer
        title={detailWork?.title ?? '作品详情'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={480}
      >
        {detailWork && (
          <div>
            <Image.PreviewGroup>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {detailWork.imageUrls.map((url, i) => (
                  <Image key={i} src={url} width={100} height={100} style={{ objectFit: 'cover', borderRadius: 4 }} />
                ))}
              </div>
            </Image.PreviewGroup>
            <div style={{ marginBottom: 12 }}>
              <strong>标签：</strong>
              {detailWork.tags.map((t) => <Tag key={t}>{t}</Tag>)}
            </div>
            <div style={{ marginBottom: 12 }}>
              <strong>官网精选：</strong>
              <Switch
                checked={detailWork.isHomepageFeatured}
                onChange={async () => {
                  const res = await adminWorkService.toggleHomepageFeatured(detailWork.id);
                  setDetailWork({ ...detailWork, isHomepageFeatured: res.isHomepageFeatured });
                  load();
                }}
                checkedChildren={<StarOutlined />}
              />
            </div>
            {detailWork.description && (
              <div>
                <strong>描述：</strong>
                <p>{detailWork.description}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </>
  );
};

export default Works;
```

- [ ] **Step 3: 编译检查**

```bash
cd admin-frontend && npm run build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add admin-frontend/src/services/adminWork.ts admin-frontend/src/pages/Works.tsx
git commit -m "feat(admin-ui): add Works page with CMS operations and homepage featured toggle"
```

---

## Task 10: admin-frontend — adminComment service + Comments 页面

**Files:**
- Create: `admin-frontend/src/services/adminComment.ts`
- Create: `admin-frontend/src/pages/Comments.tsx`

- [ ] **Step 1: 创建 adminComment.ts service**

```typescript
// admin-frontend/src/services/adminComment.ts
import api from './api';

export interface AdminComment {
  id: number;
  workId: number;
  parentId: number | null;
  content: string;
  isHidden: boolean;
  isPinned: boolean;
  authorType: 'client' | 'technician';
  authorName: string;
  work: { id: number; title: string; technicianName: string } | null;
  createdAt: string;
}

export const adminCommentService = {
  getAll: async (params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    status?: 'normal' | 'hidden';
    authorType?: 'client' | 'technician';
  }) => {
    const response = await api.get('/admin/comments', { params });
    return response.data as { items: AdminComment[]; total: number; page: number; pageSize: number };
  },

  toggleHide: async (id: number): Promise<{ id: number; isHidden: boolean }> => {
    const response = await api.patch(`/admin/comments/${id}/hide`);
    return response.data;
  },

  remove: async (id: number): Promise<{ success: boolean }> => {
    const response = await api.delete(`/admin/comments/${id}`);
    return response.data;
  },
};
```

- [ ] **Step 2: 创建 Comments.tsx**

```tsx
// admin-frontend/src/pages/Comments.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Tag, Button, Space, Input, Select, Modal, message, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { adminCommentService, type AdminComment } from '../services/adminComment';

const { Search } = Input;
const { Text } = Typography;

const Comments: React.FC = () => {
  const [data, setData] = useState<AdminComment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'normal' | 'hidden' | undefined>(undefined);
  const [authorFilter, setAuthorFilter] = useState<'client' | 'technician' | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminCommentService.getAll({
        page,
        pageSize: 20,
        keyword: keyword || undefined,
        status: statusFilter,
        authorType: authorFilter,
      });
      setData(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page, keyword, statusFilter, authorFilter]);

  useEffect(() => { load(); }, [load]);

  const handleToggleHide = async (id: number) => {
    await adminCommentService.toggleHide(id);
    load();
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除评论',
      content: '超管强制删除，此操作不可恢复',
      okText: '删除',
      okButtonProps: { danger: true },
      onOk: async () => {
        await adminCommentService.remove(id);
        message.success('已删除');
        load();
      },
    });
  };

  const columns: ColumnsType<AdminComment> = [
    {
      title: '评论内容',
      render: (_, r) => (
        <Text style={{ color: r.isHidden ? '#bbb' : undefined }}>
          {r.content.length > 60 ? r.content.slice(0, 60) + '…' : r.content}
        </Text>
      ),
    },
    {
      title: '作者',
      width: 130,
      render: (_, r) => (
        <Space size={4}>
          <Tag color={r.authorType === 'technician' ? 'purple' : 'blue'} style={{ fontSize: 11 }}>
            {r.authorType === 'technician' ? '美甲师' : '客户'}
          </Tag>
          {r.authorName}
        </Space>
      ),
    },
    {
      title: '所属作品',
      width: 130,
      render: (_, r) => r.work ? (
        <div>
          <div style={{ fontSize: 12 }}>{r.work.title ?? '无标题'}</div>
          <div style={{ fontSize: 11, color: '#888' }}>{r.work.technicianName}</div>
        </div>
      ) : '—',
    },
    {
      title: '状态',
      width: 80,
      render: (_, r) => r.isHidden
        ? <Tag color="red">已隐藏</Tag>
        : <Tag color="green">正常</Tag>,
    },
    {
      title: '时间',
      width: 100,
      render: (_, r) => new Date(r.createdAt).toLocaleDateString(),
    },
    {
      title: '操作',
      width: 120,
      render: (_, r) => (
        <Space>
          <Button
            size="small"
            icon={r.isHidden ? <EyeOutlined /> : <EyeInvisibleOutlined />}
            onClick={() => handleToggleHide(r.id)}
          >
            {r.isHidden ? '恢复' : '隐藏'}
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(r.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Search
          placeholder="搜索评论内容"
          allowClear
          style={{ width: 220 }}
          onSearch={(v) => { setKeyword(v); setPage(1); }}
        />
        <Select
          style={{ width: 120 }}
          placeholder="状态"
          allowClear
          onChange={(v) => { setStatusFilter(v); setPage(1); }}
          options={[
            { value: 'normal', label: '正常' },
            { value: 'hidden', label: '已隐藏' },
          ]}
        />
        <Select
          style={{ width: 120 }}
          placeholder="作者类型"
          allowClear
          onChange={(v) => { setAuthorFilter(v); setPage(1); }}
          options={[
            { value: 'client', label: '客户' },
            { value: 'technician', label: '美甲师' },
          ]}
        />
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: setPage,
          showTotal: (t) => `共 ${t} 条`,
        }}
      />
    </>
  );
};

export default Comments;
```

- [ ] **Step 3: 编译检查**

```bash
cd admin-frontend && npm run build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add admin-frontend/src/services/adminComment.ts admin-frontend/src/pages/Comments.tsx
git commit -m "feat(admin-ui): add Comments page with hide/delete moderation"
```

---

## Task 11: admin-frontend — adminReport service + Reports 页面

**Files:**
- Create: `admin-frontend/src/services/adminReport.ts`
- Create: `admin-frontend/src/pages/Reports.tsx`

- [ ] **Step 1: 创建 adminReport.ts service**

```typescript
// admin-frontend/src/services/adminReport.ts
import api from './api';

export interface AdminReport {
  id: number;
  commentId: number;
  reporterId: number;
  reporterType: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
  comment: {
    id: number;
    content: string;
    work: { id: number; title: string | null } | null;
  } | null;
}

const REASON_MAP: Record<string, string> = {
  spam: '广告/垃圾信息',
  inappropriate: '不雅内容',
  harassment: '骚扰',
  other: '其他',
};

export { REASON_MAP };

export const adminReportService = {
  getAll: async (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
  }) => {
    const response = await api.get('/admin/reports', { params });
    return response.data as {
      items: AdminReport[];
      total: number;
      page: number;
      pageSize: number;
      pendingCount: number;
    };
  },

  resolve: async (id: number): Promise<{ success: boolean }> => {
    const response = await api.patch(`/admin/reports/${id}/resolve`);
    return response.data;
  },

  dismiss: async (id: number): Promise<{ success: boolean }> => {
    const response = await api.patch(`/admin/reports/${id}/dismiss`);
    return response.data;
  },
};
```

- [ ] **Step 2: 创建 Reports.tsx**

```tsx
// admin-frontend/src/pages/Reports.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Tag, Button, Space, Tabs, Badge, message, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { adminReportService, REASON_MAP, type AdminReport } from '../services/adminReport';

const { Text } = Typography;

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  pending: { text: '待处理', color: 'red' },
  resolved: { text: '已处置', color: 'green' },
  dismissed: { text: '已驳回', color: 'default' },
};

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [data, setData] = useState<AdminReport[]>([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminReportService.getAll({
        page,
        pageSize: 20,
        status: activeTab === 'all' ? undefined : activeTab,
      });
      setData(res.items);
      setTotal(res.total);
      setPendingCount(res.pendingCount);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => { load(); }, [load]);

  const handleResolve = async (id: number) => {
    await adminReportService.resolve(id);
    message.success('已删除评论并标记为已处置');
    load();
  };

  const handleDismiss = async (id: number) => {
    await adminReportService.dismiss(id);
    message.success('已驳回举报');
    load();
  };

  const columns: ColumnsType<AdminReport> = [
    {
      title: '被举报评论',
      render: (_, r) => (
        <Text>
          {(r.comment?.content ?? '').length > 60
            ? (r.comment?.content ?? '').slice(0, 60) + '…'
            : (r.comment?.content ?? '评论已删除')}
        </Text>
      ),
    },
    {
      title: '所属作品',
      width: 130,
      render: (_, r) => r.comment?.work?.title ?? '—',
    },
    {
      title: '举报原因',
      width: 140,
      render: (_, r) => (
        <Tag color="orange">{REASON_MAP[r.reason] ?? r.reason}</Tag>
      ),
    },
    {
      title: '状态',
      width: 90,
      render: (_, r) => (
        <Tag color={STATUS_MAP[r.status]?.color}>{STATUS_MAP[r.status]?.text}</Tag>
      ),
    },
    {
      title: '举报时间',
      width: 110,
      render: (_, r) => new Date(r.createdAt).toLocaleDateString(),
    },
    {
      title: '操作',
      width: 160,
      render: (_, r) =>
        r.status === 'pending' ? (
          <Space>
            <Button size="small" danger onClick={() => handleResolve(r.id)}>
              删除评论
            </Button>
            <Button size="small" onClick={() => handleDismiss(r.id)}>
              驳回
            </Button>
          </Space>
        ) : null,
    },
  ];

  return (
    <>
      <Tabs
        activeKey={activeTab}
        onChange={(k) => { setActiveTab(k); setPage(1); }}
        items={[
          {
            key: 'pending',
            label: (
              <Badge count={pendingCount} offset={[8, 0]}>
                待处理
              </Badge>
            ),
          },
          { key: 'resolved', label: '已处置' },
          { key: 'dismissed', label: '已驳回' },
        ]}
      />
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: setPage,
          showTotal: (t) => `共 ${t} 条`,
        }}
      />
    </>
  );
};

export default Reports;
```

- [ ] **Step 3: 编译检查**

```bash
cd admin-frontend && npm run build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add admin-frontend/src/services/adminReport.ts admin-frontend/src/pages/Reports.tsx
git commit -m "feat(admin-ui): add Reports page for report queue management"
```

---

## Task 12: admin-frontend — 更新路由和导航菜单

**Files:**
- Modify: `admin-frontend/src/App.tsx`
- Modify: `admin-frontend/src/layouts/MainLayout.tsx`

- [ ] **Step 1: 更新 App.tsx — 添加 4 条路由**

在 `App.tsx` 中添加 4 个新 import：

```tsx
import Works from './pages/Works';
import Comments from './pages/Comments';
import Reports from './pages/Reports';
import ArtistApplications from './pages/ArtistApplications';
```

在现有 `<Route path="customers" .../>` 之后插入（保持菜单顺序一致）：

```tsx
<Route path="works" element={<ProtectedRoute permission="work:view"><Works /></ProtectedRoute>} />
<Route path="comments" element={<ProtectedRoute permission="comment:view"><Comments /></ProtectedRoute>} />
<Route path="reports" element={<ProtectedRoute permission="report:view"><Reports /></ProtectedRoute>} />
<Route path="applications" element={<ProtectedRoute permission="application:view"><ArtistApplications /></ProtectedRoute>} />
```

- [ ] **Step 2: 更新 MainLayout.tsx — 添加 4 个菜单项**

在 `App.tsx` 中导入需要的 Ant Design 图标（如未引入）：

```tsx
import {
  // 现有图标...
  PictureOutlined,
  MessageOutlined,
  WarningOutlined,
  FormOutlined,
} from '@ant-design/icons';
```

在 `MainLayout.tsx` 的 `menuItems` 数组中，在 `customers` 项之后插入：

```typescript
{
  key: '/works',
  icon: <PictureOutlined />,
  label: '作品管理',
  permission: 'work:view',
},
{
  key: '/comments',
  icon: <MessageOutlined />,
  label: '评论管理',
  permission: 'comment:view',
},
{
  key: '/reports',
  icon: <WarningOutlined />,
  label: '举报队列',
  permission: 'report:view',
},
{
  key: '/applications',
  icon: <FormOutlined />,
  label: '美甲师申请',
  permission: 'application:view',
},
```

- [ ] **Step 3: 编译检查**

```bash
cd admin-frontend && npm run build 2>&1 | tail -10
```

预期：无 TypeScript 错误。

- [ ] **Step 4: 启动开发服务器验证导航**

```bash
cd admin-frontend && npm run dev
```

访问 http://localhost:5173，登录后验证：
- 侧边栏出现"作品管理"、"评论管理"、"举报队列"、"美甲师申请"四个菜单项
- 点击各菜单可正常路由跳转
- 各页面加载无报错（数据为空是正常的）

- [ ] **Step 5: Commit**

```bash
git add admin-frontend/src/App.tsx admin-frontend/src/layouts/MainLayout.tsx
git commit -m "feat(admin-ui): add 4 new routes and nav menu items for content moderation"
```

---

## Task 13: client-frontend — 评论举报按钮

**Files:**
- Modify: `client-frontend/src/pages/WorkDetailPage.tsx`
- Modify: `client-frontend/src/services/works.ts`

- [ ] **Step 1: 在 works.ts service 中新增 reportComment 方法**

在 `client-frontend/src/services/works.ts` 中，在 `deleteComment` 方法之后添加：

```typescript
async reportComment(
  commentId: number,
  reason: 'spam' | 'inappropriate' | 'harassment' | 'other',
): Promise<{ success: boolean; alreadyReported: boolean }> {
  const response = await api.post('/client/reports', { commentId, reason });
  return response.data;
},
```

- [ ] **Step 2: 在 WorkDetailPage.tsx 中新增举报 UI**

**2a.** 在 `CommentItem` 组件的 props interface 中新增 `onReport` 回调：

```typescript
interface CommentItemProps {
  comment: Comment;
  onReply: (comment: Comment) => void;
  onDelete: (commentId: number) => void;
  onReport: (commentId: number) => void;  // 新增
}
```

**2b.** 在 `CommentItem` 组件的解构参数中接收 `onReport`：

```typescript
const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onReply,
  onDelete,
  onReport,
}) => {
```

**2c.** 在 `CommentItem` 的操作菜单中（搜索 `actionMenuId === comment.id` 的区块），在现有"删除"按钮之后追加举报按钮（非本人评论才显示）：

```tsx
{!comment.isAuthor && !isDeleted && (
  <button
    className="w-full text-left px-4 py-2 text-sm text-orange-500 hover:bg-gray-50"
    onClick={() => {
      onReport(comment.id);
      setActionMenuId(null);
    }}
  >
    举报
  </button>
)}
```

**2d.** 在 `WorkDetailPage` 主组件中添加举报相关 state（与 `actionMenuId` 等现有 state 放在一起）：

```typescript
const [reportTarget, setReportTarget] = useState<number | null>(null);
const [reportModalOpen, setReportModalOpen] = useState(false);
```

**2e.** 添加举报提交函数（与 `handleDelete` 等放在一起）：

```typescript
const handleReport = async (reason: 'spam' | 'inappropriate' | 'harassment' | 'other') => {
  if (!reportTarget) return;
  try {
    const res = await worksService.reportComment(reportTarget, reason);
    if (res.alreadyReported) {
      // Show feedback in UI
    }
  } catch {
    // ignore
  } finally {
    setReportTarget(null);
    setReportModalOpen(false);
  }
};
```

**2f.** 将 `onReport` prop 传递给所有 `<CommentItem>` 使用处：

```tsx
<CommentItem
  key={comment.id}
  comment={comment}
  onReply={handleReply}
  onDelete={handleDelete}
  onReport={(id) => { setReportTarget(id); setReportModalOpen(true); }}
/>
```

**2g.** 在页面末尾（`</div>` 闭合前）添加举报弹窗：

```tsx
{reportModalOpen && (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
    onClick={() => setReportModalOpen(false)}
  >
    <div className="w-full max-w-md bg-white rounded-t-2xl p-4 pb-8"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-center text-base font-medium mb-4">举报原因</div>
      {[
        { value: 'spam' as const, label: '广告/垃圾信息' },
        { value: 'inappropriate' as const, label: '不雅内容' },
        { value: 'harassment' as const, label: '骚扰' },
        { value: 'other' as const, label: '其他' },
      ].map((item) => (
        <button
          key={item.value}
          className="w-full text-left py-3 px-2 border-b text-sm text-gray-700 hover:bg-gray-50"
          onClick={() => handleReport(item.value)}
        >
          {item.label}
        </button>
      ))}
      <button
        className="w-full mt-3 py-3 text-sm text-gray-400"
        onClick={() => setReportModalOpen(false)}
      >
        取消
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 3: 编译检查**

```bash
cd client-frontend && npm run build 2>&1 | tail -10
```

预期：无 TypeScript 错误。

- [ ] **Step 4: Commit**

```bash
git add client-frontend/src/pages/WorkDetailPage.tsx client-frontend/src/services/works.ts
git commit -m "feat(client): add comment report button with reason selector"
```

---

## 完成验收清单

完成所有 Task 后，逐项验证：

- [ ] `GET /api/v1/admin/works` 返回分页作品列表
- [ ] `PATCH /api/v1/admin/works/:id/homepage-featured` 切换精选状态
- [ ] `GET /api/v1/public/featured-works` 无需认证可访问，返回精选作品
- [ ] `GET /api/v1/admin/comments` 返回分页评论列表
- [ ] `PATCH /api/v1/admin/comments/:id/hide` 切换隐藏状态
- [ ] `GET /api/v1/admin/reports` 返回举报列表含 pendingCount
- [ ] `POST /api/v1/client/reports` 客户可举报评论，重复举报返回 alreadyReported=true
- [ ] admin-frontend 侧边栏出现 4 个新菜单项
- [ ] Works 页面可切换官网精选 Switch
- [ ] Comments 页面可隐藏/恢复/删除评论
- [ ] Reports 页面显示待处理角标，可处置/驳回
- [ ] ArtistApplications 页面可查看详情并审核通过/拒绝
- [ ] client-frontend 评论区点击"..."可看到"举报"选项，选择原因后提交
- [ ] 超管角色在数据库中有 8 个新权限码

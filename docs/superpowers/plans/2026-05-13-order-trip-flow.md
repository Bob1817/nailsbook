# Order/Trip Flow Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the booking system into an order-based architecture with a separate trip view, merging Quote into Order and standardizing status flow across client and technician sides.

**Architecture:** Replace `Booking` + `Quote` dual model with a single `Order` model. Order statuses: `pending_quote` → `pending_agree` → `pending_confirm` → `pending_home/pending_shop` → `in_progress` → `completed`/`cancelled`. Trip = virtual view filtering orders in `pending_home/pending_shop/in_progress`.

**Tech Stack:** NestJS, Prisma (SQLite), React (Vite), TypeScript

**Spec:** `docs/superpowers/specs/2026-05-13-order-trip-flow-design.md`

---

## File Structure

### Backend - Files to Create
- `backend/src/orders/orders.module.ts` — Module wiring for orders
- `backend/src/orders/orders.service.ts` — Technician-side order operations (replaces `bookings/bookings.service.ts`)
- `backend/src/orders/client-orders.service.ts` — Client-side order operations (replaces `client-bookings/client-bookings.service.ts`)
- `backend/src/orders/orders.scheduler.ts` — Auto-transition cron jobs (replaces `bookings/bookings.scheduler.ts`)
- `backend/src/orders/technician-orders.controller.ts` — Technician API endpoints (replaces `bookings/technician-bookings.controller.ts`)
- `backend/src/orders/client-orders.controller.ts` — Client API endpoints (replaces `client-bookings/client-bookings.controller.ts`)
- `backend/src/orders/dto/create-technician-order.dto.ts` — DTO for technician creating orders
- `backend/src/orders/dto/create-client-order.dto.ts` — DTO for client creating orders
- `backend/src/orders/dto/update-client-order.dto.ts` — DTO for client updating orders
- `backend/src/orders/dto/review-order.dto.ts` — DTO for technician submitting quote
- `backend/src/orders/dto/update-client-order-status.dto.ts` — DTO for client status updates
- `backend/src/orders/dto/reject-quote.dto.ts` — DTO for rejecting quotes
- `backend/src/orders/dto/create-order-from-design.dto.ts` — DTO for creating order from design
- `backend/src/orders/dto/index.ts` — DTO exports

### Backend - Files to Modify
- `backend/prisma/schema.prisma` — Rename Booking→Order, merge Quote fields, update relations
- `backend/src/app.module.ts` — Replace BookingsModule/ClientBookingsModule with OrdersModule
- `backend/src/client-home/client-home.service.ts` — `prisma.booking` → `prisma.order`
- `backend/src/custom-service-requests/custom-service-requests.service.ts` — `tx.booking.create` → `tx.order.create`
- `backend/src/dashboard/dashboard.service.ts` — All `prisma.booking` → `prisma.order`
- `backend/src/schedules/schedules.service.ts` — `prisma.booking` → `prisma.order`
- `backend/src/customers/customers.service.ts` — `bookings` relation → `orders`
- `backend/src/technicians/technicians.service.ts` — `bookings` relation → `orders`
- `backend/src/revenues/revenues.service.ts` — `booking` relation → `order`, `bookingNo` → `orderNo`
- `backend/src/demo-data.seed.ts` — Booking references → Order references

### Backend - Files to Delete
- `backend/src/bookings/` (entire directory)
- `backend/src/client-bookings/` (entire directory)
- `backend/src/quotes/` (entire directory)

### Frontend - Files to Create/Modify
- `client-frontend/src/services/booking.ts` → rewrite as `client-frontend/src/services/order.ts`
- `client-frontend/src/pages/BookingList.tsx` — Split into trip list + order list tabs
- `client-frontend/src/pages/BookingDetail.tsx` — Update status labels and actions
- `client-frontend/src/pages/CreateBooking.tsx` — Update API calls
- `client-frontend/src/pages/Home.tsx` — Trip card from trip API
- `client-frontend/src/pages/DesignDetail.tsx` — Update booking service import
- `technician-frontend/src/services/bookings.ts` → rewrite as `technician-frontend/src/services/orders.ts`
- `technician-frontend/src/services/technicianData.ts` — Update types and status maps
- `technician-frontend/src/pages/HomePage.tsx` — Trip card from trip API
- `technician-frontend/src/pages/OrdersPage.tsx` — Split into trip list + order list
- `technician-frontend/src/pages/BookingDetailPage.tsx` — Update status labels and actions
- `technician-frontend/src/pages/SchedulePage.tsx` — Update imports and types
- `technician-frontend/src/pages/MessagesPage.tsx` — Update imports
- `technician-frontend/src/pages/CustomersPage.tsx` — Update imports

---

## Task 1: Prisma Schema — Rename Booking to Order, Merge Quote

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Goal:** Replace Booking model with Order model, merge Quote fields into Order, update all related model relations.

- [ ] **Step 1: Update schema.prisma — Order model**

Replace the `Booking` model (lines 142-188) with the new `Order` model. Replace the `Quote` model (lines 117-140) with nothing (delete it). Update all relation references in other models.

The complete schema.prisma changes:

1. In the `Technician` model, rename `bookings Booking[]` to `orders Order[]` and remove `quotes Quote[]`
2. In the `Customer` model, rename `bookings Booking[]` to `orders Order[]` and remove `quotes Quote[]`
3. Delete the entire `Quote` model
4. Replace the `Booking` model with `Order`:

```prisma
model Order {
  id                      Int                  @id @default(autoincrement())
  orderNo                 String               @unique
  technicianId            Int
  customerId              Int
  clientUserId            Int?
  addressId               Int?
  designRequestId         Int?
  customServiceRequestId  Int?
  startTime               DateTime
  endTime                 DateTime
  address                 String?
  serviceType             String?
  remark                 String?
  quotePrice              Float?
  quoteRemark             String?
  quotedAt                DateTime?
  status                  String               @default("pending_quote")
  isDepositPaid           Boolean              @default(false)
  depositAmount           Float?               @default(0)
  depositStatus           String?              @default("pending")
  depositConfirmedAt      DateTime?
  confirmedAt             DateTime?
  completedAt             DateTime?
  cancelledAt             DateTime?
  cancelReason            String?
  source                  String?              @default("technician")
  createdAt               DateTime             @default(now())
  updatedAt               DateTime             @default(now()) @updatedAt
  technician              Technician           @relation(fields: [technicianId], references: [id])
  customer                Customer             @relation(fields: [customerId], references: [id])
  clientUser              ClientUser?          @relation(fields: [clientUserId], references: [id])
  clientAddress           ClientAddress?       @relation(fields: [addressId], references: [id])
  designRequest           ClientDesignRequest?    @relation(fields: [designRequestId], references: [id])
  customServiceRequest    CustomServiceRequest? @relation(fields: [customServiceRequestId], references: [id])
  revenue                 Revenue?

  @@index([technicianId])
  @@index([customerId])
  @@index([clientUserId])
  @@index([addressId])
  @@index([designRequestId])
  @@index([customServiceRequestId])
  @@index([status])
  @@index([startTime])
}
```

5. In the `ClientUser` model, rename `bookings Booking[]` to `orders Order[]`
6. In the `ClientAddress` model, rename `bookings Booking[]` to `orders Order[]`
7. In the `ClientDesignRequest` model, rename `bookings Booking[]` to `orders Order[]`
8. In the `CustomServiceRequest` model, rename `bookings Booking[]` to `orders Order[]`
9. In the `Revenue` model, rename `bookingId Int @unique` to `orderId Int @unique`, rename `booking Booking @relation(...)` to `order Order @relation(...)`, update the relation field name
10. Remove `quoteId` from `Revenue` model (quote data is now in Order)

After these changes, the full schema.prisma should have NO references to `Booking` or `Quote`.

- [ ] **Step 2: Reset database and regenerate Prisma client**

```bash
cd backend
rm -f prisma/dev.db
npx prisma migrate dev --name init_order_model
npx prisma generate
```

Expected: New database with `Order` table (no `Booking` or `Quote` tables).

- [ ] **Step 3: Verify schema**

```bash
cd backend
npx prisma db push --accept-data-loss  # if migrate fails
npx prisma studio  # visual check
```

Expected: `Order` table visible with all fields, no `Booking` or `Quote` tables.

---

## Task 2: Backend — Create Orders Service (Technician Side)

**Files:**
- Create: `backend/src/orders/dto/create-technician-order.dto.ts`
- Create: `backend/src/orders/dto/review-order.dto.ts`
- Create: `backend/src/orders/orders.service.ts`

- [ ] **Step 1: Create DTOs**

`backend/src/orders/dto/create-technician-order.dto.ts`:
```typescript
import { IsInt, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateTechnicianOrderDto {
  @IsInt()
  customerId: number;

  @IsString()
  serviceName: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  serviceType?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
```

`backend/src/orders/dto/review-order.dto.ts`:
```typescript
import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class ReviewOrderDto {
  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  serviceDate: string;

  @IsString()
  startTime: string;

  @IsNumber()
  @Min(1)
  durationMinutes: number;

  @IsOptional()
  @IsString()
  shopName?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
```

- [ ] **Step 2: Create orders.service.ts**

Create `backend/src/orders/orders.service.ts` based on `bookings.service.ts` with these key changes:

1. All `this.prisma.booking` → `this.prisma.order`
2. All `bookingNo` → `orderNo`
3. Remove all `Quote` creation/queries (quote fields are now on Order directly)
4. Status changes: `confirmed` → `pending_home` or `pending_shop` (based on `serviceType`)
5. `generateBookingNo()` → `generateOrderNo()` with prefix `OD`
6. Remove `generateQuoteNo()`
7. Remove `quoteId` references
8. Status transitions map:
```typescript
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_quote: ['pending_agree', 'cancelled'],
  pending_agree: ['pending_confirm', 'pending_quote', 'cancelled'],
  pending_confirm: ['pending_home', 'pending_shop', 'cancelled'],
  pending_home: ['in_progress'],
  pending_shop: ['in_progress'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
};
```
9. `confirm()` method: determines target status based on `order.serviceType`:
```typescript
const targetStatus = order.serviceType === '上门美甲' ? 'pending_home' : 'pending_shop';
```
10. `review()` method: sets `quotePrice`, `quoteRemark`, `quotedAt` directly on Order (no Quote model)
11. `createForTechnician()`: no longer creates Quote, sets `status: 'pending_quote'` directly
12. `cancel()`: only allowed from `pending_quote`, `pending_agree`, `pending_confirm`
13. `complete()`: uses `order.quotePrice` for revenue amount (not `quote.price`)
14. Conflict check: update `assertConfirmedBookingConflict` to check `pending_home`/`pending_shop` instead of `confirmed`

Full implementation:
```typescript
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import * as crypto from 'crypto';
import { CreateTechnicianOrderDto } from './dto/create-technician-order.dto';
import { ReviewOrderDto } from './dto/review-order.dto';

const VALID_ORDER_STATUSES = [
  'pending_quote',
  'pending_agree',
  'pending_confirm',
  'pending_home',
  'pending_shop',
  'in_progress',
  'completed',
  'cancelled',
] as const;

type OrderStatus = (typeof VALID_ORDER_STATUSES)[number];

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_quote: ['pending_agree', 'cancelled'],
  pending_agree: ['pending_confirm', 'pending_quote', 'cancelled'],
  pending_confirm: ['pending_home', 'pending_shop', 'cancelled'],
  pending_home: ['in_progress'],
  pending_shop: ['in_progress'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
};

function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async createForTechnician(technicianId: number, dto: CreateTechnicianOrderDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    if (customer.technicianId !== technicianId) {
      throw new ForbiddenException('无权为该客户创建订单');
    }

    return this.prisma.order.create({
      data: {
        orderNo: this.generateOrderNo(),
        technicianId,
        customerId: customer.id,
        clientUserId: customer.clientUserId ?? null,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        address: dto.address,
        serviceType: dto.serviceType || null,
        status: 'pending_quote',
        remark: dto.note || null,
      },
      include: {
        technician: { select: { id: true, name: true, phone: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    });
  }

  async findAll(page: number = 1, limit: number = 20, technicianId?: number, customerId?: number, status?: string) {
    const where: any = {};

    if (technicianId) where.technicianId = technicianId;
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          technician: { select: { id: true, name: true, phone: true } },
          customer: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { startTime: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findTrips(technicianId: number) {
    return this.prisma.order.findMany({
      where: {
        technicianId,
        status: { in: ['pending_home', 'pending_shop', 'in_progress'] },
      },
      include: {
        technician: { select: { id: true, name: true, phone: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        technician: { select: { id: true, name: true, phone: true } },
        customer: { select: { id: true, name: true, phone: true } },
        revenue: true,
        designRequest: {
          select: { id: true, title: true, images: true, description: true },
        },
        customServiceRequest: {
          select: { id: true, title: true, images: true, description: true, referenceWorkIds: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    return order;
  }

  async findOneForTechnician(id: number, technicianId: number) {
    const order = await this.findOne(id);

    if (order.technicianId !== technicianId) {
      throw new ForbiddenException('无权访问该订单');
    }

    return order;
  }

  async review(id: number, technicianId: number, dto: ReviewOrderDto) {
    const order = await this.findOneForTechnician(id, technicianId);

    if (!canTransition(order.status as OrderStatus, 'pending_agree')) {
      throw new BadRequestException('当前订单状态不支持报价');
    }

    const startTime = new Date(`${dto.serviceDate}T${dto.startTime}:00`);
    const endTime = new Date(startTime.getTime() + Number(dto.durationMinutes) * 60000);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime()) || Number(dto.durationMinutes) <= 0) {
      throw new BadRequestException('预约时间或预估时长无效');
    }

    await this.assertOrderConflict(technicianId, startTime, endTime, order.id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: {
          startTime,
          endTime,
          quotePrice: dto.price,
          quoteRemark: dto.remark || null,
          quotedAt: new Date(),
          status: 'pending_agree',
        },
        include: {
          technician: { select: { id: true, name: true, phone: true } },
          customer: { select: { id: true, name: true, phone: true } },
        },
      });

      if (order.clientUserId) {
        const preview = '美甲师已提交报价，请查看并确认～';
        const conversation = await tx.conversation.upsert({
          where: {
            clientId_techId: {
              clientId: order.clientUserId,
              techId: technicianId,
            },
          },
          update: { lastMessage: preview, lastMessageAt: new Date() },
          create: {
            clientId: order.clientUserId,
            techId: technicianId,
            lastMessage: preview,
            lastMessageAt: new Date(),
          },
        });

        await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderType: 'system',
            senderId: 0,
            receiverType: 'client',
            receiverId: order.clientUserId,
            messageType: 'system',
            content: preview,
            relatedType: 'order',
            relatedId: order.id,
          },
        });
      }

      return updated;
    });
  }

  async confirm(id: number, depositConfirmed?: boolean) {
    const order = await this.findOne(id);

    if (!canTransition(order.status as OrderStatus, 'pending_home') &&
        !canTransition(order.status as OrderStatus, 'pending_shop')) {
      throw new BadRequestException('当前订单状态不支持确认');
    }

    if (!order.isDepositPaid && !depositConfirmed) {
      throw new BadRequestException('请先确认用户已缴纳定金');
    }

    const targetStatus: OrderStatus = order.serviceType === '上门美甲' ? 'pending_home' : 'pending_shop';

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: {
          status: targetStatus,
          confirmedAt: new Date(),
          isDepositPaid: depositConfirmed ? true : order.isDepositPaid,
          depositStatus: depositConfirmed ? 'paid' : order.depositStatus,
          depositConfirmedAt: depositConfirmed ? new Date() : order.depositConfirmedAt,
        },
      });

      if (order.clientUserId) {
        const preview = targetStatus === 'pending_home'
          ? '美甲师已确认订单，届时将上门服务～'
          : '美甲师已确认订单，请准时到店～';
        const conversation = await tx.conversation.upsert({
          where: {
            clientId_techId: {
              clientId: order.clientUserId,
              techId: order.technicianId,
            },
          },
          update: { lastMessage: preview, lastMessageAt: new Date() },
          create: {
            clientId: order.clientUserId,
            techId: order.technicianId,
            lastMessage: preview,
            lastMessageAt: new Date(),
          },
        });

        await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderType: 'system',
            senderId: 0,
            receiverType: 'client',
            receiverId: order.clientUserId,
            messageType: 'system',
            content: preview,
            relatedType: 'order',
            relatedId: order.id,
          },
        });
      }

      return updated;
    });
  }

  async complete(id: number) {
    const order = await this.findOne(id);

    if (!canTransition(order.status as OrderStatus, 'completed')) {
      throw new BadRequestException('当前订单状态不支持完成');
    }

    const revenueExists = await this.prisma.revenue.findUnique({
      where: { orderId: id },
    });

    if (revenueExists) {
      throw new BadRequestException('该订单已生成收入记录');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      const revenue = await tx.revenue.create({
        data: {
          revenueNo: this.generateRevenueNo(),
          orderId: id,
          technicianId: order.technicianId,
          customerId: order.customerId,
          amount: order.quotePrice ?? 0,
          recognizedAt: new Date(),
          status: 'confirmed',
        },
      });

      if (order.clientUserId) {
        const preview = '服务已完成，感谢使用～';
        const conversation = await tx.conversation.upsert({
          where: {
            clientId_techId: {
              clientId: order.clientUserId,
              techId: order.technicianId,
            },
          },
          update: { lastMessage: preview, lastMessageAt: new Date() },
          create: {
            clientId: order.clientUserId,
            techId: order.technicianId,
            lastMessage: preview,
            lastMessageAt: new Date(),
          },
        });

        await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderType: 'system',
            senderId: 0,
            receiverId: order.clientUserId,
            receiverType: 'client',
            messageType: 'system',
            content: preview,
            relatedType: 'order',
            relatedId: order.id,
          },
        });
      }

      return revenue;
    });
  }

  async cancel(id: number, cancelReason?: string) {
    const order = await this.findOne(id);

    const cancellableStatuses: OrderStatus[] = ['pending_quote', 'pending_agree', 'pending_confirm'];
    if (!cancellableStatuses.includes(order.status as OrderStatus)) {
      throw new BadRequestException('当前订单状态不支持取消');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: cancelReason ?? order.cancelReason ?? null,
        },
      });

      if (order.clientUserId) {
        const preview = '订单已取消';
        const conversation = await tx.conversation.upsert({
          where: {
            clientId_techId: {
              clientId: order.clientUserId,
              techId: order.technicianId,
            },
          },
          update: { lastMessage: preview, lastMessageAt: new Date() },
          create: {
            clientId: order.clientUserId,
            techId: order.technicianId,
            lastMessage: preview,
            lastMessageAt: new Date(),
          },
        });

        await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderType: 'system',
            senderId: 0,
            receiverType: 'client',
            receiverId: order.clientUserId,
            messageType: 'system',
            content: preview,
            relatedType: 'order',
            relatedId: order.id,
          },
        });

        await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderType: 'system',
            senderId: 0,
            receiverType: 'technician',
            receiverId: order.technicianId,
            messageType: 'system',
            content: preview,
            relatedType: 'order',
            relatedId: order.id,
          },
        });
      }

      return updated;
    });
  }

  private generateOrderNo(): string {
    return `OD${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }

  private generateRevenueNo(): string {
    return `RV${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }

  private async assertOrderConflict(technicianId: number, startTime: Date, endTime: Date, ignoreId?: number) {
    const conflict = await this.prisma.order.findFirst({
      where: {
        technicianId,
        status: { in: ['pending_home', 'pending_shop'] },
        NOT: ignoreId ? { id: ignoreId } : undefined,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { id: true },
    });

    if (conflict) {
      throw new BadRequestException('该时段已被其他订单占用');
    }
  }
}
```

- [ ] **Step 3: Compile check**

```bash
cd backend && npx tsc --noEmit
```

Expected: Compilation errors from other files referencing Booking/Quote (expected at this stage).

---

## Task 3: Backend — Create Client Orders Service

**Files:**
- Create: `backend/src/orders/dto/create-client-order.dto.ts`
- Create: `backend/src/orders/dto/update-client-order.dto.ts`
- Create: `backend/src/orders/dto/update-client-order-status.dto.ts`
- Create: `backend/src/orders/dto/reject-quote.dto.ts`
- Create: `backend/src/orders/dto/create-order-from-design.dto.ts`
- Create: `backend/src/orders/client-orders.service.ts`

- [ ] **Step 1: Create client DTOs**

`backend/src/orders/dto/create-client-order.dto.ts`:
```typescript
import { IsString, IsOptional, IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ShopAddressDto {
  @IsString()
  name: string;
}

export class CreateClientOrderDto {
  @IsInt()
  techId: number;

  @IsString()
  serviceDate: string;

  @IsString()
  startTime: string;

  @IsString()
  serviceType: string;

  @IsOptional()
  @IsInt()
  addressId?: number;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedServiceIds?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ShopAddressDto)
  shopAddress?: ShopAddressDto;
}
```

`backend/src/orders/dto/update-client-order.dto.ts`:
```typescript
import { IsString, IsInt } from 'class-validator';

export class UpdateClientOrderDto {
  @IsInt()
  addressId: number;

  @IsString()
  serviceDate: string;

  @IsString()
  startTime: string;
}
```

`backend/src/orders/dto/update-client-order-status.dto.ts`:
```typescript
import { IsIn } from 'class-validator';

export class UpdateClientOrderStatusDto {
  @IsIn(['completed', 'cancelled'])
  status: 'completed' | 'cancelled';
}
```

`backend/src/orders/dto/reject-quote.dto.ts`:
```typescript
import { IsString } from 'class-validator';

export class RejectQuoteDto {
  @IsString()
  reason: string;
}
```

`backend/src/orders/dto/create-order-from-design.dto.ts`:
```typescript
import { IsString, IsInt, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ShopAddressFromDesignDto {
  @IsString()
  name: string;
}

export class CreateOrderFromDesignDto {
  @IsInt()
  designId: number;

  @IsInt()
  techId: number;

  @IsString()
  serviceDate: string;

  @IsString()
  startTime: string;

  @IsString()
  serviceType: string;

  @IsOptional()
  @IsInt()
  addressId?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ShopAddressFromDesignDto)
  shopAddress?: ShopAddressFromDesignDto;
}
```

- [ ] **Step 2: Create client-orders.service.ts**

Create `backend/src/orders/client-orders.service.ts` based on `client-bookings/client-bookings.service.ts` with these key changes:

1. All `this.prisma.booking` → `this.prisma.order`
2. All `bookingNo` → `orderNo`
3. Remove Quote creation (quote fields now on Order)
4. `confirmed` → `pending_home` or `pending_shop`
5. Status transitions for client:
```typescript
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_quote: ['cancelled'],
  pending_agree: ['pending_confirm', 'pending_quote', 'cancelled'],
  pending_confirm: ['cancelled'],
  pending_home: [],
  pending_shop: [],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
};
```
6. `agree()`: transitions to `pending_confirm`
7. `rejectQuote()`: transitions back to `pending_quote`, clears `quotePrice`, `quoteRemark`, `quotedAt`
8. `updateStatus()`: `completed` only from `in_progress`; `cancelled` from `pending_quote`/`pending_agree`/`pending_confirm`
9. `mapStatus()`: removes `confirmed`, adds `pending_home`/`pending_shop`; removes `pending_deposit`/`deposit_paid` sub-statuses (simplify to just the base status)
10. `bookingInclude()` → `orderInclude()`: removes `quote` include
11. `mapBooking()` → `mapOrder()`: removes `quote` field, adds `quoteRemark`, `quotedAt`
12. Add `findTrips()` method for client

Key method signatures:
```typescript
@Injectable()
export class ClientOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clientUserId: number, dto: CreateClientOrderDto): Promise<any>
  async createFromDesign(clientUserId: number, dto: CreateOrderFromDesignDto): Promise<any>
  async findAll(clientUserId: number): Promise<any[]>
  async findTrips(clientUserId: number): Promise<any[]>
  async findOne(clientUserId: number, id: number): Promise<any>
  async update(clientUserId: number, id: number, dto: UpdateClientOrderDto): Promise<any>
  async agree(clientUserId: number, id: number): Promise<any>
  async rejectQuote(clientUserId: number, id: number, reason: string): Promise<any>
  async updateStatus(clientUserId: number, id: number, status: 'completed' | 'cancelled'): Promise<any>
}
```

The `findTrips()` method:
```typescript
async findTrips(clientUserId: number) {
  const orders = await this.prisma.order.findMany({
    where: {
      clientUserId,
      status: { in: ['pending_home', 'pending_shop', 'in_progress'] },
    },
    orderBy: { startTime: 'asc' },
    include: this.orderInclude(),
  });

  return orders.map((order) => this.mapOrder(order));
}
```

The `rejectQuote()` method clears quote data:
```typescript
async rejectQuote(clientUserId: number, id: number, reason: string) {
  // ... (same validation as current)
  const updated = await tx.order.update({
    where: { id },
    data: {
      status: 'pending_quote',
      quotePrice: null,
      quoteRemark: null,
      quotedAt: null,
      cancelReason: reason,
    },
  });
  // ... (notification logic)
}
```

- [ ] **Step 3: Compile check**

```bash
cd backend && npx tsc --noEmit 2>&1 | head -20
```

Expected: Errors from other files (not from orders/ directory).

---

## Task 4: Backend — Create Orders Controller & Scheduler

**Files:**
- Create: `backend/src/orders/technician-orders.controller.ts`
- Create: `backend/src/orders/client-orders.controller.ts`
- Create: `backend/src/orders/orders.scheduler.ts`
- Create: `backend/src/orders/orders.module.ts`

- [ ] **Step 1: Create technician-orders.controller.ts**

```typescript
import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { CreateTechnicianOrderDto } from './dto/create-technician-order.dto';
import { ReviewOrderDto } from './dto/review-order.dto';

@Controller('technician/orders')
@UseGuards(TechnicianJwtAuthGuard)
export class TechnicianOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @Req() request: { user: { technicianId: number } },
    @Body() body: CreateTechnicianOrderDto,
  ) {
    return this.ordersService.createForTechnician(request.user.technicianId, body);
  }

  @Get()
  findAll(
    @Req() request: { user: { technicianId: number } },
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.ordersService.findAll(
      1,
      100,
      request.user.technicianId,
      customerId ? parseInt(customerId, 10) : undefined,
      status,
    );
  }

  @Get('trips')
  findTrips(@Req() request: { user: { technicianId: number } }) {
    return this.ordersService.findTrips(request.user.technicianId);
  }

  @Get(':id')
  findOne(@Req() request: { user: { technicianId: number } }, @Param('id') id: string) {
    return this.ordersService.findOneForTechnician(parseInt(id, 10), request.user.technicianId);
  }

  @Patch(':id/review')
  async review(
    @Req() request: { user: { technicianId: number } },
    @Param('id') id: string,
    @Body() body: ReviewOrderDto,
  ) {
    await this.ordersService.findOneForTechnician(parseInt(id, 10), request.user.technicianId);
    return this.ordersService.review(parseInt(id, 10), request.user.technicianId, body);
  }

  @Patch(':id/confirm')
  async confirm(
    @Req() request: { user: { technicianId: number } },
    @Param('id') id: string,
    @Body() body: { depositConfirmed?: boolean },
  ) {
    await this.ordersService.findOneForTechnician(parseInt(id, 10), request.user.technicianId);
    return this.ordersService.confirm(parseInt(id, 10), body?.depositConfirmed);
  }

  @Patch(':id/complete')
  async complete(@Req() request: { user: { technicianId: number } }, @Param('id') id: string) {
    await this.ordersService.findOneForTechnician(parseInt(id, 10), request.user.technicianId);
    return this.ordersService.complete(parseInt(id, 10));
  }

  @Patch(':id/cancel')
  async cancel(@Req() request: { user: { technicianId: number } }, @Param('id') id: string) {
    await this.ordersService.findOneForTechnician(parseInt(id, 10), request.user.technicianId);
    return this.ordersService.cancel(parseInt(id, 10));
  }
}
```

- [ ] **Step 2: Create client-orders.controller.ts**

```typescript
import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { ClientOrdersService } from './client-orders.service';
import { CreateClientOrderDto } from './dto/create-client-order.dto';
import { UpdateClientOrderDto } from './dto/update-client-order.dto';
import { CreateOrderFromDesignDto } from './dto/create-order-from-design.dto';
import { UpdateClientOrderStatusDto } from './dto/update-client-order-status.dto';
import { RejectQuoteDto } from './dto/reject-quote.dto';

@Controller('client/orders')
@UseGuards(ClientJwtAuthGuard)
export class ClientOrdersController {
  constructor(private readonly clientOrdersService: ClientOrdersService) {}

  @Post()
  create(
    @Req() request: { user: { clientUserId: number } },
    @Body() dto: CreateClientOrderDto,
  ) {
    return this.clientOrdersService.create(request.user.clientUserId, dto);
  }

  @Post('from-design')
  createFromDesign(
    @Req() request: { user: { clientUserId: number } },
    @Body() dto: CreateOrderFromDesignDto,
  ) {
    return this.clientOrdersService.createFromDesign(request.user.clientUserId, dto);
  }

  @Get()
  findAll(@Req() request: { user: { clientUserId: number } }) {
    return this.clientOrdersService.findAll(request.user.clientUserId);
  }

  @Get('trips')
  findTrips(@Req() request: { user: { clientUserId: number } }) {
    return this.clientOrdersService.findTrips(request.user.clientUserId);
  }

  @Get(':id')
  findOne(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientOrdersService.findOne(request.user.clientUserId, id);
  }

  @Patch(':id')
  update(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientOrderDto,
  ) {
    return this.clientOrdersService.update(request.user.clientUserId, id, dto);
  }

  @Post(':id/agree')
  agree(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientOrdersService.agree(request.user.clientUserId, id);
  }

  @Post(':id/reject-quote')
  rejectQuote(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectQuoteDto,
  ) {
    return this.clientOrdersService.rejectQuote(request.user.clientUserId, id, dto.reason);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientOrderStatusDto,
  ) {
    return this.clientOrdersService.updateStatus(request.user.clientUserId, id, dto.status);
  }
}
```

- [ ] **Step 3: Create orders.scheduler.ts**

Create `backend/src/orders/orders.scheduler.ts` based on `bookings.scheduler.ts`:

Key changes:
1. All `prisma.booking` → `prisma.order`
2. `autoTransitionToInProgress`: query `status IN ['pending_home', 'pending_shop']` instead of `'confirmed'`; time threshold = `startTime - 30min` instead of `startTime - 2h`
3. `autoTransitionToCompleted`: query `status = 'in_progress'` and `endTime + 24h ≤ now` (same logic, different table)
4. Revenue creation: use `order.quotePrice` instead of `quote.price`; `orderId` instead of `bookingId`; remove `quoteId`
5. Notification: `relatedType: 'order'` instead of `'booking'`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class OrdersScheduler {
  private readonly logger = new Logger(OrdersScheduler.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleOrderStatusTransitions() {
    const now = new Date();
    this.logger.log(`[${now.toISOString()}] 开始检查订单状态自动转换`);

    await this.autoTransitionToInProgress(now);
    await this.autoTransitionToCompleted(now);

    this.logger.log(`[${now.toISOString()}] 订单状态自动转换检查完成`);
  }

  private async autoTransitionToInProgress(now: Date) {
    const thirtyMinLater = new Date(now.getTime() + 30 * 60 * 1000);

    const orders = await this.prisma.order.findMany({
      where: {
        status: { in: ['pending_home', 'pending_shop'] },
        startTime: { lte: thirtyMinLater },
      },
    });

    if (orders.length === 0) return;

    this.logger.log(`发现 ${orders.length} 个订单需要自动转换为 in_progress`);

    for (const order of orders) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: { status: 'in_progress' },
          });

          if (order.clientUserId) {
            const preview = '订单即将开始，请做好准备～';
            const conversation = await tx.conversation.upsert({
              where: {
                clientId_techId: {
                  clientId: order.clientUserId,
                  techId: order.technicianId,
                },
              },
              update: { lastMessage: preview, lastMessageAt: new Date() },
              create: {
                clientId: order.clientUserId,
                techId: order.technicianId,
                lastMessage: preview,
                lastMessageAt: new Date(),
              },
            });

            await tx.message.create({
              data: {
                conversationId: conversation.id,
                senderType: 'system',
                senderId: 0,
                receiverType: 'client',
                receiverId: order.clientUserId,
                messageType: 'system',
                content: preview,
                relatedType: 'order',
                relatedId: order.id,
              },
            });

            await tx.message.create({
              data: {
                conversationId: conversation.id,
                senderType: 'system',
                senderId: 0,
                receiverType: 'technician',
                receiverId: order.technicianId,
                messageType: 'system',
                content: preview,
                relatedType: 'order',
                relatedId: order.id,
              },
            });
          }
        });

        this.logger.log(`订单 #${order.id} 自动从 ${order.status} 转换为 in_progress`);
      } catch (error) {
        this.logger.error(`订单 #${order.id} 自动转换为 in_progress 失败: ${error.message}`, error.stack);
      }
    }
  }

  private async autoTransitionToCompleted(now: Date) {
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const orders = await this.prisma.order.findMany({
      where: {
        status: 'in_progress',
        endTime: { lte: twentyFourHoursAgo },
      },
    });

    if (orders.length === 0) return;

    this.logger.log(`发现 ${orders.length} 个订单需要自动转换为 completed`);

    for (const order of orders) {
      try {
        const revenueExists = await this.prisma.revenue.findUnique({
          where: { orderId: order.id },
        });

        await this.prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: { status: 'completed', completedAt: new Date() },
          });

          if (!revenueExists) {
            await tx.revenue.create({
              data: {
                revenueNo: `RV${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
                orderId: order.id,
                technicianId: order.technicianId,
                customerId: order.customerId,
                amount: order.quotePrice ?? 0,
                recognizedAt: new Date(),
                status: 'confirmed',
              },
            });
          }

          if (order.clientUserId) {
            const preview = '服务已完成，感谢使用～';
            const conversation = await tx.conversation.upsert({
              where: {
                clientId_techId: {
                  clientId: order.clientUserId,
                  techId: order.technicianId,
                },
              },
              update: { lastMessage: preview, lastMessageAt: new Date() },
              create: {
                clientId: order.clientUserId,
                techId: order.technicianId,
                lastMessage: preview,
                lastMessageAt: new Date(),
              },
            });

            await tx.message.create({
              data: {
                conversationId: conversation.id,
                senderType: 'system',
                senderId: 0,
                receiverType: 'client',
                receiverId: order.clientUserId,
                messageType: 'system',
                content: preview,
                relatedType: 'order',
                relatedId: order.id,
              },
            });
          }
        });

        this.logger.log(`订单 #${order.id} 自动从 in_progress 转换为 completed`);
      } catch (error) {
        this.logger.error(`订单 #${order.id} 自动转换为 completed 失败: ${error.message}`, error.stack);
      }
    }
  }
}
```

- [ ] **Step 4: Create orders.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ClientOrdersService } from './client-orders.service';
import { TechnicianOrdersController } from './technician-orders.controller';
import { ClientOrdersController } from './client-orders.controller';
import { OrdersScheduler } from './orders.scheduler';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TechnicianOrdersController, ClientOrdersController],
  providers: [OrdersService, ClientOrdersService, OrdersScheduler],
  exports: [OrdersService, ClientOrdersService],
})
export class OrdersModule {}
```

---

## Task 5: Backend — Update AppModule and Dependent Services

**Files:**
- Modify: `backend/src/app.module.ts`
- Modify: `backend/src/client-home/client-home.service.ts`
- Modify: `backend/src/custom-service-requests/custom-service-requests.service.ts`
- Modify: `backend/src/dashboard/dashboard.service.ts`
- Modify: `backend/src/schedules/schedules.service.ts`
- Modify: `backend/src/customers/customers.service.ts`
- Modify: `backend/src/technicians/technicians.service.ts`
- Modify: `backend/src/revenues/revenues.service.ts`

- [ ] **Step 1: Update app.module.ts**

Replace imports:
```typescript
// Remove these imports:
import { QuotesModule } from './quotes/quotes.module';
import { BookingsModule } from './bookings/bookings.module';
import { ClientBookingsModule } from './client-bookings/client-bookings.module';

// Add this import:
import { OrdersModule } from './orders/orders.module';
```

In the `imports` array, replace `QuotesModule`, `BookingsModule`, `ClientBookingsModule` with `OrdersModule`.

- [ ] **Step 2: Update client-home.service.ts**

Replace all `this.prisma.booking` with `this.prisma.order`. In the home response mapping, rename `bookingNo` to `orderNo` and remove any `quote` references. Update `relatedType: 'booking'` to `'order'` in message creation if present.

- [ ] **Step 3: Update custom-service-requests.service.ts**

Replace `tx.booking.create(...)` with `tx.order.create(...)`. Remove Quote creation. Update field names:
- `bookingNo` → `orderNo` (use `generateOrderNo()` instead of `generateBookingNo()`)
- `quoteId` field removed
- Status remains `pending_quote`
- Set `quotePrice: 0` instead of creating a separate Quote

- [ ] **Step 4: Update dashboard.service.ts**

Replace all `this.prisma.booking` with `this.prisma.order`. Update status filters:
- `confirmed` → remove or replace with `pending_home` + `pending_shop` counts
- Add `pendingHome` and `pendingShop` to the stats response

- [ ] **Step 5: Update schedules.service.ts**

Replace `this.prisma.booking.count()` with `this.prisma.order.count()`. Update field references.

- [ ] **Step 6: Update customers.service.ts**

In the `findOne` include, rename `bookings` to `orders`:
```typescript
orders: {
  select: { id: true, orderNo: true, startTime: true, status: true, createdAt: true, isDepositPaid: true },
}
```

- [ ] **Step 7: Update technicians.service.ts**

In the `findOne` include, rename `bookings` to `orders`:
```typescript
orders: true
```

- [ ] **Step 8: Update revenues.service.ts**

Update all includes:
- `booking: { select: { id: true, bookingNo: true } }` → `order: { select: { id: true, orderNo: true } }`
- `r.booking?.bookingNo` → `r.order?.orderNo`

- [ ] **Step 9: Delete old booking and quote modules**

```bash
rm -rf backend/src/bookings
rm -rf backend/src/client-bookings
rm -rf backend/src/quotes
```

- [ ] **Step 10: Compile check**

```bash
cd backend && npx tsc --noEmit
```

Expected: Clean compilation (no errors).

- [ ] **Step 11: Commit**

```bash
git add backend/
git commit -m "feat(backend): refactor Booking+Quote into Order model with new status flow"
```

---

## Task 6: Backend — Update Seed Data and Remaining References

**Files:**
- Modify: `backend/src/demo-data.seed.ts`
- Modify: `backend/src/client-messages/client-messages.service.ts` (if references booking)
- Modify: `backend/src/technician-messages/technician-messages.service.ts` (if references booking)

- [ ] **Step 1: Update demo-data.seed.ts**

Replace all Booking references with Order:
- `DemoBookingSeed` → `DemoOrderSeed`
- `bookingNos` → `orderNos`
- `bookingNo` → `orderNo`
- Remove Quote seed creation
- Use new status values (`pending_home`/`pending_shop` instead of `confirmed`)

- [ ] **Step 2: Verify all 'booking' string references**

```bash
cd backend && grep -r "'booking'" src/ --include="*.ts" | grep -v node_modules | grep -v ".d.ts"
```

Update any remaining `relatedType: 'booking'` to `'order'` in message services.

- [ ] **Step 3: Commit**

```bash
git add backend/
git commit -m "fix(backend): update seed data and remaining booking references"
```

---

## Task 7: Client Frontend — Update Service Layer

**Files:**
- Create: `client-frontend/src/services/order.ts`
- Modify: `client-frontend/src/services/customServiceRequest.ts` (if references booking)

- [ ] **Step 1: Create order.ts service**

Rewrite `client-frontend/src/services/booking.ts` as `client-frontend/src/services/order.ts`:

Key changes:
1. `Booking` interface → `Order` interface
2. `bookingNo` → `orderNo`
3. Remove `quote` field from interface
4. Add `quoteRemark`, `quotedAt` fields
5. Update status type: remove `confirmed`, add `pending_home`, `pending_shop`
6. API endpoints: `/bookings` → `/orders`
7. Add `getTrips()` method hitting `/orders/trips`

```typescript
export interface Order {
  id: number;
  orderNo: string;
  status: string;
  source: string | null;
  startTime: string;
  endTime: string;
  serviceType: string | null;
  remark: string | null;
  address: string | null;
  quotePrice: number | null;
  quoteRemark: string | null;
  quotedAt: string | null;
  depositAmount: number;
  isDepositPaid: boolean;
  technician: { id: number; name: string; phone: string } | null;
  customer: { id: number; name: string; phone: string } | null;
  clientAddress: any;
  createdAt: string;
  updatedAt: string;
}

export const orderService = {
  getOrders: () => api.get<Order[]>('/client/orders').then(r => r.data),
  getTrips: () => api.get<Order[]>('/client/orders/trips').then(r => r.data),
  getOrder: (id: number) => api.get<Order>(`/client/orders/${id}`).then(r => r.data),
  createOrder: (data: CreateOrderDto) => api.post<Order>('/client/orders', data).then(r => r.data),
  createOrderFromDesign: (data: CreateOrderFromDesignDto) => api.post<Order>('/client/orders/from-design', data).then(r => r.data),
  updateOrder: (id: number, data: UpdateOrderDto) => api.patch<Order>(`/client/orders/${id}`, data).then(r => r.data),
  agreeQuote: (id: number) => api.post(`/client/orders/${id}/agree`).then(r => r.data),
  rejectQuote: (id: number, reason: string) => api.post(`/client/orders/${id}/reject-quote`, { reason }).then(r => r.data),
  updateOrderStatus: (id: number, data: UpdateOrderStatusDto) => api.patch(`/client/orders/${id}/status`, data).then(r => r.data),
};
```

- [ ] **Step 2: Delete old booking.ts**

```bash
rm client-frontend/src/services/booking.ts
```

- [ ] **Step 3: Verify no remaining booking service imports**

```bash
cd client-frontend && grep -r "booking" src/ --include="*.ts" --include="*.tsx" -l
```

Expected: Only `order` references remain.

---

## Task 8: Client Frontend — Update Pages

**Files:**
- Modify: `client-frontend/src/pages/BookingList.tsx`
- Modify: `client-frontend/src/pages/BookingDetail.tsx`
- Modify: `client-frontend/src/pages/CreateBooking.tsx`
- Modify: `client-frontend/src/pages/Home.tsx`
- Modify: `client-frontend/src/pages/DesignDetail.tsx`
- Modify: `client-frontend/src/App.tsx`

- [ ] **Step 1: Update BookingList.tsx — Split into Trips + Orders tabs**

Replace the current 3-tab structure ("Upcoming", "Completed", "Cancelled") with 2 tabs:
- **行程** tab: Calls `orderService.getTrips()`, displays `pending_home/pending_shop/in_progress` orders
- **订单** tab: Calls `orderService.getOrders()`, displays all orders with status grouping

Update status labels:
```typescript
const STATUS_LABELS: Record<string, string> = {
  pending_quote: '待报价',
  pending_agree: '待同意',
  pending_confirm: '待确认',
  pending_home: '待上门',
  pending_shop: '待到店',
  in_progress: '服务中',
  completed: '已完成',
  cancelled: '已取消',
};
```

Update status badge colors:
```typescript
const STATUS_COLORS: Record<string, string> = {
  pending_quote: 'bg-amber-100 text-amber-700',
  pending_agree: 'bg-blue-100 text-blue-700',
  pending_confirm: 'bg-purple-100 text-purple-700',
  pending_home: 'bg-green-100 text-green-700',
  pending_shop: 'bg-green-100 text-green-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
};
```

Empty trip state: "暂无行程" with a "立即预约" button.

- [ ] **Step 2: Update BookingDetail.tsx — New status labels and actions**

Update the `STATUS_LABELS` and `STATUS_COLORS` maps as above.

Update action buttons:
- `pending_quote`: "取消订单"
- `pending_agree`: "拒绝报价" + "同意报价" (gradient button)
- `pending_confirm`: "取消订单"
- `pending_home` / `pending_shop`: No action buttons (view only)
- `in_progress`: No action buttons (view only)
- `completed`: No action buttons
- `cancelled`: No action buttons

Remove all `quote` references from the detail display. Replace with direct `quotePrice` and `quoteRemark` display.

- [ ] **Step 3: Update CreateBooking.tsx — API calls**

Replace `bookingService.createBooking()` with `orderService.createOrder()`.
Replace `bookingService.createBookingFromDesign()` with `orderService.createOrderFromDesign()`.

- [ ] **Step 4: Update Home.tsx — Trip card**

Replace booking data fetch with trip data fetch:
```typescript
const trips = await orderService.getTrips();
```

Display trip card when trips exist, show "暂无行程" when empty.

- [ ] **Step 5: Update DesignDetail.tsx**

Replace `bookingService` import with `orderService`. Update `createBookingFromDesign` call.

- [ ] **Step 6: Update App.tsx imports**

Update any route-level imports if file names changed.

- [ ] **Step 7: Commit**

```bash
git add client-frontend/
git commit -m "feat(client): update frontend for order/trip flow"
```

---

## Task 9: Technician Frontend — Update Service Layer

**Files:**
- Create: `technician-frontend/src/services/orders.ts`
- Modify: `technician-frontend/src/services/technicianData.ts`

- [ ] **Step 1: Create orders.ts service**

Rewrite `technician-frontend/src/services/bookings.ts` as `technician-frontend/src/services/orders.ts`:

Key changes:
1. `TechnicianBooking` → `TechnicianOrder` type
2. `bookingNo` → `orderNo`
3. Remove `quote` references
4. Add `quoteRemark`, `quotedAt` fields
5. Status type: remove `confirmed`, add `pending_home`, `pending_shop`
6. API endpoints: `/bookings` → `/orders`, `/technician/bookings` → `/technician/orders`
7. Add `getTrips()` method hitting `/technician/orders/trips`
8. Update `getAllowedActions()` to use new status names

- [ ] **Step 2: Update technicianData.ts**

Update types:
- `BookingStatus` → `OrderStatus`
- `TechnicianBooking` → `TechnicianOrder`
- `bookingStatusLabels` → `orderStatusLabels` with new statuses
- `bookingStatusClasses` → `orderStatusClasses`
- `bookingStatusActions` → `orderStatusActions`
- `fallbackBookings` → `fallbackOrders`

New status maps:
```typescript
export const orderStatusLabels: Record<string, string> = {
  pending_quote: '待报价',
  pending_agree: '待同意',
  pending_confirm: '待确认',
  pending_home: '待上门',
  pending_shop: '待到店',
  in_progress: '服务中',
  completed: '已完成',
  cancelled: '已取消',
};

export const orderStatusActions: Record<string, string[]> = {
  pending_quote: ['review', 'cancel'],
  pending_agree: ['cancel'],
  pending_confirm: ['confirm', 'cancel'],
  pending_home: [],
  pending_shop: [],
  in_progress: ['complete'],
  completed: [],
  cancelled: [],
};
```

- [ ] **Step 3: Delete old bookings.ts**

```bash
rm technician-frontend/src/services/bookings.ts
```

- [ ] **Step 4: Verify imports**

```bash
cd technician-frontend && grep -r "bookingsService\|from.*bookings" src/ --include="*.ts" --include="*.tsx" -l
```

Expected: All references updated to `ordersService` / `orders`.

---

## Task 10: Technician Frontend — Update Pages

**Files:**
- Modify: `technician-frontend/src/pages/HomePage.tsx`
- Modify: `technician-frontend/src/pages/OrdersPage.tsx`
- Modify: `technician-frontend/src/pages/BookingDetailPage.tsx`
- Modify: `technician-frontend/src/pages/SchedulePage.tsx`
- Modify: `technician-frontend/src/pages/MessagesPage.tsx`
- Modify: `technician-frontend/src/pages/CustomersPage.tsx`
- Modify: `technician-frontend/src/App.tsx`

- [ ] **Step 1: Update HomePage.tsx — Trip card**

Replace bookings fetch with trips fetch:
```typescript
const trips = await ordersService.getTrips();
```

Display "暂无行程" when no trips exist.

- [ ] **Step 2: Update OrdersPage.tsx — Split into Trips + Orders**

Replace current tab structure with:
- **行程** tab: `ordersService.getTrips()` — shows `pending_home/pending_shop/in_progress`
- **订单** tab: `ordersService.list()` — shows all orders with status filters

Update status labels and action buttons per the new status flow.

- [ ] **Step 3: Update BookingDetailPage.tsx**

Update all status labels, action buttons, and API calls to use `ordersService`.

Remove `quote` references. Display `quotePrice` and `quoteRemark` directly.

Action buttons per status:
- `pending_quote`: "提交报价" + "取消订单"
- `pending_agree`: "取消订单"
- `pending_confirm`: "确认订单" + "取消订单"
- `pending_home` / `pending_shop`: No actions
- `in_progress`: "确认完成"
- `completed`: No actions

- [ ] **Step 4: Update SchedulePage.tsx**

Replace `bookingsService` imports with `ordersService`. Update type references.

- [ ] **Step 5: Update MessagesPage.tsx**

Replace `bookingsService` imports with `ordersService`. Update type references.

- [ ] **Step 6: Update CustomersPage.tsx**

Replace `bookingStatusClasses`, `bookingStatusLabels` imports with new names.

- [ ] **Step 7: Update App.tsx**

Update lazy imports if file paths changed.

- [ ] **Step 8: Commit**

```bash
git add technician-frontend/
git commit -m "feat(technician): update frontend for order/trip flow"
```

---

## Task 11: Admin Frontend — Update References

**Files:**
- Modify: `admin-frontend/src/services/booking.ts`
- Modify: `admin-frontend/src/services/revenue.ts`
- Modify: `admin-frontend/src/services/dashboard.ts`
- Modify: `admin-frontend/src/pages/Bookings.tsx`
- Modify: `admin-frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Update admin booking service**

Rename `booking.ts` to `order.ts`. Update `Booking` interface to `Order`, `bookingNo` to `orderNo`. Update API endpoints from `/bookings` to `/orders`. Add `pending_home`, `pending_shop` to status type.

- [ ] **Step 2: Update admin revenue service**

Update `bookingId` to `orderId`, `booking?.bookingNo` to `order?.orderNo`.

- [ ] **Step 3: Update admin dashboard service**

Update `bookingStats` to include `pendingHome`, `pendingShop` counts. Remove `confirmed` count.

- [ ] **Step 4: Update admin pages**

Update `Bookings.tsx` and `Dashboard.tsx` to use new service and status labels.

- [ ] **Step 5: Commit**

```bash
git add admin-frontend/
git commit -m "feat(admin): update admin frontend for order model"
```

---

## Task 12: Full Verification

- [ ] **Step 1: Backend compilation**

```bash
cd backend && npx tsc --noEmit
```

Expected: Clean compilation.

- [ ] **Step 2: Backend startup**

```bash
cd backend && npm run start:dev
```

Expected: Server starts without errors.

- [ ] **Step 3: Client frontend build**

```bash
cd client-frontend && npm run build
```

Expected: Clean build.

- [ ] **Step 4: Technician frontend build**

```bash
cd technician-frontend && npm run build
```

Expected: Clean build.

- [ ] **Step 5: Admin frontend build**

```bash
cd admin-frontend && npm run build
```

Expected: Clean build.

- [ ] **Step 6: Manual test — Create order flow**

1. Login as client, create an order (service type: 上门美甲)
2. Verify order appears with status "待报价"
3. Login as technician, find the order, submit quote
4. Verify order status changes to "待同意"
5. Login as client, agree to quote
6. Verify order status changes to "待确认"
7. Login as technician, confirm order (with deposit)
8. Verify order status changes to "待上门"
9. Verify order appears in trip list on both sides
10. Verify order detail page shows all correct information

- [ ] **Step 7: Commit final state**

```bash
git add -A && git commit -m "feat: complete order/trip flow refactor"
```

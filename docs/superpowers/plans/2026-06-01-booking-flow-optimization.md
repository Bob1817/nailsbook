# Booking Flow Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one-click booking from chat (client & technician), simplify the booking form in chat context, and let technicians generate a WeChat-shareable confirmation link for clients who prefer not to open the app.

**Architecture:** Three independent capabilities layered on top of the existing order system — `ChatBookingSheet` (Flutter bottom sheet widget), backend `pending_client_confirm` status + confirm-token endpoints (no auth), and a Flutter `/confirm/:token` public route. The existing `ClientCreateOrderScreen` and all current API interfaces are left untouched.

**Tech Stack:** Flutter (Dart), NestJS (TypeScript), Prisma ORM, SQLite/PostgreSQL

**Design Spec:** `docs/superpowers/specs/2026-06-01-booking-flow-optimization-design.md`

---

## URL / Prefix Reference

| Layer | Role | Prefix |
|-------|------|--------|
| Flutter `ApiClient._rolePrefix` | client | `/api/client` |
| Flutter `ApiClient._rolePrefix` | technician | `/api/technician` |
| Flutter `ApiClient._rolePrefix` | none (public) | `` (empty) |
| NestJS global prefix | — | `/api` |

So `_api.post('/orders', ...)` from a client becomes `POST /api/client/orders`.  
Public confirm calls use a fresh `ApiClient` with no role prefix → `GET /api/orders/confirm/:token`.

---

## File Map

### New files
| Path | Purpose |
|------|---------|
| `backend/src/orders/public-orders.controller.ts` | No-auth GET/POST confirm-token endpoints |
| `backend/src/orders/dto/confirm-order-token.dto.ts` | (empty placeholder — no body params needed) |
| `mobile-flutter/lib/features/shared/booking/chat_booking_service.dart` | API calls for chat booking & public confirm |
| `mobile-flutter/lib/features/shared/booking/chat_booking_sheet.dart` | Bottom sheet widget (client + technician mode) |
| `mobile-flutter/lib/features/shared/booking/order_confirm_screen.dart` | H5 token confirmation page (no auth) |

### Modified files
| Path | Change |
|------|--------|
| `backend/prisma/schema.prisma` | Add `confirmToken`, `confirmTokenExpiresAt`, `confirmTokenUsedAt` to `Order` |
| `backend/.env.example` | Add `WEBAPP_URL` |
| `backend/src/orders/dto/create-technician-order.dto.ts` | Add `clientUserId?`, `price?`, `shareToClient?`, `customDescription?`, `customImages?` |
| `backend/src/orders/orders.service.ts` | Add `pending_client_confirm` status; handle `clientUserId`, token generation |
| `backend/src/orders/dto/create-client-order.dto.ts` | Add `chatMode?: boolean` |
| `backend/src/orders/client-orders.service.ts` | Skip service-content validation when `chatMode: true` |
| `backend/src/orders/orders.module.ts` | Register `PublicOrdersController` |
| `mobile-flutter/lib/features/shared/chat/conversations_screen.dart` | Pass `otherPartyId` when navigating to `ChatScreen` |
| `mobile-flutter/lib/features/shared/chat/chat_screen.dart` | Add `otherPartyId` param + "发起预约" header button |
| `mobile-flutter/lib/app/router.dart` | Add `/confirm/:token` route + bypass auth redirect |

---

## Task 1: Backend — add confirm-token fields to Prisma schema

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Open `backend/prisma/schema.prisma`. Find the `Order` model (starts around line 123). After the `quotedAt DateTime?` line, add three fields:**

```prisma
  confirmToken          String?
  confirmTokenExpiresAt DateTime?
  confirmTokenUsedAt    DateTime?
```

The resulting block should look like:
```prisma
  quotePrice             Float?
  quoteRemark            String?
  quotedAt               DateTime?
  confirmToken          String?
  confirmTokenExpiresAt DateTime?
  confirmTokenUsedAt    DateTime?
  status                 String    @default("pending_quote")
```

- [ ] **Run the migration**

```bash
cd backend
npx prisma migrate dev --name add_order_confirm_token
```

Expected output: `✔  Your database is now in sync with your schema.`

- [ ] **Commit**

```bash
git add backend/prisma/
git commit -m "feat(db): add confirm token fields to Order model"
```

---

## Task 2: Backend — update technician order DTO for chat booking

**Files:**
- Modify: `backend/src/orders/dto/create-technician-order.dto.ts`
- Modify: `backend/.env.example`

- [ ] **Replace the entire contents of `create-technician-order.dto.ts`:**

```typescript
import {
  IsInt, IsString, IsOptional, IsDateString, IsBoolean, IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTechnicianOrderDto {
  @ApiPropertyOptional({ description: '客户ID（Customer表）', example: 1 })
  @IsOptional()
  @IsInt()
  customerId?: number;

  @ApiPropertyOptional({ description: '客户用户ID（从聊天发起时使用）', example: 5 })
  @IsOptional()
  @IsInt()
  clientUserId?: number;

  @ApiProperty({ description: '服务名称', example: '基础美甲护理' })
  @IsString()
  serviceName: string;

  @ApiProperty({ description: '开始时间 ISO 8601', example: '2026-06-02T14:00:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: '结束时间 ISO 8601', example: '2026-06-02T16:00:00.000Z' })
  @IsDateString()
  endTime: string;

  @ApiProperty({ description: '服务地址', example: '上海市浦东新区张江路100号' })
  @IsString()
  address: string;

  @ApiPropertyOptional({ description: '服务类型', example: '上门美甲' })
  @IsOptional()
  @IsString()
  serviceType?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: '自定义服务说明（聊天预约）' })
  @IsOptional()
  @IsString()
  customDescription?: string;

  @ApiPropertyOptional({ description: '参考图片 URL 列表' })
  @IsOptional()
  customImages?: string[];

  @ApiPropertyOptional({ description: '约定价格（元）。shareToClient=true 时必填', example: 180 })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: '是否生成微信确认链接', example: true })
  @IsOptional()
  @IsBoolean()
  shareToClient?: boolean;
}
```

- [ ] **Add `WEBAPP_URL` to `backend/.env.example` after the `UPLOAD_BASE_URL` line:**

```
WEBAPP_URL=http://localhost:3000
```

- [ ] **Commit**

```bash
git add backend/src/orders/dto/create-technician-order.dto.ts backend/.env.example
git commit -m "feat(orders): extend technician order DTO for chat booking + WeChat share"
```

---

## Task 3: Backend — update OrdersService to handle token generation

**Files:**
- Modify: `backend/src/orders/orders.service.ts`

- [ ] **Add `pending_client_confirm` to the `OrderStatus` type (around line 13):**

```typescript
type OrderStatus =
  | 'pending_quote'
  | 'pending_agree'
  | 'pending_confirm'
  | 'pending_client_confirm'
  | 'pending_home'
  | 'pending_shop'
  | 'in_progress'
  | 'completed'
  | 'cancelled';
```

- [ ] **Add `pending_client_confirm` to `STATUS_TRANSITIONS` (around line 23):**

```typescript
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_quote: ['pending_agree', 'cancelled'],
  pending_agree: ['pending_confirm', 'pending_quote', 'cancelled'],
  pending_confirm: ['pending_home', 'pending_shop', 'cancelled'],
  pending_client_confirm: ['pending_confirm', 'cancelled'],
  pending_home: ['in_progress'],
  pending_shop: ['in_progress'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
};
```

- [ ] **Replace the entire `createForTechnician` method (lines 45–81) with:**

```typescript
async createForTechnician(
  technicianId: number,
  dto: CreateTechnicianOrderDto,
) {
  // Resolve Customer record: accept either customerId or clientUserId
  let customerId: number;
  if (dto.customerId) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) throw new NotFoundException('客户不存在');
    if (customer.technicianId !== technicianId) throw new ForbiddenException('无权为该客户创建订单');
    customerId = dto.customerId;
  } else if (dto.clientUserId) {
    const customer = await this.prisma.customer.findFirst({
      where: { technicianId, clientUserId: dto.clientUserId },
    });
    if (!customer) throw new NotFoundException('未找到该客户的绑定记录');
    customerId = customer.id;
  } else {
    throw new BadRequestException('customerId 或 clientUserId 必须提供一个');
  }

  if (dto.shareToClient && dto.price == null) {
    throw new BadRequestException('生成微信确认链接时，价格为必填项');
  }

  const confirmToken = dto.shareToClient
    ? (crypto.randomUUID as () => string)()
    : null;
  const confirmTokenExpiresAt = confirmToken
    ? new Date(Date.now() + 24 * 60 * 60 * 1000)
    : null;

  const order = await this.prisma.order.create({
    data: {
      orderNo: this.generateOrderNo(),
      technicianId,
      customerId,
      clientUserId: dto.clientUserId ?? null,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      address: dto.address,
      serviceType: dto.serviceType || null,
      status: dto.shareToClient ? 'pending_client_confirm' : 'pending_quote',
      remark: dto.note || null,
      customDescription: dto.customDescription || null,
      customImages:
        dto.customImages?.length ? JSON.stringify(dto.customImages) : null,
      quotePrice: dto.price ?? 0,
      confirmToken,
      confirmTokenExpiresAt,
    },
    include: {
      technician: { select: { id: true, name: true, phone: true } },
      customer: {
        select: { id: true, name: true, phone: true, avatarUrl: true },
      },
    },
  });

  const result: Record<string, unknown> = { ...order };
  if (confirmToken) {
    const webappUrl = process.env.WEBAPP_URL ?? 'http://localhost:3000';
    result['confirmUrl'] = `${webappUrl}/confirm/${confirmToken}`;
  }
  return result;
}
```

- [ ] **Verify `crypto` is already imported at the top of the file** (line 9: `import * as crypto from 'crypto';`). If `randomUUID` gives a TypeScript error, use `require('crypto').randomUUID()` instead or cast:

```typescript
const confirmToken = dto.shareToClient
  ? require('crypto').randomUUID() as string
  : null;
```

- [ ] **Start the backend and hit the existing technician create endpoint to verify no regression:**

```bash
cd backend && npm run start:dev
# In another terminal:
curl -X POST http://localhost:3000/api/technician/orders \
  -H "Authorization: Bearer <technician_token>" \
  -H "Content-Type: application/json" \
  -d '{"customerId":1,"serviceName":"测试","startTime":"2026-06-10T14:00:00.000Z","endTime":"2026-06-10T16:00:00.000Z","address":"测试地址"}'
# Expected: 200 with order object, status=pending_quote
```

- [ ] **Commit**

```bash
git add backend/src/orders/orders.service.ts
git commit -m "feat(orders): technician chat booking with token generation + clientUserId support"
```

---

## Task 4: Backend — add public confirm-token endpoints

**Files:**
- Create: `backend/src/orders/public-orders.controller.ts`
- Modify: `backend/src/orders/orders.module.ts`

- [ ] **Create `backend/src/orders/public-orders.controller.ts`:**

```typescript
import {
  Controller, Get, Param, Post,
  NotFoundException, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma/prisma.service';

@ApiTags('公开-预约确认')
@Controller('orders/confirm')
export class PublicOrdersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':token')
  @ApiOperation({ summary: '查询待确认预约详情（无需登录）' })
  @ApiParam({ name: 'token', description: '确认 token' })
  async getByToken(@Param('token') token: string) {
    const order = await this.prisma.order.findFirst({
      where: { confirmToken: token },
      include: {
        technician: {
          select: { id: true, name: true, phone: true, avatarUrl: true },
        },
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    if (!order) throw new NotFoundException('预约链接无效');

    if (order.confirmTokenExpiresAt && order.confirmTokenExpiresAt < new Date()) {
      return { expired: true, message: '链接已过期，请联系美甲师重新发送' };
    }

    if (order.confirmTokenUsedAt) {
      return {
        alreadyConfirmed: true,
        message: order.status === 'cancelled' ? '预约已取消' : '预约已确认',
        status: order.status,
      };
    }

    return {
      id: order.id,
      orderNo: order.orderNo,
      price: order.quotePrice,
      startTime: order.startTime,
      serviceType: order.serviceType,
      address: order.address,
      remark: order.remark,
      customDescription: order.customDescription,
      technician: order.technician,
      status: order.status,
    };
  }

  @Post(':token/accept')
  @ApiOperation({ summary: '客户确认预约（无需登录）' })
  async acceptByToken(@Param('token') token: string) {
    const order = await this.prisma.order.findFirst({
      where: { confirmToken: token },
    });
    if (!order) throw new NotFoundException('预约链接无效');
    if (order.confirmTokenExpiresAt && order.confirmTokenExpiresAt < new Date()) {
      throw new BadRequestException('链接已过期，请联系美甲师重新发送');
    }
    if (order.confirmTokenUsedAt) {
      throw new BadRequestException('该链接已使用');
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'pending_confirm',
        confirmTokenUsedAt: new Date(),
        confirmedAt: new Date(),
      },
    });
    return { success: true, message: '预约已确认' };
  }

  @Post(':token/cancel')
  @ApiOperation({ summary: '客户取消预约（无需登录）' })
  async cancelByToken(@Param('token') token: string) {
    const order = await this.prisma.order.findFirst({
      where: { confirmToken: token },
    });
    if (!order) throw new NotFoundException('预约链接无效');
    if (order.confirmTokenExpiresAt && order.confirmTokenExpiresAt < new Date()) {
      throw new BadRequestException('链接已过期');
    }
    if (order.confirmTokenUsedAt) {
      throw new BadRequestException('该链接已使用');
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'cancelled',
        confirmTokenUsedAt: new Date(),
        cancelledAt: new Date(),
        cancelReason: '客户通过链接取消',
      },
    });
    return { success: true, message: '预约已取消' };
  }
}
```

- [ ] **Update `backend/src/orders/orders.module.ts`:**

```typescript
import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ClientOrdersService } from './client-orders.service';
import { TechnicianOrdersController } from './technician-orders.controller';
import { ClientOrdersController } from './client-orders.controller';
import { PublicOrdersController } from './public-orders.controller';
import { OrdersScheduler } from './orders.scheduler';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [PrismaModule, ChatModule],
  controllers: [
    TechnicianOrdersController,
    ClientOrdersController,
    PublicOrdersController,
  ],
  providers: [OrdersService, ClientOrdersService, OrdersScheduler],
  exports: [OrdersService, ClientOrdersService],
})
export class OrdersModule {}
```

- [ ] **Verify no-auth access: start backend and test the endpoint directly**

```bash
curl http://localhost:3000/api/orders/confirm/nonexistent-token
# Expected: 404 {"statusCode":404,"message":"预约链接无效"}
# NOT 401 Unauthorized — confirms no auth guard is applied
```

- [ ] **Commit**

```bash
git add backend/src/orders/public-orders.controller.ts backend/src/orders/orders.module.ts
git commit -m "feat(orders): add public no-auth confirm-token endpoints"
```

---

## Task 5: Backend — client chatMode skips service validation

**Files:**
- Modify: `backend/src/orders/dto/create-client-order.dto.ts`
- Modify: `backend/src/orders/client-orders.service.ts`

- [ ] **Read `backend/src/orders/dto/create-client-order.dto.ts` and add at the end of the class:**

```typescript
@ApiPropertyOptional({ description: '从聊天发起的预约，跳过服务内容必填校验' })
@IsOptional()
@IsBoolean()
chatMode?: boolean;
```

Add `IsBoolean` to the existing `class-validator` import line.

- [ ] **In `backend/src/orders/client-orders.service.ts`, find the validation block (around line 68–74):**

```typescript
if (!isCustom && (!dto.selectedServiceIds || dto.selectedServiceIds.length === 0)) {
  throw new BadRequestException('请选择至少一项服务内容或填写自定义需求');
}
```

Replace with:

```typescript
// chatMode: booking initiated from chat; service details agreed verbally, no content required
if (!dto.chatMode && !isCustom && (!dto.selectedServiceIds || dto.selectedServiceIds.length === 0)) {
  throw new BadRequestException('请选择至少一项服务内容或填写自定义需求');
}
```

- [ ] **Commit**

```bash
git add backend/src/orders/dto/create-client-order.dto.ts backend/src/orders/client-orders.service.ts
git commit -m "feat(orders): allow empty service content when chatMode=true"
```

---

## Task 6: Flutter — pass `otherPartyId` through conversation navigation

**Files:**
- Modify: `mobile-flutter/lib/features/shared/chat/conversations_screen.dart`
- Modify: `mobile-flutter/lib/features/shared/chat/chat_screen.dart`

- [ ] **In `conversations_screen.dart`, find `class _MessageItem` (around line 680) and add `otherPartyId`:**

```dart
class _MessageItem {
  final String id;
  final String name;
  final String type;
  final String lastMessage;
  final String time;
  final int unread;
  final int? conversationId;
  final int? otherPartyId;  // ← add

  const _MessageItem({
    required this.id,
    required this.name,
    required this.type,
    required this.lastMessage,
    required this.time,
    required this.unread,
    this.conversationId,
    this.otherPartyId,  // ← add
  });
}
```

- [ ] **In the same file, find the loop that builds `_MessageItem` from conversations (around line 97). Update it to extract `otherPartyId`:**

```dart
for (final conv in _conversations) {
  final conversationId = conv['id'] as int;
  String name;
  int? otherPartyId;
  if (authSession.isClient) {
    final tech = conv['technician'] as Map<String, dynamic>?;
    name = tech?['name']?.toString() ?? '美甲师';
    otherPartyId = tech?['id'] as int?;
  } else {
    final client = conv['client'] as Map<String, dynamic>?;
    name = client?['nickname']?.toString() ?? '客户';
    otherPartyId = client?['id'] as int?;
  }
  items.add(_MessageItem(
    id: 'chat-$conversationId',
    name: name,
    type: 'chat',
    lastMessage: conv['lastMessage']?.toString() ?? '暂无消息',
    time: _formatTime(conv['lastMessageAt']?.toString() ?? ''),
    unread: conv['unreadCount'] as int? ?? 0,
    conversationId: conversationId,
    otherPartyId: otherPartyId,  // ← add
  ));
}
```

- [ ] **Find the `onTap` that navigates to `ChatScreen` (around line 334). Pass `otherPartyId`:**

```dart
builder: (_) => ChatScreen(
  conversationId: item.conversationId!,
  title: item.name,
  otherPartyId: item.otherPartyId,  // ← add
),
```

- [ ] **In `chat_screen.dart`, add `otherPartyId` parameter to `ChatScreen`:**

```dart
class ChatScreen extends StatefulWidget {
  final int conversationId;
  final String title;
  final int? otherPartyId;  // ← add

  const ChatScreen({
    super.key,
    required this.conversationId,
    required this.title,
    this.otherPartyId,  // ← add
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}
```

- [ ] **Run Flutter and open a chat conversation to verify navigation still works:**

```bash
cd mobile-flutter && flutter run
# Open 消息 tab → tap a chat → verify chat screen opens normally
```

- [ ] **Commit**

```bash
git add mobile-flutter/lib/features/shared/chat/
git commit -m "feat(chat): pass otherPartyId when navigating from conversations to chat"
```

---

## Task 7: Flutter — ChatBookingService

**Files:**
- Create: `mobile-flutter/lib/features/shared/booking/chat_booking_service.dart`

- [ ] **Create `mobile-flutter/lib/features/shared/booking/chat_booking_service.dart`:**

```dart
import 'package:nailbook_mobile/core/api/api_client.dart';

class ChatBookingService {
  final ApiClient _api;
  ChatBookingService(this._api);

  /// Client mode: fetch the technician's profile data (service types, shop addresses).
  /// Uses /auth/me which resolves to GET /api/client/auth/me with client rolePrefix.
  Future<Map<String, dynamic>?> fetchTechnicianForClient(int techId) async {
    final profile = await _api.get('/auth/me');
    final techs = (profile['technicians'] as List<dynamic>?) ?? [];
    for (final t in techs) {
      final m = t as Map<String, dynamic>;
      if ((m['id'] as int?) == techId) return m;
    }
    return null;
  }

  /// Client creates a booking from chat. chatMode=true skips server-side
  /// service-content validation. Resolves to POST /api/client/orders.
  Future<void> createClientChatBooking({
    required int techId,
    required String serviceType,
    required String serviceDate,   // 'YYYY-MM-DD'
    required String startTime,     // 'HH:mm'
    int? addressId,
    Map<String, dynamic>? shopAddress,
    String? customDescription,
    List<String>? customImages,
  }) async {
    final body = <String, dynamic>{
      'techId': techId,
      'serviceType': serviceType,
      'serviceDate': serviceDate,
      'startTime': startTime,
      'chatMode': true,
    };
    if (addressId != null) body['addressId'] = addressId;
    if (shopAddress != null) body['shopAddress'] = shopAddress;
    if (customDescription?.trim().isNotEmpty == true) {
      body['customDescription'] = customDescription!.trim();
    }
    if (customImages?.isNotEmpty == true) body['customImages'] = customImages;
    await _api.post('/orders', body: body);
  }

  /// Technician creates a booking from chat for a client.
  /// Resolves to POST /api/technician/orders.
  /// Returns the response map which includes `confirmUrl` when shareToClient=true.
  Future<Map<String, dynamic>> createTechnicianChatBooking({
    required int clientUserId,
    required String serviceType,
    required String serviceDate,   // 'YYYY-MM-DD'
    required String startTimSlot,  // 'HH:mm'
    required String address,
    double? price,
    bool shareToClient = false,
    String? customDescription,
    List<String>? customImages,
  }) async {
    // Build ISO 8601 datetime string from date + time slot
    final dt = DateTime.parse('$serviceDate $startTimSlot:00');
    final isoTime = dt.toIso8601String();

    final body = <String, dynamic>{
      'clientUserId': clientUserId,
      'serviceName': '聊天预约',
      'startTime': isoTime,
      'endTime': isoTime,
      'address': address,
      'serviceType': serviceType,
      'shareToClient': shareToClient,
    };
    if (price != null) body['price'] = price;
    if (customDescription?.trim().isNotEmpty == true) {
      body['customDescription'] = customDescription!.trim();
    }
    if (customImages?.isNotEmpty == true) body['customImages'] = customImages;
    return await _api.post('/orders', body: body);
  }

  /// Fetch token-based order detail. Must be called with a fresh ApiClient
  /// that has no rolePrefix (public endpoint).
  /// Resolves to GET /api/orders/confirm/:token.
  Future<Map<String, dynamic>> fetchConfirmDetail(String token) async {
    return await _api.get('/orders/confirm/$token');
  }

  /// Client confirms via token. No auth. Resolves to POST /api/orders/confirm/:token/accept.
  Future<void> acceptByToken(String token) async {
    await _api.post('/orders/confirm/$token/accept', body: {});
  }

  /// Client cancels via token. No auth. Resolves to POST /api/orders/confirm/:token/cancel.
  Future<void> cancelByToken(String token) async {
    await _api.post('/orders/confirm/$token/cancel', body: {});
  }
}
```

- [ ] **Commit**

```bash
git add mobile-flutter/lib/features/shared/booking/chat_booking_service.dart
git commit -m "feat(booking): add ChatBookingService"
```

---

## Task 8: Flutter — ChatBookingSheet widget

**Files:**
- Create: `mobile-flutter/lib/features/shared/booking/chat_booking_sheet.dart`

- [ ] **Create `mobile-flutter/lib/features/shared/booking/chat_booking_sheet.dart`:**

```dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/auth/auth_session.dart';
import '../../../core/theme/design_tokens.dart';
import '../../client/addresses/client_address_models.dart';
import '../../client/addresses/client_address_service.dart';
import 'chat_booking_service.dart';

const _kTimeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30',
];

/// Shows the chat booking bottom sheet. Returns true if a booking was created.
Future<bool?> showChatBookingSheet(
  BuildContext context, {
  required int otherPartyId,
}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => ChatBookingSheet(otherPartyId: otherPartyId),
  );
}

class ChatBookingSheet extends StatefulWidget {
  final int otherPartyId;
  const ChatBookingSheet({super.key, required this.otherPartyId});

  @override
  State<ChatBookingSheet> createState() => _ChatBookingSheetState();
}

class _ChatBookingSheetState extends State<ChatBookingSheet> {
  bool _loading = true;
  bool _submitting = false;
  bool _uploadingImage = false;
  bool _isClientMode = true;

  Map<String, dynamic>? _techData;
  List<ClientAddress> _addresses = [];

  // Form state
  String _serviceType = '';
  int? _selectedAddressId;
  bool _showInlineAddressForm = false;
  final _nameCtl = TextEditingController();
  final _phoneCtl = TextEditingController();
  final _inlineAddrCtl = TextEditingController();
  String _techAddressText = '';   // technician mode: free text address
  String _serviceDate = '';
  String _startTime = '14:00';
  String _customDescription = '';
  List<String> _customImages = [];
  double? _price;
  bool _shareToClient = false;
  String? _confirmUrl;

  @override
  void initState() {
    super.initState();
    final tomorrow = DateTime.now().add(const Duration(days: 1));
    _serviceDate =
        '${tomorrow.year}-${tomorrow.month.toString().padLeft(2, '0')}-${tomorrow.day.toString().padLeft(2, '0')}';
    _load();
  }

  @override
  void dispose() {
    _nameCtl.dispose();
    _phoneCtl.dispose();
    _inlineAddrCtl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final authSession = context.read<AuthSession>();
    _isClientMode = authSession.isClient;
    final api = context.read<ApiClient>();

    try {
      if (_isClientMode) {
        final svc = ChatBookingService(api);
        final tech = await svc.fetchTechnicianForClient(widget.otherPartyId);
        final addrs = await ClientAddressService(api).list();
        if (mounted) {
          setState(() {
            _techData = tech;
            _addresses = addrs;
            _autoSelectServiceType();
            _autoSelectAddress();
            _loading = false;
          });
        }
      } else {
        if (mounted) setState(() => _loading = false);
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _autoSelectServiceType() {
    final home = _techData?['homeService'] == true;
    final shop = _techData?['shopService'] == true;
    if (home && !shop) _serviceType = '上门美甲';
    if (shop && !home) _serviceType = '到店美甲';
  }

  void _autoSelectAddress() {
    if (_serviceType == '上门美甲' && _addresses.isNotEmpty) {
      final def = _addresses.firstWhere((a) => a.isDefault, orElse: () => _addresses[0]);
      _selectedAddressId = def.id;
    }
  }

  List<String> get _availableTypes {
    if (!_isClientMode) return ['上门美甲', '到店美甲'];
    final home = _techData?['homeService'] == true;
    final shop = _techData?['shopService'] == true;
    if (home && shop) return ['上门美甲', '到店美甲'];
    if (home) return ['上门美甲'];
    if (shop) return ['到店美甲'];
    return [];
  }

  List<Map<String, dynamic>> get _shopAddresses {
    if (!_isClientMode) return [];
    return ((_techData?['shopAddresses'] as List<dynamic>?) ?? [])
        .cast<Map<String, dynamic>>()
        .where((s) => s['enabled'] != false)
        .toList();
  }

  bool get _canSubmit {
    if (_serviceType.isEmpty) return false;
    if (_serviceType == '上门美甲') {
      if (_isClientMode) {
        if (_showInlineAddressForm) {
          return _nameCtl.text.trim().isNotEmpty &&
              _inlineAddrCtl.text.trim().isNotEmpty;
        }
        return _selectedAddressId != null;
      }
      return _techAddressText.trim().isNotEmpty;
    }
    if (_serviceType == '到店美甲' && _isClientMode) {
      return _shopAddresses.isNotEmpty;
    }
    if (!_isClientMode && _shareToClient) return _price != null;
    return true;
  }

  Future<void> _submit() async {
    if (!_canSubmit || _submitting) return;
    setState(() => _submitting = true);
    final api = context.read<ApiClient>();
    final svc = ChatBookingService(api);
    try {
      if (_isClientMode) {
        int? addrId;
        Map<String, dynamic>? shopAddr;
        if (_serviceType == '上门美甲') {
          if (_showInlineAddressForm) {
            final saved = await ClientAddressService(api).create({
              'contactName': _nameCtl.text.trim(),
              'contactPhone': _phoneCtl.text.trim(),
              'fullAddress': _inlineAddrCtl.text.trim(),
              'isDefault': _addresses.isEmpty,
            });
            addrId = saved.id;
          } else {
            addrId = _selectedAddressId;
          }
        } else if (_serviceType == '到店美甲' && _shopAddresses.isNotEmpty) {
          shopAddr = _shopAddresses[0];
        }
        await svc.createClientChatBooking(
          techId: widget.otherPartyId,
          serviceType: _serviceType,
          serviceDate: _serviceDate,
          startTime: _startTime,
          addressId: addrId,
          shopAddress: shopAddr,
          customDescription: _customDescription,
          customImages: _customImages,
        );
        if (mounted) {
          Navigator.pop(context, true);
          ScaffoldMessenger.of(context)
              .showSnackBar(const SnackBar(content: Text('预约已提交')));
        }
      } else {
        final result = await svc.createTechnicianChatBooking(
          clientUserId: widget.otherPartyId,
          serviceType: _serviceType,
          serviceDate: _serviceDate,
          startTimSlot: _startTime,
          address: _techAddressText.trim(),
          price: _price,
          shareToClient: _shareToClient,
          customDescription: _customDescription,
          customImages: _customImages,
        );
        if (_shareToClient && result['confirmUrl'] != null) {
          if (mounted) setState(() { _submitting = false; _confirmUrl = result['confirmUrl'] as String; });
          return;
        }
        if (mounted) {
          Navigator.pop(context, true);
          ScaffoldMessenger.of(context)
              .showSnackBar(const SnackBar(content: Text('预约已创建')));
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('提交失败：$e')));
      }
    } finally {
      if (mounted && _confirmUrl == null) setState(() => _submitting = false);
    }
  }

  Future<void> _pickImage() async {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery);
    if (file == null) return;
    setState(() => _uploadingImage = true);
    try {
      final api = context.read<ApiClient>();
      final resp = await api.uploadMultipart('/uploads/image', file.path, 'image');
      final body = await resp.stream.bytesToString();
      final json = jsonDecode(body) as Map<String, dynamic>;
      final url = json['url'] as String?;
      if (url != null && mounted) setState(() => _customImages = [..._customImages, url]);
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('图片上传失败')));
    } finally {
      if (mounted) setState(() => _uploadingImage = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomPad = MediaQuery.of(context).padding.bottom;
    if (_confirmUrl != null) return _buildCopyLinkView(bottomPad);

    return Container(
      margin: EdgeInsets.only(top: MediaQuery.of(context).size.height * 0.2),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          _handle(),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: DT.primary))
                : ListView(
                    padding: EdgeInsets.fromLTRB(20, 4, 20, bottomPad + 100),
                    children: [
                      const Text('📅 发起预约',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: DT.textPrimary)),
                      const SizedBox(height: 20),
                      ..._buildServiceTypeSection(),
                      ..._buildAddressSection(),
                      _label('预约日期'),
                      _buildDatePicker(),
                      const SizedBox(height: 16),
                      _label('预约时间'),
                      _buildTimeSlots(),
                      const SizedBox(height: 16),
                      if (!_isClientMode) ...[
                        _label('服务价格${_shareToClient ? "（必填）" : "（选填）"}'),
                        _buildPriceField(),
                        const SizedBox(height: 16),
                      ],
                      _label('服务说明（选填）'),
                      _buildNoteField(),
                      const SizedBox(height: 8),
                      _buildImageRow(),
                      if (!_isClientMode) ...[
                        const SizedBox(height: 16),
                        _buildShareToggle(),
                      ],
                    ],
                  ),
          ),
          _buildSubmitBar(bottomPad),
        ],
      ),
    );
  }

  List<Widget> _buildServiceTypeSection() {
    if (_availableTypes.length <= 1) {
      if (_availableTypes.isEmpty) return [];
      return [
        Row(children: [
          _label('服务方式'),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: DT.primarySoft, borderRadius: BorderRadius.circular(999)),
            child: Text(_availableTypes[0],
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: DT.primary)),
          ),
        ]),
        const SizedBox(height: 16),
      ];
    }
    return [
      _label('服务方式'),
      Row(
        children: _availableTypes.map((type) {
          final sel = _serviceType == type;
          return Expanded(
            child: GestureDetector(
              onTap: () => setState(() {
                _serviceType = type;
                _selectedAddressId = null;
                _showInlineAddressForm = false;
                _autoSelectAddress();
              }),
              child: Container(
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: sel ? DT.primarySoft : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: sel ? DT.primary.withOpacity(0.3) : Colors.black.withOpacity(0.06)),
                ),
                alignment: Alignment.center,
                child: Text(type,
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500,
                        color: sel ? DT.primary : DT.textSecondary)),
              ),
            ),
          );
        }).toList(),
      ),
      const SizedBox(height: 16),
    ];
  }

  List<Widget> _buildAddressSection() {
    if (_serviceType != '上门美甲') {
      if (_serviceType == '到店美甲' && _isClientMode && _shopAddresses.isNotEmpty) {
        final shop = _shopAddresses[0];
        final addr = [shop['province'], shop['city'], shop['district'], shop['detailAddress']]
            .where((s) => s != null).join(' ');
        return [
          _label('门店地址'),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12)),
            child: Row(children: [
              const Icon(Icons.store_rounded, color: DT.primary, size: 16),
              const SizedBox(width: 8),
              Expanded(child: Text(addr.isNotEmpty ? addr : shop['name']?.toString() ?? '',
                  style: const TextStyle(fontSize: 13, color: DT.textPrimary))),
            ]),
          ),
          const SizedBox(height: 16),
        ];
      }
      return [];
    }
    final widgets = <Widget>[_label(_isClientMode ? '上门地址' : '客户地址')];
    if (_isClientMode) {
      widgets.add(_buildClientAddressWidget());
    } else {
      widgets.add(TextField(
        maxLines: 2,
        onChanged: (v) => setState(() => _techAddressText = v),
        decoration: InputDecoration(
          hintText: '输入客户上门地址...',
          filled: true, fillColor: const Color(0xFFF8FAFC),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
        ),
      ));
    }
    widgets.add(const SizedBox(height: 16));
    return widgets;
  }

  Widget _buildClientAddressWidget() {
    if (_showInlineAddressForm) {
      return Column(children: [
        _textField(_nameCtl, '姓名'),
        const SizedBox(height: 8),
        _textField(_phoneCtl, '手机号', type: TextInputType.phone),
        const SizedBox(height: 8),
        _textField(_inlineAddrCtl, '详细地址', maxLines: 2),
      ]);
    }
    if (_addresses.isEmpty) {
      return GestureDetector(
        onTap: () => setState(() => _showInlineAddressForm = true),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12),
            border: Border.all(color: DT.primary.withOpacity(0.2)),
          ),
          child: Row(children: const [
            Icon(Icons.add_location_alt_rounded, color: DT.primary, size: 18),
            SizedBox(width: 8),
            Text('添加上门地址', style: TextStyle(color: DT.primary, fontSize: 14, fontWeight: FontWeight.w500)),
          ]),
        ),
      );
    }
    if (_addresses.length > 1) {
      return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
          decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12)),
          child: DropdownButton<int>(
            value: _selectedAddressId,
            isExpanded: true, underline: const SizedBox(),
            items: _addresses.map((a) => DropdownMenuItem(
              value: a.id,
              child: Text(a.fullAddress, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13)),
            )).toList(),
            onChanged: (v) => setState(() => _selectedAddressId = v),
          ),
        ),
        const SizedBox(height: 8),
        GestureDetector(
          onTap: () => setState(() { _showInlineAddressForm = true; _selectedAddressId = null; }),
          child: Row(children: const [
            Icon(Icons.add_circle_outline, color: DT.primary, size: 16),
            SizedBox(width: 4),
            Text('+ 新增地址', style: TextStyle(fontSize: 13, color: DT.primary)),
          ]),
        ),
      ]);
    }
    // Single address
    final addr = _addresses[0];
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12)),
      child: Row(children: [
        const Icon(Icons.location_on_rounded, color: DT.primary, size: 16),
        const SizedBox(width: 8),
        Expanded(child: Text(addr.fullAddress, style: const TextStyle(fontSize: 13, color: DT.textPrimary))),
        GestureDetector(
          onTap: () => setState(() { _showInlineAddressForm = true; _selectedAddressId = null; }),
          child: const Text('更换', style: TextStyle(fontSize: 12, color: DT.primary)),
        ),
      ]),
    );
  }

  Widget _buildDatePicker() {
    return GestureDetector(
      onTap: () async {
        final now = DateTime.now();
        final picked = await showDatePicker(
          context: context,
          initialDate: now.add(const Duration(days: 1)),
          firstDate: now,
          lastDate: now.add(const Duration(days: 60)),
        );
        if (picked != null && mounted) {
          setState(() {
            _serviceDate =
                '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
          });
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12)),
        child: Row(children: [
          const Icon(Icons.calendar_today_rounded, size: 16, color: DT.primary),
          const SizedBox(width: 8),
          Text(_serviceDate, style: const TextStyle(fontSize: 14, color: DT.textPrimary)),
          const Spacer(),
          Icon(Icons.chevron_right_rounded, size: 18, color: Colors.grey.shade400),
        ]),
      ),
    );
  }

  Widget _buildTimeSlots() {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 4, crossAxisSpacing: 8, mainAxisSpacing: 8, childAspectRatio: 2),
      itemCount: _kTimeSlots.length,
      itemBuilder: (_, i) {
        final t = _kTimeSlots[i];
        final sel = _startTime == t;
        return GestureDetector(
          onTap: () => setState(() => _startTime = t),
          child: Container(
            alignment: Alignment.center,
            decoration: BoxDecoration(
              gradient: sel ? DT.primaryGradient : null,
              color: sel ? null : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(t,
                style: TextStyle(fontSize: 13,
                    fontWeight: sel ? FontWeight.w600 : FontWeight.w400,
                    color: sel ? Colors.white : const Color(0xFF64748B))),
          ),
        );
      },
    );
  }

  Widget _buildPriceField() {
    return TextField(
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      onChanged: (v) => setState(() => _price = double.tryParse(v)),
      decoration: InputDecoration(
        hintText: '输入服务价格',
        prefixText: '¥ ',
        filled: true, fillColor: const Color(0xFFF8FAFC),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: DT.primary, width: 1.5)),
      ),
    );
  }

  Widget _buildNoteField() {
    return TextField(
      maxLines: 3,
      onChanged: (v) => _customDescription = v,
      decoration: InputDecoration(
        hintText: '简短描述美甲需求，或上传参考图片...',
        filled: true, fillColor: const Color(0xFFF8FAFC),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: DT.primary, width: 1.5)),
      ),
    );
  }

  Widget _buildImageRow() {
    return Wrap(
      spacing: 8, runSpacing: 8,
      children: [
        ..._customImages.asMap().entries.map((e) => Stack(children: [
          ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.network(e.value, width: 64, height: 64, fit: BoxFit.cover)),
          Positioned(
            top: 2, right: 2,
            child: GestureDetector(
              onTap: () => setState(() {
                final l = List<String>.from(_customImages);
                l.removeAt(e.key);
                _customImages = l;
              }),
              child: Container(
                width: 18, height: 18,
                decoration: const BoxDecoration(color: Color(0xFFEF4444), shape: BoxShape.circle),
                child: const Icon(Icons.close, color: Colors.white, size: 10),
              ),
            ),
          ),
        ])),
        if (_customImages.length < 3)
          GestureDetector(
            onTap: _uploadingImage ? null : _pickImage,
            child: Container(
              width: 64, height: 64,
              decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(8)),
              child: _uploadingImage
                  ? const Center(child: CircularProgressIndicator(strokeWidth: 2, color: DT.primary))
                  : Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(Icons.add_photo_alternate_outlined, color: Colors.grey.shade400, size: 20),
                Text('添加', style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
              ]),
            ),
          ),
      ],
    );
  }

  Widget _buildShareToggle() {
    return GestureDetector(
      onTap: () => setState(() => _shareToClient = !_shareToClient),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: _shareToClient ? DT.primarySoft : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: _shareToClient ? DT.primary.withOpacity(0.3) : Colors.black.withOpacity(0.06)),
        ),
        child: Row(children: [
          Icon(_shareToClient ? Icons.check_circle_rounded : Icons.circle_outlined,
              color: _shareToClient ? DT.primary : Colors.grey.shade400, size: 20),
          const SizedBox(width: 10),
          const Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('生成微信确认链接', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: DT.textPrimary)),
              Text('创建后生成链接，发给客户在微信中确认预约',
                  style: TextStyle(fontSize: 12, color: DT.textMuted)),
            ]),
          ),
        ]),
      ),
    );
  }

  Widget _buildSubmitBar(double bottomPad) {
    return Container(
      padding: EdgeInsets.fromLTRB(20, 12, 20, bottomPad + 12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.black.withOpacity(0.06))),
      ),
      child: SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: (_canSubmit && !_submitting) ? _submit : null,
          child: _submitting
              ? const SizedBox(height: 20, width: 20,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Text(_shareToClient ? '生成确认链接' : '发起预约'),
        ),
      ),
    );
  }

  Widget _buildCopyLinkView(double bottomPad) {
    return Container(
      margin: EdgeInsets.only(top: MediaQuery.of(context).size.height * 0.4),
      decoration: const BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      padding: EdgeInsets.fromLTRB(24, 24, 24, bottomPad + 24),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        _handle(),
        const Icon(Icons.check_circle_rounded, color: DT.primary, size: 48),
        const SizedBox(height: 12),
        const Text('预约已创建', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: DT.textPrimary)),
        const SizedBox(height: 6),
        const Text('复制下面的链接，在微信发给客户确认预约',
            style: TextStyle(fontSize: 14, color: DT.textMuted), textAlign: TextAlign.center),
        const SizedBox(height: 20),
        GestureDetector(
          onTap: () {
            Clipboard.setData(ClipboardData(text: _confirmUrl!));
            ScaffoldMessenger.of(context)
                .showSnackBar(const SnackBar(content: Text('链接已复制')));
          },
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12),
                border: Border.all(color: DT.primary.withOpacity(0.2))),
            child: Row(children: [
              Expanded(
                  child: Text(_confirmUrl!,
                      style: const TextStyle(fontSize: 12, color: DT.primary),
                      maxLines: 2, overflow: TextOverflow.ellipsis)),
              const SizedBox(width: 8),
              const Icon(Icons.copy_rounded, size: 18, color: DT.primary),
            ]),
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('完成')),
        ),
      ]),
    );
  }

  Widget _handle() => Padding(
    padding: const EdgeInsets.symmetric(vertical: 12),
    child: Container(
        width: 40, height: 4,
        decoration: BoxDecoration(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(999))),
  );

  Widget _label(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Text(text,
        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: DT.textPrimary)),
  );

  Widget _textField(TextEditingController ctl, String hint,
      {TextInputType? type, int maxLines = 1}) {
    return TextField(
      controller: ctl,
      maxLines: maxLines,
      keyboardType: type,
      onChanged: (_) => setState(() {}),
      decoration: InputDecoration(
        hintText: hint,
        filled: true, fillColor: const Color(0xFFF8FAFC),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: DT.primary, width: 1.5)),
      ),
    );
  }
}
```

- [ ] **Commit**

```bash
git add mobile-flutter/lib/features/shared/booking/chat_booking_sheet.dart
git commit -m "feat(booking): add ChatBookingSheet widget"
```

---

## Task 9: Flutter — add "发起预约" button to ChatScreen header

**Files:**
- Modify: `mobile-flutter/lib/features/shared/chat/chat_screen.dart`

- [ ] **Add import at the top of `chat_screen.dart`:**

```dart
import '../booking/chat_booking_sheet.dart';
```

- [ ] **Add `_onBookingTap` method to `_ChatScreenState` (add anywhere in the state class):**

```dart
void _onBookingTap() {
  if (widget.otherPartyId == null) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('无法获取对方信息，请返回重试')),
    );
    return;
  }
  showChatBookingSheet(context, otherPartyId: widget.otherPartyId!);
}
```

- [ ] **In `_buildHeader()`, add the "发起预约" button as the last child in the header `Row`. The current Row ends after the title Column — add after it:**

```dart
// After the Expanded title Column, add:
const SizedBox(width: 8),
GestureDetector(
  onTap: _onBookingTap,
  child: Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
    decoration: BoxDecoration(
      gradient: const LinearGradient(
          colors: [Color(0xFFFF6B8A), Color(0xFFEA5E93)]),
      borderRadius: BorderRadius.circular(999),
      boxShadow: [
        BoxShadow(
            color: const Color(0xFFEA5E93).withOpacity(0.3),
            blurRadius: 8,
            offset: const Offset(0, 2)),
      ],
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: const [
        Icon(Icons.calendar_month_rounded, size: 14, color: Colors.white),
        SizedBox(width: 4),
        Text('发起预约',
            style: TextStyle(
                fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white)),
      ],
    ),
  ),
),
```

- [ ] **Run Flutter, open a chat, verify the "发起预约" button appears in the header and tapping it opens the bottom sheet**

```bash
flutter run
# Navigate to 消息 → tap a conversation → verify button in header → tap it → bottom sheet slides up
```

- [ ] **Commit**

```bash
git add mobile-flutter/lib/features/shared/chat/chat_screen.dart
git commit -m "feat(chat): add 发起预约 header button that opens ChatBookingSheet"
```

---

## Task 10: Flutter — OrderConfirmScreen (H5 token page)

**Files:**
- Create: `mobile-flutter/lib/features/shared/booking/order_confirm_screen.dart`

- [ ] **Create `mobile-flutter/lib/features/shared/booking/order_confirm_screen.dart`:**

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/design_tokens.dart';
import 'chat_booking_service.dart';

class OrderConfirmScreen extends StatefulWidget {
  final String token;
  const OrderConfirmScreen({super.key, required this.token});

  @override
  State<OrderConfirmScreen> createState() => _OrderConfirmScreenState();
}

class _OrderConfirmScreenState extends State<OrderConfirmScreen> {
  Map<String, dynamic>? _detail;
  bool _loading = true;
  bool _submitting = false;
  String? _errorMessage;
  String? _resultMessage;

  // Public ApiClient: same base URL, no rolePrefix set → calls /api/... directly
  late final ChatBookingService _svc;

  @override
  void initState() {
    super.initState();
    // Create a fresh client with no rolePrefix for public endpoints
    final baseUrl = context.read<ApiClient>().baseUrl;
    _svc = ChatBookingService(ApiClient(baseUrl: baseUrl));
    _load();
  }

  Future<void> _load() async {
    try {
      final detail = await _svc.fetchConfirmDetail(widget.token);
      if (mounted) setState(() { _detail = detail; _loading = false; });
    } catch (_) {
      if (mounted) setState(() { _errorMessage = '获取预约信息失败，请检查链接是否有效'; _loading = false; });
    }
  }

  Future<void> _accept() async {
    setState(() => _submitting = true);
    try {
      await _svc.acceptByToken(widget.token);
      if (mounted) setState(() { _resultMessage = '✅ 预约已确认！'; _submitting = false; });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('确认失败：$e')));
        setState(() => _submitting = false);
      }
    }
  }

  Future<void> _cancel() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('取消预约'),
        content: const Text('确定要取消这次预约吗？'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('再想想')),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('确认取消', style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _submitting = true);
    try {
      await _svc.cancelByToken(widget.token);
      if (mounted) setState(() { _resultMessage = '预约已取消'; _submitting = false; });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('取消失败：$e')));
        setState(() => _submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFF5F8),
      body: SafeArea(child: _loading
          ? const Center(child: CircularProgressIndicator(color: DT.primary))
          : _buildBody()),
    );
  }

  Widget _buildBody() {
    if (_errorMessage != null) {
      return Center(child: Padding(
        padding: const EdgeInsets.all(32),
        child: Text(_errorMessage!,
            style: const TextStyle(fontSize: 16, color: DT.textMuted),
            textAlign: TextAlign.center),
      ));
    }

    if (_detail?['expired'] == true || _detail?['alreadyConfirmed'] == true) {
      final isExpired = _detail?['expired'] == true;
      return Center(child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(isExpired ? Icons.timer_off_rounded : Icons.check_circle_rounded,
              size: 56, color: isExpired ? Colors.grey : DT.primary),
          const SizedBox(height: 16),
          Text(_detail?['message']?.toString() ?? '',
              style: const TextStyle(fontSize: 16, color: DT.textPrimary),
              textAlign: TextAlign.center),
        ]),
      ));
    }

    if (_resultMessage != null) {
      return Center(child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.check_circle_rounded, size: 56, color: DT.primary),
          const SizedBox(height: 16),
          Text(_resultMessage!,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: DT.textPrimary)),
          const SizedBox(height: 8),
          const Text('您可以关闭此页面了',
              style: TextStyle(fontSize: 14, color: DT.textMuted)),
        ]),
      ));
    }

    final d = _detail!;
    final price = d['price'];
    final startTime = d['startTime'] != null
        ? DateTime.tryParse(d['startTime'].toString())
        : null;
    final tech = d['technician'] as Map<String, dynamic>?;
    final techName = tech?['name']?.toString() ?? '美甲师';

    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 16),
        Center(child: Column(children: [
          Container(
            width: 64, height: 64,
            decoration: const BoxDecoration(color: Color(0xFFFFE9F0), shape: BoxShape.circle),
            alignment: Alignment.center,
            child: Text(techName.isNotEmpty ? techName[0] : '师',
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: DT.primary)),
          ),
          const SizedBox(height: 10),
          Text(techName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: DT.textPrimary)),
          const SizedBox(height: 4),
          const Text('为您发起了一次预约，请确认以下信息',
              style: TextStyle(fontSize: 13, color: DT.textMuted)),
        ])),
        const SizedBox(height: 28),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
              color: Colors.white, borderRadius: BorderRadius.circular(20),
              boxShadow: DT.shadowMd),
          child: Column(children: [
            _row('💰 服务价格',
                price != null ? '¥ ${price.toString()}' : '未设置',
                highlight: true),
            const Divider(height: 24),
            _row('🕐 预约时间',
                startTime != null
                    ? '${startTime.month}月${startTime.day}日 '
                    '${startTime.hour.toString().padLeft(2, '0')}:'
                    '${startTime.minute.toString().padLeft(2, '0')}'
                    : d['startTime']?.toString() ?? '-'),
            const SizedBox(height: 12),
            _row('🏠 服务方式', d['serviceType']?.toString() ?? '-'),
            if (d['address'] != null) ...[
              const SizedBox(height: 12),
              _row('📍 服务地址', d['address'].toString()),
            ],
            if (d['remark'] != null || d['customDescription'] != null) ...[
              const SizedBox(height: 12),
              _row('💬 服务说明',
                  (d['remark'] ?? d['customDescription']).toString()),
            ],
          ]),
        ),
        const SizedBox(height: 32),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _submitting ? null : _accept,
            child: _submitting
                ? const SizedBox(height: 20, width: 20,
                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('确认预约'),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton(
            onPressed: _submitting ? null : _cancel,
            style: OutlinedButton.styleFrom(foregroundColor: Colors.grey.shade600),
            child: const Text('取消预约'),
          ),
        ),
      ],
    );
  }

  Widget _row(String label, String value, {bool highlight = false}) {
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SizedBox(
        width: 90,
        child: Text(label, style: const TextStyle(fontSize: 14, color: DT.textMuted)),
      ),
      Expanded(
        child: Text(value, style: TextStyle(
          fontSize: highlight ? 22 : 14,
          fontWeight: highlight ? FontWeight.w700 : FontWeight.w500,
          color: highlight ? DT.primary : DT.textPrimary,
        )),
      ),
    ]);
  }
}
```

- [ ] **Commit**

```bash
git add mobile-flutter/lib/features/shared/booking/order_confirm_screen.dart
git commit -m "feat(booking): add OrderConfirmScreen for token-based confirmation"
```

---

## Task 11: Flutter — router add `/confirm/:token` with auth bypass

**Files:**
- Modify: `mobile-flutter/lib/app/router.dart`

- [ ] **Add import at the top of `router.dart`:**

```dart
import '../features/shared/booking/order_confirm_screen.dart';
```

- [ ] **In the `redirect` callback (around line 59), update the unauthenticated guard to bypass `/confirm/` routes:**

Find:
```dart
final authRoutes = ['/client/login', '/technician/login', '/role-select'];
final isOnAuthRoute = authRoutes.contains(location);

if (status == AuthStatus.unauthenticated) {
  if (isOnAuthRoute) return null;
  return '/role-select';
}
```

Replace with:
```dart
final authRoutes = ['/client/login', '/technician/login', '/role-select'];
final isOnAuthRoute = authRoutes.contains(location);
final isPublicRoute = location.startsWith('/confirm/');

if (status == AuthStatus.unauthenticated) {
  if (isOnAuthRoute || isPublicRoute) return null;
  return '/role-select';
}
```

- [ ] **Add the route to the `routes` list (add before the final closing bracket of the routes list):**

```dart
GoRoute(
  path: '/confirm/:token',
  builder: (context, state) => OrderConfirmScreen(
    token: state.pathParameters['token']!,
  ),
),
```

- [ ] **Run Flutter and verify the route is accessible without login:**

```bash
flutter run
# While unauthenticated (or after logging out), navigate to /confirm/test-token
# The OrderConfirmScreen should load (will show error "获取预约信息失败" since token is fake)
# NOT redirected to /role-select
```

- [ ] **Commit**

```bash
git add mobile-flutter/lib/app/router.dart
git commit -m "feat(router): add /confirm/:token public route with auth bypass"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|-----------------|------------|
| Chat header "发起预约" button (both sides) | Task 9 |
| Bottom sheet presentation | Task 8 (`ChatBookingSheet`) |
| Service type smart auto-select | Task 8 (`_autoSelectServiceType`, `_availableTypes`) |
| Address smart logic (0/1/multi) + inline add | Task 8 (`_buildClientAddressSection`) |
| New address syncs to address management | Task 8 (`ClientAddressService(api).create(...)`) |
| Date + time selection | Task 8 (`_buildDatePicker`, `_buildTimeSlots`) |
| Note + images (optional) | Task 8 (`_buildNoteField`, `_buildImageRow`) |
| Skip service-content validation for chat booking | Task 5 (backend chatMode) |
| Technician price field | Task 8 (price field, technician mode only) |
| WeChat share toggle + copy link | Task 8 (`_buildShareToggle`, `_buildCopyLinkView`) |
| Token generation (24h expiry, UUID) | Task 3 (`orders.service.ts`) |
| No-auth confirm endpoints | Task 4 (`PublicOrdersController`) |
| H5 confirm page (price → time → type → address) | Task 10 |
| Token single-use enforcement | Task 4 (`confirmTokenUsedAt`) |
| Success/expired/already-confirmed states | Task 10 |
| Existing `ClientCreateOrderScreen` untouched | Not modified in any task ✅ |

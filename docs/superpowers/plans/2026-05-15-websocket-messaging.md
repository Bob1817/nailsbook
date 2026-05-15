# WebSocket 消息系统实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3-second polling in both client and technician chat pages with a Socket.IO-based real-time messaging system supporting live messages, read receipts, typing indicators, and global online status.

**Architecture:** A single `ChatGateway` (NestJS WebSocket gateway) handles all events for both user types. JWT authentication is performed manually in the `handleConnection` hook by attempting to verify the token with both `CLIENT_JWT_SECRET` and `TECHNICIAN_JWT_SECRET`. Messages are persisted via Prisma and broadcast through Socket.IO rooms keyed by `conversation:{id}`. Online status is tracked in-memory with a connection-count map.

**Tech Stack:** NestJS `@nestjs/websockets` + `@nestjs/platform-socket.io`, `socket.io-client` (React), existing Prisma + JWT infrastructure

**Spec:** `docs/superpowers/specs/2026-05-15-websocket-messaging-design.md`

---

## File Map

### Backend (create)

| File | Responsibility |
|------|---------------|
| `backend/src/chat/chat.module.ts` | Module definition, imports PrismaModule, exports ChatService |
| `backend/src/chat/dto/send-message.dto.ts` | DTO for `message:send` event (shared by client & technician) |
| `backend/src/chat/chat-auth.guard.ts` | WebSocket `canActivate`: verify JWT from `handshake.auth.token`, attach `userId` + `userType` |
| `backend/src/chat/presence.service.ts` | `Map<userId, {userType, connectionCount}>`, emit online/offline/sync |
| `backend/src/chat/typing.service.ts` | `Map<conversationId, Map<userId, timeout>>`, debounce 2s, 5s server timeout |
| `backend/src/chat/chat.service.ts` | Business logic: sendMessage, markAsRead, getConversation, joinRooms |
| `backend/src/chat/chat.gateway.ts` | `@WebSocketGateway` event handlers: message:send/read, typing:start/stop, connection lifecycle |
| `backend/src/chat/chat.service.spec.ts` | Unit tests for ChatService |

### Backend (modify)

| File | Change |
|------|--------|
| `backend/src/app.module.ts` | Add `ChatModule` to imports |
| `backend/src/main.ts` | Add `adapter` setup for Socket.IO CORS (if needed beyond existing REST CORS) |

### Client Frontend (create)

| File | Responsibility |
|------|---------------|
| `client-frontend/src/services/socket.ts` | `getSocket(token)` singleton factory, disconnect helper |
| `client-frontend/src/hooks/useSocket.ts` | Connect on mount, auto-reconnect, return `{ socket, isConnected }` |
| `client-frontend/src/hooks/usePresence.ts` | React Context + provider: `onlineUsers` set, `isOnline(userId, userType)` |
| `client-frontend/src/hooks/useTyping.ts` | Typing state for a conversation + emit helpers with 2s debounce |

### Client Frontend (modify)

| File | Change |
|------|--------|
| `client-frontend/src/pages/ChatDetail.tsx` | Replace `setInterval` polling with `useSocket` event listeners; emit `message:read` on open; show typing indicator |
| `client-frontend/src/pages/Chat.tsx` | Wrap in `PresenceProvider`; show online dot on conversation list avatars; listen `message:new` for notification + badge; request `Notification.permission` |
| `client-frontend/src/App.tsx` | Wrap routes in `PresenceProvider` (inside existing auth provider) |

### Technician Frontend (create)

| File | Responsibility |
|------|---------------|
| `technician-frontend/src/services/socket.ts` | Same pattern as client, uses `technician_token` |
| `technician-frontend/src/hooks/useSocket.ts` | Same pattern |
| `technician-frontend/src/hooks/usePresence.ts` | Same pattern |
| `technician-frontend/src/hooks/useTyping.ts` | Same pattern |

### Technician Frontend (modify)

| File | Change |
|------|--------|
| `technician-frontend/src/pages/ChatPage.tsx` | Replace polling with WebSocket; show typing indicator |
| `technician-frontend/src/pages/MessagesPage.tsx` | Show online dot on conversation avatars; listen `message:new` for notification badge |
| `technician-frontend/src/App.tsx` | Wrap in `PresenceProvider` |

---

## Task 1: Install backend dependencies

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Install packages**

```bash
cd /Users/shibo/Documents/Codex/nailBook/backend
npm install @nestjs/websockets @nestjs/platform-socket.io
```

- [ ] **Step 2: Verify installation**

```bash
npm ls @nestjs/websockets @nestjs/platform-socket.io
```

Expected: both packages listed with compatible versions (NestJS 10.x).

- [ ] **Step 3: Commit**

```bash
cd /Users/shibo/Documents/Codex/nailBook
git add backend/package.json backend/package-lock.json
git commit -m "chore: add @nestjs/websockets and socket.io dependencies"
```

---

## Task 2: Create SendMessageDto

**Files:**
- Create: `backend/src/chat/dto/send-message.dto.ts`

- [ ] **Step 1: Create the DTO**

```typescript
// backend/src/chat/dto/send-message.dto.ts
import { IsInt, IsOptional, IsString, IsIn } from 'class-validator';

export class SendMessageDto {
  @IsOptional()
  @IsInt()
  conversationId?: number;

  @IsOptional()
  @IsInt()
  techId?: number;

  @IsOptional()
  @IsInt()
  clientId?: number;

  @IsString()
  @IsIn(['text', 'image', 'system', 'quote', 'booking', 'social_media'])
  messageType: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  relatedType?: string;

  @IsOptional()
  @IsInt()
  relatedId?: number;
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/shibo/Documents/Codex/nailBook
git add backend/src/chat/dto/send-message.dto.ts
git commit -m "feat(chat): add SendMessageDto for WebSocket message events"
```

---

## Task 3: Create ChatAuthGuard

**Files:**
- Create: `backend/src/chat/chat-auth.guard.ts`

The guard reads `handshake.auth.token`, tries `jwt.verify()` with `CLIENT_JWT_SECRET` first, then `TECHNICIAN_JWT_SECRET`. On success it attaches `{ userId, userType }` to the socket data. On failure it throws `WsException`.

- [ ] **Step 1: Create the guard**

```typescript
// backend/src/chat/chat-auth.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ChatAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();
    const token = client.handshake?.auth?.token as string | undefined;

    if (!token) {
      throw new WsException('Missing auth token');
    }

    const bearer = token.startsWith('Bearer ') ? token.slice(7) : token;

    // Try client JWT first
    const clientSecret = this.configService.get<string>(
      'CLIENT_JWT_SECRET',
      this.configService.get<string>('JWT_SECRET', ''),
    );
    try {
      const payload = jwt.verify(bearer, clientSecret) as any;
      if (payload.userType === 'client') {
        (client as any).userId = payload.sub;
        (client as any).userType = 'client';
        return true;
      }
    } catch {}

    // Try technician JWT
    const techSecret = this.configService.get<string>(
      'TECHNICIAN_JWT_SECRET',
      this.configService.get<string>('JWT_SECRET', ''),
    );
    try {
      const payload = jwt.verify(bearer, techSecret) as any;
      if (payload.userType === 'technician') {
        (client as any).userId = payload.sub;
        (client as any).userType = 'technician';
        return true;
      }
    } catch {}

    throw new WsException('Invalid auth token');
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/shibo/Documents/Codex/nailBook
git add backend/src/chat/chat-auth.guard.ts
git commit -m "feat(chat): add ChatAuthGuard with dual JWT verification"
```

---

## Task 4: Create PresenceService

**Files:**
- Create: `backend/src/chat/presence.service.ts`

- [ ] **Step 1: Create the service**

```typescript
// backend/src/chat/presence.service.ts
import { Injectable } from '@nestjs/common';

export interface UserPresence {
  userType: 'client' | 'technician';
  connectionCount: number;
}

@Injectable()
export class PresenceService {
  private onlineUsers = new Map<number, UserPresence>();

  /**
   * Returns 'joined' if this is the user's first connection (caller should broadcast online),
   * or 'already_online' if the user was already connected.
   */
  userConnected(userId: number, userType: 'client' | 'technician'): 'joined' | 'already_online' {
    const existing = this.onlineUsers.get(userId);
    if (existing) {
      existing.connectionCount++;
      return 'already_online';
    }
    this.onlineUsers.set(userId, { userType, connectionCount: 1 });
    return 'joined';
  }

  /**
   * Returns 'left' if this was the user's last connection (caller should broadcast offline),
   * or 'still_online' if the user has other connections.
   */
  userDisconnected(userId: number): 'left' | 'still_online' {
    const existing = this.onlineUsers.get(userId);
    if (!existing) return 'still_online';

    existing.connectionCount--;
    if (existing.connectionCount <= 0) {
      this.onlineUsers.delete(userId);
      return 'left';
    }
    return 'still_online';
  }

  isOnline(userId: number): boolean {
    return this.onlineUsers.has(userId);
  }

  getOnlineUsers(): Array<{ userId: number; userType: string }> {
    const result: Array<{ userId: number; userType: string }> = [];
    for (const [userId, presence] of this.onlineUsers.entries()) {
      result.push({ userId, userType: presence.userType });
    }
    return result;
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/shibo/Documents/Codex/nailBook
git add backend/src/chat/presence.service.ts
git commit -m "feat(chat): add PresenceService with connection-count tracking"
```

---

## Task 5: Create TypingService

**Files:**
- Create: `backend/src/chat/typing.service.ts`

- [ ] **Step 1: Create the service**

```typescript
// backend/src/chat/typing.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class TypingService {
  // Map<conversationId, Map<userId, NodeJS.Timeout>>
  private typingTimers = new Map<number, Map<number, NodeJS.Timeout>>();

  private readonly DEBOUNCE_MS = 2000;
  private readonly SERVER_TIMEOUT_MS = 5000;

  /**
   * Called when a user starts typing. Returns a debounce timer that, when fired,
   * means the user has stopped typing (caller should emit typing:stop).
   * Returns null if the user was already typing (debounce suppressed).
   */
  startTyping(
    conversationId: number,
    userId: number,
    onStopTyping: () => void,
  ): NodeJS.Timeout | null {
    if (!this.typingTimers.has(conversationId)) {
      this.typingTimers.set(conversationId, new Map());
    }
    const convMap = this.typingTimers.get(conversationId)!;

    // Clear existing timer (debounce)
    const existing = convMap.get(userId);
    if (existing) {
      clearTimeout(existing);
    }

    // Set new debounce timer
    const timer = setTimeout(() => {
      this.stopTyping(conversationId, userId);
      onStopTyping();
    }, this.DEBOUNCE_MS);

    convMap.set(userId, timer);

    // Also set a hard server timeout
    const hardTimeout = setTimeout(() => {
      if (convMap.has(userId)) {
        this.stopTyping(conversationId, userId);
        onStopTyping();
      }
    }, this.SERVER_TIMEOUT_MS);

    // Store hard timeout separately (we clear the debounce one, not this)
    // For simplicity, we clear both on stopTyping
    return timer;
  }

  stopTyping(conversationId: number, userId: number): void {
    const convMap = this.typingTimers.get(conversationId);
    if (!convMap) return;

    const timer = convMap.get(userId);
    if (timer) {
      clearTimeout(timer);
      convMap.delete(userId);
    }

    if (convMap.size === 0) {
      this.typingTimers.delete(conversationId);
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/shibo/Documents/Codex/nailBook
git add backend/src/chat/typing.service.ts
git commit -m "feat(chat): add TypingService with debounce and server timeout"
```

---

## Task 6: Create ChatService

**Files:**
- Create: `backend/src/chat/chat.service.ts`
- Create: `backend/src/chat/chat.service.spec.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// backend/src/chat/chat.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  conversation: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  message: {
    create: jest.fn(),
    updateMany: jest.fn(),
    groupBy: jest.fn(),
  },
};

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should create a new conversation when conversationId is not provided (client sending to tech)', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(null);
      mockPrisma.conversation.create.mockResolvedValue({
        id: 1, clientId: 10, techId: 20,
        lastMessage: 'hello', lastMessageAt: new Date(),
      });
      mockPrisma.message.create.mockResolvedValue({
        id: 1, conversationId: 1, senderType: 'client', senderId: 10,
        receiverType: 'technician', receiverId: 20,
        messageType: 'text', content: 'hello', isRead: false, createdAt: new Date(),
      });
      mockPrisma.conversation.update.mockResolvedValue({});

      const result = await service.sendMessage({
        senderType: 'client', senderId: 10,
        techId: 20, messageType: 'text', content: 'hello',
      });

      expect(mockPrisma.conversation.create).toHaveBeenCalled();
      expect(mockPrisma.message.create).toHaveBeenCalled();
      expect(result.message.content).toBe('hello');
      expect(result.conversation.id).toBe(1);
    });

    it('should use existing conversation when conversationId is provided', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue({
        id: 5, clientId: 10, techId: 20,
      });
      mockPrisma.message.create.mockResolvedValue({
        id: 2, conversationId: 5, senderType: 'technician', senderId: 20,
        receiverType: 'client', receiverId: 10,
        messageType: 'text', content: 'hi', isRead: false, createdAt: new Date(),
      });
      mockPrisma.conversation.update.mockResolvedValue({});

      const result = await service.sendMessage({
        senderType: 'technician', senderId: 20,
        conversationId: 5, messageType: 'text', content: 'hi',
      });

      expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
      expect(result.message.conversationId).toBe(5);
    });

    it('should throw when conversation not found and no techId/clientId provided', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(null);

      await expect(
        service.sendMessage({
          senderType: 'client', senderId: 10,
          conversationId: 999, messageType: 'text', content: 'hello',
        }),
      ).rejects.toThrow('Conversation not found');
    });
  });

  describe('markAsRead', () => {
    it('should update all unread messages in conversation for the given receiver', async () => {
      mockPrisma.message.updateMany.mockResolvedValue({ count: 3 });

      await service.markAsRead(1, 'client', 10);

      expect(mockPrisma.message.updateMany).toHaveBeenCalledWith({
        where: { conversationId: 1, receiverType: 'client', receiverId: 10, isRead: false },
        data: { isRead: true },
      });
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/shibo/Documents/Codex/nailBook/backend
npx jest src/chat/chat.service.spec.ts --no-cache 2>&1 | tail -20
```

Expected: FAIL — `Cannot find module './chat.service'`

- [ ] **Step 3: Implement ChatService**

```typescript
// backend/src/chat/chat.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SendMessageInput {
  senderType: 'client' | 'technician';
  senderId: number;
  conversationId?: number;
  techId?: number;
  clientId?: number;
  messageType: string;
  content?: string;
  imageUrl?: string;
  relatedType?: string;
  relatedId?: number;
}

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async sendMessage(input: SendMessageInput) {
    const { senderType, senderId, messageType, content, imageUrl, relatedType, relatedId } = input;
    let { conversationId } = input;

    let conversation: any;

    if (conversationId) {
      conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      if (!conversation) {
        throw new BadRequestException('Conversation not found');
      }
    } else {
      // Create conversation: client sends with techId, technician sends with clientId
      const clientId = senderType === 'client' ? senderId : input.clientId;
      const techId = senderType === 'technician' ? senderId : input.techId;

      if (!clientId || !techId) {
        throw new BadRequestException('Must provide conversationId or recipient id');
      }

      conversation = await this.prisma.conversation.findUnique({
        where: { clientId_techId: { clientId, techId } },
      });

      if (!conversation) {
        conversation = await this.prisma.conversation.create({
          data: { clientId, techId },
        });
      }

      conversationId = conversation.id;
    }

    const receiverType = senderType === 'client' ? 'technician' : 'client';
    const receiverId =
      senderType === 'client' ? conversation.techId : conversation.clientId;

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderType,
        senderId,
        receiverType,
        receiverId,
        messageType,
        content,
        imageUrl,
        relatedType,
        relatedId,
      },
    });

    // Update conversation last message
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: messageType === 'image' ? '[图片]' : content?.slice(0, 100) || '',
        lastMessageAt: new Date(),
      },
    });

    return { message, conversation };
  }

  async markAsRead(conversationId: number, receiverType: string, receiverId: number) {
    await this.prisma.message.updateMany({
      where: { conversationId, receiverType, receiverId, isRead: false },
      data: { isRead: true },
    });
  }

  async getConversation(conversationId: number) {
    return this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
  }

  async getUserConversationIds(userId: number, userType: 'client' | 'technician') {
    const where = userType === 'client' ? { clientId: userId } : { techId: userId };
    const conversations = await this.prisma.conversation.findMany({
      where,
      select: { id: true },
    });
    return conversations.map((c) => c.id);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/shibo/Documents/Codex/nailBook/backend
npx jest src/chat/chat.service.spec.ts --no-cache 2>&1 | tail -20
```

Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
cd /Users/shibo/Documents/Codex/nailBook
git add backend/src/chat/chat.service.ts backend/src/chat/chat.service.spec.ts
git commit -m "feat(chat): add ChatService with sendMessage, markAsRead, and tests"
```

---

## Task 7: Create ChatGateway and ChatModule

**Files:**
- Create: `backend/src/chat/chat.gateway.ts`
- Create: `backend/src/chat/chat.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create ChatGateway**

```typescript
// backend/src/chat/chat.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { ChatService } from './chat.service';
import { PresenceService } from './presence.service';
import { TypingService } from './typing.service';
import { SendMessageDto } from './dto/send-message.dto';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private chatService: ChatService,
    private presenceService: PresenceService,
    private typingService: TypingService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake?.auth?.token as string | undefined;
      if (!token) {
        client.emit('error', { message: 'Missing auth token' });
        client.disconnect();
        return;
      }

      const bearer = token.startsWith('Bearer ') ? token.slice(7) : token;

      let userId: number | null = null;
      let userType: 'client' | 'technician' | null = null;

      const clientSecret = process.env.CLIENT_JWT_SECRET || process.env.JWT_SECRET || '';
      const techSecret = process.env.TECHNICIAN_JWT_SECRET || process.env.JWT_SECRET || '';

      try {
        const payload = jwt.verify(bearer, clientSecret) as any;
        if (payload.userType === 'client') {
          userId = payload.sub;
          userType = 'client';
        }
      } catch {}

      if (!userId) {
        try {
          const payload = jwt.verify(bearer, techSecret) as any;
          if (payload.userType === 'technician') {
            userId = payload.sub;
            userType = 'technician';
          }
        } catch {}
      }

      if (!userId || !userType) {
        client.emit('error', { message: 'Invalid auth token' });
        client.disconnect();
        return;
      }

      // Attach user info to socket
      (client as any).userId = userId;
      (client as any).userType = userType;

      // Join all conversation rooms
      const conversationIds = await this.chatService.getUserConversationIds(userId, userType);
      for (const convId of conversationIds) {
        client.join(`conversation:${convId}`);
      }

      // Track presence
      const status = this.presenceService.userConnected(userId, userType);
      if (status === 'joined') {
        // Broadcast to all rooms this user is in
        for (const convId of conversationIds) {
          client.to(`conversation:${convId}`).emit('presence:online', { userId, userType });
        }
      }

      // Send current online list to the connecting user
      client.emit('presence:sync', {
        onlineUsers: this.presenceService.getOnlineUsers(),
      });

      console.log(`[ChatGateway] ${userType} ${userId} connected (socket: ${client.id})`);
    } catch (err) {
      console.error('[ChatGateway] Connection error:', err);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = (client as any).userId as number | undefined;
    const userType = (client as any).userType as 'client' | 'technician' | undefined;

    if (!userId || !userType) return;

    const status = this.presenceService.userDisconnected(userId);
    if (status === 'left') {
      // Broadcast offline to all rooms this user was in
      const conversationIds = await this.chatService.getUserConversationIds(userId, userType);
      for (const convId of conversationIds) {
        this.server.to(`conversation:${convId}`).emit('presence:offline', { userId, userType });
      }
    }

    console.log(`[ChatGateway] ${userType} ${userId} disconnected`);
  }

  @SubscribeMessage('message:send')
  async handleMessageSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const userId = (client as any).userId as number;
    const userType = (client as any).userType as 'client' | 'technician';

    const { message, conversation } = await this.chatService.sendMessage({
      senderType: userType,
      senderId: userId,
      ...dto,
    });

    // Join the room in case it's a new conversation
    client.join(`conversation:${conversation.id}`);

    // Broadcast to the conversation room (recipient)
    client.to(`conversation:${conversation.id}`).emit('message:new', {
      message,
      conversation,
    });

    // Return to sender for immediate UI update
    return { event: 'message:sent', data: { message, conversation } };
  }

  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number },
  ) {
    const userId = (client as any).userId as number;
    const userType = (client as any).userType as 'client' | 'technician';

    await this.chatService.markAsRead(data.conversationId, userType, userId);

    // Notify the other party
    client.to(`conversation:${data.conversationId}`).emit('message:read', {
      conversationId: data.conversationId,
      readerType: userType,
      readerId: userId,
      readAt: new Date().toISOString(),
    });

    return { event: 'message:read:ack', data: { success: true } };
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number },
  ) {
    const userId = (client as any).userId as number;
    const userType = (client as any).userType as 'client' | 'technician';

    this.typingService.startTyping(data.conversationId, userId, () => {
      // Auto-stop typing after debounce
      client.to(`conversation:${data.conversationId}`).emit('typing:stop', {
        conversationId: data.conversationId,
        userId,
        userType,
      });
    });

    // Broadcast to other party
    client.to(`conversation:${data.conversationId}`).emit('typing:start', {
      conversationId: data.conversationId,
      userId,
      userType,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number },
  ) {
    const userId = (client as any).userId as number;
    const userType = (client as any).userType as 'client' | 'technician';

    this.typingService.stopTyping(data.conversationId, userId);

    client.to(`conversation:${data.conversationId}`).emit('typing:stop', {
      conversationId: data.conversationId,
      userId,
      userType,
    });
  }
}
```

- [ ] **Step 2: Create ChatModule**

```typescript
// backend/src/chat/chat.module.ts
import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { PresenceService } from './presence.service';
import { TypingService } from './typing.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ChatGateway, ChatService, PresenceService, TypingService],
  exports: [ChatService],
})
export class ChatModule {}
```

- [ ] **Step 3: Register ChatModule in AppModule**

Add `ChatModule` to the imports array in `backend/src/app.module.ts`. The import line to add:

```typescript
import { ChatModule } from './chat/chat.module';
```

And add `ChatModule` to the `imports` array in `@Module({})`.

- [ ] **Step 4: Verify build**

```bash
cd /Users/shibo/Documents/Codex/nailBook/backend
npx nest build 2>&1 | tail -10
```

Expected: Build succeeds with no errors.

- [ ] **Step 5: Run tests**

```bash
npx jest src/chat/chat.service.spec.ts --no-cache 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/shibo/Documents/Codex/nailBook
git add backend/src/chat/chat.gateway.ts backend/src/chat/chat.module.ts backend/src/app.module.ts
git commit -m "feat(chat): add ChatGateway with real-time messaging, presence, and typing"
```

---

## Task 8: Install socket.io-client in both frontends

**Files:**
- Modify: `client-frontend/package.json`
- Modify: `technician-frontend/package.json`

- [ ] **Step 1: Install in client-frontend**

```bash
cd /Users/shibo/Documents/Codex/nailBook/client-frontend
npm install socket.io-client
```

- [ ] **Step 2: Install in technician-frontend**

```bash
cd /Users/shibo/Documents/Codex/nailBook/technician-frontend
npm install socket.io-client
```

- [ ] **Step 3: Commit**

```bash
cd /Users/shibo/Documents/Codex/nailBook
git add client-frontend/package.json client-frontend/package-lock.json
git add technician-frontend/package.json technician-frontend/package-lock.json
git commit -m "chore: add socket.io-client to both frontends"
```

---

## Task 9: Create socket service + useSocket hook (client frontend)

**Files:**
- Create: `client-frontend/src/services/socket.ts`
- Create: `client-frontend/src/hooks/useSocket.ts`

- [ ] **Step 1: Create socket service singleton**

```typescript
// client-frontend/src/services/socket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(token: string): Socket {
  if (socket && socket.connected) {
    return socket;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  socket = io(window.location.origin, {
    auth: { token: `Bearer ${token}` },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
```

- [ ] **Step 2: Create useSocket hook**

```typescript
// client-frontend/src/hooks/useSocket.ts
import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, disconnectSocket } from '../services/socket';

export function useSocket() {
  const token = localStorage.getItem('client_token') || '';
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);
    socketRef.current = socket;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [token]);

  return { socket: socketRef.current, isConnected };
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/shibo/Documents/Codex/nailBook
git add client-frontend/src/services/socket.ts client-frontend/src/hooks/useSocket.ts
git commit -m "feat(client): add socket service and useSocket hook"
```

---

## Task 10: Create usePresence hook (client frontend)

**Files:**
- Create: `client-frontend/src/hooks/usePresence.ts`

- [ ] **Step 1: Create the hook with Context provider**

```typescript
// client-frontend/src/hooks/usePresence.ts
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useSocket } from './useSocket';

interface PresenceContextValue {
  isOnline: (userId: number, userType: string) => boolean;
  onlineUsers: Set<string>; // "userType:userId" keys
}

const PresenceContext = createContext<PresenceContextValue>({
  isOnline: () => false,
  onlineUsers: new Set(),
});

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { socket } = useSocket();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!socket) return;

    const makeKey = (userId: number, userType: string) => `${userType}:${userId}`;

    const onSync = (data: { onlineUsers: Array<{ userId: number; userType: string }> }) => {
      setOnlineUsers(new Set(data.onlineUsers.map((u) => makeKey(u.userId, u.userType))));
    };

    const onOnline = (data: { userId: number; userType: string }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.add(makeKey(data.userId, data.userType));
        return next;
      });
    };

    const onOffline = (data: { userId: number; userType: string }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(makeKey(data.userId, data.userType));
        return next;
      });
    };

    socket.on('presence:sync', onSync);
    socket.on('presence:online', onOnline);
    socket.on('presence:offline', onOffline);

    return () => {
      socket.off('presence:sync', onSync);
      socket.off('presence:online', onOnline);
      socket.off('presence:offline', onOffline);
    };
  }, [socket]);

  const isOnline = useCallback(
    (userId: number, userType: string) => onlineUsers.has(`${userType}:${userId}`),
    [onlineUsers],
  );

  return (
    <PresenceContext.Provider value={{ isOnline, onlineUsers }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  return useContext(PresenceContext);
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/shibo/Documents/Codex/nailBook
git add client-frontend/src/hooks/usePresence.ts
git commit -m "feat(client): add usePresence hook with global online status context"
```

---

## Task 11: Create useTyping hook (client frontend)

**Files:**
- Create: `client-frontend/src/hooks/useTyping.ts`

- [ ] **Step 1: Create the hook**

```typescript
// client-frontend/src/hooks/useTyping.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

export function useTyping(socket: Socket | null, conversationId: number | null) {
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!socket || !conversationId) return;

    const onTypingStart = (data: { conversationId: number }) => {
      if (data.conversationId !== conversationId) return;
      setIsOtherTyping(true);

      // Auto-clear after 5s in case stop event is missed
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 5000);
    };

    const onTypingStop = (data: { conversationId: number }) => {
      if (data.conversationId !== conversationId) return;
      setIsOtherTyping(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };

    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);

    return () => {
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [socket, conversationId]);

  const emitTyping = useCallback(() => {
    if (!socket || !conversationId) return;

    socket.emit('typing:start', { conversationId });

    // Debounce: emit stop 2s after last keystroke
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId });
    }, 2000);
  }, [socket, conversationId]);

  const stopTyping = useCallback(() => {
    if (!socket || !conversationId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    socket.emit('typing:stop', { conversationId });
  }, [socket, conversationId]);

  return { isOtherTyping, emitTyping, stopTyping };
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/shibo/Documents/Codex/nailBook
git add client-frontend/src/hooks/useTyping.ts
git commit -m "feat(client): add useTyping hook with debounce and timeout"
```

---

## Task 12: Update ChatDetail.tsx to use WebSocket (client frontend)

**Files:**
- Modify: `client-frontend/src/pages/ChatDetail.tsx`

- [ ] **Step 1: Read the current file**

Read `client-frontend/src/pages/ChatDetail.tsx` to understand the full component structure before making changes.

- [ ] **Step 2: Replace polling with WebSocket**

The key changes to make:

1. **Add imports** at the top of the file:
```typescript
import { useSocket } from '../hooks/useSocket';
import { useTyping } from '../hooks/useTyping';
```

2. **Replace the polling `useEffect`** (the one with `setInterval(..., 3000)`) with WebSocket event listeners. Remove the `setInterval` block entirely and replace with:

```typescript
const { socket, isConnected } = useSocket();
const { isOtherTyping, emitTyping } = useTyping(socket, currentConversationId);

// Listen for new messages
useEffect(() => {
  if (!socket || !currentConversationId) return;

  const onNewMessage = (data: { message: any; conversation: any }) => {
    if (data.message.conversationId === currentConversationId) {
      setMessages((prev) => {
        // Avoid duplicate
        if (prev.some((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
    }
  };

  const onRead = (data: { conversationId: number }) => {
    if (data.conversationId === currentConversationId) {
      setMessages((prev) =>
        prev.map((m) => (m.receiverType === 'client' ? m : { ...m, isRead: true })),
      );
    }
  };

  socket.on('message:new', onNewMessage);
  socket.on('message:read', onRead);

  // Mark as read when opening conversation
  socket.emit('message:read', { conversationId: currentConversationId });

  return () => {
    socket.off('message:new', onNewMessage);
    socket.off('message:read', onRead);
  };
}, [socket, currentConversationId]);
```

3. **Update the send handler** to use WebSocket with REST fallback:

```typescript
// In the send handler, replace the REST call with:
const sendMessage = async (messageType: string, content?: string, imageUrl?: string) => {
  if (socket && isConnected) {
    socket.emit('message:send', {
      conversationId: currentConversationId,
      techId: !currentConversationId ? currentTechnician?.id : undefined,
      messageType,
      content,
      imageUrl,
    });
    // The server responds via the callback or message:sent event
    // For immediate UI feedback, optimistically add the message
  } else {
    // REST fallback (existing code)
    // ... keep existing messageService.sendMessage call
  }
};
```

4. **Add typing handler** to the text input's `onChange`:

```typescript
// On input change:
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setInput(e.target.value);
  emitTyping(); // Debounced — only emits if user pauses 2s
};
```

5. **Add typing indicator UI** above the input area:

```typescript
{isOtherTyping && (
  <div className="px-4 py-1 text-xs text-gray-400 animate-pulse">
    对方正在输入...
  </div>
)}
```

6. **Add fallback polling** when WebSocket is disconnected:

```typescript
// Keep existing polling logic but only activate when !isConnected
useEffect(() => {
  if (isConnected || !currentConversationId) return;
  // ... existing polling interval code
}, [isConnected, currentConversationId]);
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd /Users/shibo/Documents/Codex/nailBook/client-frontend
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors related to the modified file.

- [ ] **Step 4: Commit**

```bash
cd /Users/shibo/Documents/Codex/nailBook
git add client-frontend/src/pages/ChatDetail.tsx
git commit -m "feat(client): replace polling with WebSocket in ChatDetail"
```

---

## Task 13: Update Chat.tsx — online dots + notifications (client frontend)

**Files:**
- Modify: `client-frontend/src/pages/Chat.tsx`
- Modify: `client-frontend/src/App.tsx`

- [ ] **Step 1: Add PresenceProvider to App.tsx**

In `client-frontend/src/App.tsx`, wrap the router (inside the existing auth provider) with:

```typescript
import { PresenceProvider } from './hooks/usePresence';

// Inside the component return, wrap the Router/Routes:
<PresenceProvider>
  <Router>
    {/* existing routes */}
  </Router>
</PresenceProvider>
```

- [ ] **Step 2: Read Chat.tsx to understand conversation list rendering**

Read `client-frontend/src/pages/Chat.tsx` to find where conversation avatars are rendered.

- [ ] **Step 3: Add online status dot to conversation list**

In `Chat.tsx`, import and use `usePresence`:

```typescript
import { usePresence } from '../hooks/usePresence';

// Inside the component:
const { isOnline } = usePresence();
```

Add a green dot next to each conversation's avatar:

```typescript
{/* Replace existing avatar rendering with: */}
<div className="relative">
  <img src={conversation.technician.avatarUrl || '/default-avatar.png'} className="w-10 h-10 rounded-full" />
  {isOnline(conversation.technician.id, 'technician') && (
    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
  )}
</div>
```

- [ ] **Step 4: Add real-time new message notification**

Import `useSocket` and listen for `message:new` to show a toast/badge:

```typescript
import { useSocket } from '../hooks/useSocket';

// Inside the component:
const { socket } = useSocket();

useEffect(() => {
  if (!socket) return;

  const onNewMessage = (data: { message: any; conversation: any }) => {
    // Update conversation list with new last message
    setConversations((prev) =>
      prev.map((c) =>
        c.id === data.conversation.id
          ? { ...c, lastMessage: data.message.content, lastMessageAt: data.message.createdAt, unreadCount: (c.unreadCount || 0) + 1 }
          : c,
      ),
    );

    // Browser notification if page not visible
    if (document.visibilityState !== 'visible' && Notification.permission === 'granted') {
      const senderName = data.conversation.technician?.name || '美甲师';
      new Notification(`${senderName} 发来新消息`, {
        body: data.message.messageType === 'image' ? '[图片]' : data.message.content,
        icon: data.conversation.technician?.avatarUrl,
      });
    }
  };

  socket.on('message:new', onNewMessage);
  return () => { socket.off('message:new', onNewMessage); };
}, [socket]);
```

- [ ] **Step 5: Request notification permission**

Add this in a `useEffect` that runs once on mount:

```typescript
useEffect(() => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}, []);
```

- [ ] **Step 6: Verify no TypeScript errors**

```bash
cd /Users/shibo/Documents/Codex/nailBook/client-frontend
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/shibo/Documents/Codex/nailBook
git add client-frontend/src/pages/Chat.tsx client-frontend/src/App.tsx
git commit -m "feat(client): add online status dots and notifications to Chat list"
```

---

## Task 14: Create socket service + hooks (technician frontend)

**Files:**
- Create: `technician-frontend/src/services/socket.ts`
- Create: `technician-frontend/src/hooks/useSocket.ts`
- Create: `technician-frontend/src/hooks/usePresence.ts`
- Create: `technician-frontend/src/hooks/useTyping.ts`

- [ ] **Step 1: Create socket service**

Copy the pattern from client-frontend but use `technician_token`:

```typescript
// technician-frontend/src/services/socket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(token: string): Socket {
  if (socket && socket.connected) return socket;

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  socket = io(window.location.origin, {
    auth: { token: `Bearer ${token}` },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
```

- [ ] **Step 2: Create useSocket hook**

Same as client but reads `technician_token`:

```typescript
// technician-frontend/src/hooks/useSocket.ts
import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '../services/socket';

export function useSocket() {
  const token = localStorage.getItem('technician_token') || '';
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);
    socketRef.current = socket;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) setIsConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [token]);

  return { socket: socketRef.current, isConnected };
}
```

- [ ] **Step 3: Create usePresence hook**

Identical to client-frontend version — copy `client-frontend/src/hooks/usePresence.ts` to `technician-frontend/src/hooks/usePresence.ts`.

- [ ] **Step 4: Create useTyping hook**

Identical to client-frontend version — copy `client-frontend/src/hooks/useTyping.ts` to `technician-frontend/src/hooks/useTyping.ts`.

- [ ] **Step 5: Commit**

```bash
cd /Users/shibo/Documents/Codex/nailBook
git add technician-frontend/src/services/socket.ts
git add technician-frontend/src/hooks/useSocket.ts
git add technician-frontend/src/hooks/usePresence.ts
git add technician-frontend/src/hooks/useTyping.ts
git commit -m "feat(tech): add socket service and hooks"
```

---

## Task 15: Update ChatPage.tsx to use WebSocket (technician frontend)

**Files:**
- Modify: `technician-frontend/src/pages/ChatPage.tsx`

- [ ] **Step 1: Read the current file**

Read `technician-frontend/src/pages/ChatPage.tsx` to understand the component structure.

- [ ] **Step 2: Apply the same pattern as client ChatDetail**

The changes mirror Task 12 but adapted for the technician side:

1. **Add imports:**
```typescript
import { useSocket } from '../hooks/useSocket';
import { useTyping } from '../hooks/useTyping';
```

2. **Replace polling `useEffect`** (the `setInterval(..., 3000)` block) with WebSocket listeners:

```typescript
const { socket, isConnected } = useSocket();
const { isOtherTyping, emitTyping } = useTyping(socket, conversationIdFromUrl ? Number(conversationIdFromUrl) : null);

useEffect(() => {
  if (!socket || !conversationIdFromUrl) return;
  const convId = Number(conversationIdFromUrl);

  const onNewMessage = (data: { message: any; conversation: any }) => {
    if (data.message.conversationId === convId) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
    }
  };

  const onRead = (data: { conversationId: number }) => {
    if (data.conversationId === convId) {
      setMessages((prev) =>
        prev.map((m) => (m.receiverType === 'technician' ? m : { ...m, isRead: true })),
      );
    }
  };

  socket.on('message:new', onNewMessage);
  socket.on('message:read', onRead);

  socket.emit('message:read', { conversationId: convId });

  return () => {
    socket.off('message:new', onNewMessage);
    socket.off('message:read', onRead);
  };
}, [socket, conversationIdFromUrl]);
```

3. **Update send handler** to use WebSocket with REST fallback:

```typescript
// Replace the messageService.sendMessage call with:
if (socket && isConnected) {
  socket.emit('message:send', {
    conversationId: conversationIdFromUrl ? Number(conversationIdFromUrl) : undefined,
    clientId: !conversationIdFromUrl ? clientIdFromUrl : undefined,
    messageType,
    content,
    imageUrl,
  });
} else {
  // existing REST fallback
}
```

4. **Add typing to input onChange:**
```typescript
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setInputValue(e.target.value);
  emitTyping();
};
```

5. **Add typing indicator UI:**
```typescript
{isOtherTyping && (
  <div className="px-4 py-1 text-xs text-gray-400 animate-pulse">
    对方正在输入...
  </div>
)}
```

6. **Keep polling as fallback when disconnected:**
```typescript
useEffect(() => {
  if (isConnected || !conversationIdFromUrl) return;
  // ... existing polling code
}, [isConnected, conversationIdFromUrl]);
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd /Users/shibo/Documents/Codex/nailBook/technician-frontend
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/shibo/Documents/Codex/nailBook
git add technician-frontend/src/pages/ChatPage.tsx
git commit -m "feat(tech): replace polling with WebSocket in ChatPage"
```

---

## Task 16: Update MessagesPage.tsx + App.tsx — online dots + notifications (technician frontend)

**Files:**
- Modify: `technician-frontend/src/pages/MessagesPage.tsx`
- Modify: `technician-frontend/src/App.tsx`

- [ ] **Step 1: Add PresenceProvider to App.tsx**

In `technician-frontend/src/App.tsx`, wrap the router with:

```typescript
import { PresenceProvider } from './hooks/usePresence';

// Wrap inside auth provider:
<PresenceProvider>
  <Router>{/* routes */}</Router>
</PresenceProvider>
```

- [ ] **Step 2: Read MessagesPage.tsx**

Read `technician-frontend/src/pages/MessagesPage.tsx` to find conversation avatar rendering.

- [ ] **Step 3: Add online status dots**

```typescript
import { usePresence } from '../hooks/usePresence';
import { useSocket } from '../hooks/useSocket';

const { isOnline } = usePresence();
```

Add green dot next to client avatars in conversation items:

```typescript
<div className="relative">
  <img src={conversation.client?.avatarUrl || '/default-avatar.png'} className="w-10 h-10 rounded-full" />
  {isOnline(conversation.clientId, 'client') && (
    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
  )}
</div>
```

- [ ] **Step 4: Add real-time message notifications**

```typescript
const { socket } = useSocket();

useEffect(() => {
  if (!socket) return;

  const onNewMessage = (data: { message: any; conversation: any }) => {
    // Update conversation list
    setConversations((prev) =>
      prev.map((c) =>
        c.id === data.conversation.id
          ? { ...c, lastMessage: data.message.content, lastMessageAt: data.message.createdAt, unreadCount: (c.unreadCount || 0) + 1 }
          : c,
      ),
    );

    // Browser notification
    if (document.visibilityState !== 'visible' && Notification.permission === 'granted') {
      const senderName = data.conversation.client?.nickname || '客户';
      new Notification(`${senderName} 发来新消息`, {
        body: data.message.messageType === 'image' ? '[图片]' : data.message.content,
      });
    }
  };

  socket.on('message:new', onNewMessage);
  return () => { socket.off('message:new', onNewMessage); };
}, [socket]);
```

- [ ] **Step 5: Request notification permission**

```typescript
useEffect(() => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}, []);
```

- [ ] **Step 6: Verify no TypeScript errors**

```bash
cd /Users/shibo/Documents/Codex/nailBook/technician-frontend
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/shibo/Documents/Codex/nailBook
git add technician-frontend/src/pages/MessagesPage.tsx technician-frontend/src/App.tsx
git commit -m "feat(tech): add online status dots and notifications to MessagesPage"
```

---

## Task 17: Build verification

**Files:** None (verification only)

- [ ] **Step 1: Build backend**

```bash
cd /Users/shibo/Documents/Codex/nailBook/backend
npm run build 2>&1 | tail -10
```

Expected: Build succeeds.

- [ ] **Step 2: Run backend tests**

```bash
npx jest --no-cache 2>&1 | tail -20
```

Expected: All tests pass.

- [ ] **Step 3: Type-check client frontend**

```bash
cd /Users/shibo/Documents/Codex/nailBook/client-frontend
npx tsc --noEmit 2>&1 | tail -10
```

Expected: No errors.

- [ ] **Step 4: Type-check technician frontend**

```bash
cd /Users/shibo/Documents/Codex/nailBook/technician-frontend
npx tsc --noEmit 2>&1 | tail -10
```

Expected: No errors.

- [ ] **Step 5: Manual smoke test checklist**

Start all three services and verify:

```bash
# Terminal 1: backend
cd /Users/shibo/Documents/Codex/nailBook/backend && npm run start:dev

# Terminal 2: client frontend
cd /Users/shibo/Documents/Codex/nailBook/client-frontend && npm run dev

# Terminal 3: technician frontend
cd /Users/shibo/Documents/Codex/nailBook/technician-frontend && npm run dev
```

Manual tests:
- [ ] Open client chat page → socket connects (check console for `ChatGateway` log)
- [ ] Open technician chat page → socket connects
- [ ] Send message from client → appears instantly in technician chat (no 3s delay)
- [ ] Send message from technician → appears instantly in client chat
- [ ] Mark message as read on one side → other side sees read status update
- [ ] Start typing on one side → other side sees "对方正在输入..."
- [ ] Stop typing for 2s → typing indicator disappears
- [ ] Open multiple tabs → online status works (green dot appears)
- [ ] Close all tabs → green dot disappears for other party
- [ ] Disconnect network → fallback polling activates; reconnect → WebSocket resumes
- [ ] Close browser tab, receive message → Notification API fires (if permitted)

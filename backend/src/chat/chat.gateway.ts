import {
  WebSocketGateway,
  WsException,
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
import { PrismaService } from '../common/prisma/prisma.service';

function getWsOrigin(): string | string[] | boolean {
  const configured = process.env.CORS_ORIGINS?.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (configured?.length) return configured;
  if (process.env.NODE_ENV === 'production') return false;
  return '*';
}

@WebSocketGateway({
  cors: { origin: getWsOrigin(), credentials: true },
  namespace: '/',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private chatService: ChatService,
    private presenceService: PresenceService,
    private typingService: TypingService,
    private prisma: PrismaService,
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
      let tokenVersion = 0;

      const clientSecret =
        process.env.CLIENT_JWT_SECRET || process.env.JWT_SECRET || '';
      const techSecret =
        process.env.TECHNICIAN_JWT_SECRET || process.env.JWT_SECRET || '';

      try {
        const payload = jwt.verify(bearer, clientSecret) as any;
        if (payload.userType === 'client') {
          userId = payload.sub;
          userType = 'client';
          tokenVersion = payload.tv ?? 0;
        }
      } catch {
        // Intentionally empty - try next JWT strategy
      }

      if (!userId) {
        try {
          const payload = jwt.verify(bearer, techSecret) as any;
          if (payload.userType === 'technician') {
            userId = payload.sub;
            userType = 'technician';
            tokenVersion = payload.tv ?? 0;
          }
        } catch {
          // Intentionally empty - invalid token
        }
      }

      if (!userId || !userType) {
        client.emit('error', { message: 'Invalid auth token' });
        client.disconnect();
        return;
      }

      const account = userType === 'client'
        ? await this.prisma.clientUser.findUnique({ where: { id: userId }, select: { status: true, tokenVersion: true } })
        : await this.prisma.technician.findUnique({ where: { id: userId }, select: { status: true, tokenVersion: true } });
      const blocked = !account || account.tokenVersion !== tokenVersion || account.status === 'deleted' || account.status === 'suspended' || (userType === 'client' && account.status !== 'active');
      if (blocked) {
        client.emit('error', { message: 'Account is unavailable' });
        client.disconnect();
        return;
      }
      (client as any).userId = userId;
      (client as any).userType = userType;
      (client as any).tokenVersion = tokenVersion;
      await client.join(`account:${userType}:${userId}`);
      await this.assertSession(client);

      // Join all conversation rooms
      const conversationIds = await this.chatService.getUserConversationIds(
        userId,
        userType,
      );
      for (const convId of conversationIds) {
        client.join(`conversation:${convId}`);
      }

      // Track presence
      const status = this.presenceService.userConnected(userId, userType);
      if (status === 'joined') {
        for (const convId of conversationIds) {
          client
            .to(`conversation:${convId}`)
            .emit('presence:online', { userId, userType });
        }
      }

      // Send current online list to connecting user
      client.emit('presence:sync', {
        onlineUsers: this.presenceService.getOnlineUsers(),
      });

      console.log(
        `[ChatGateway] ${userType} ${userId} connected (socket: ${client.id})`,
      );
    } catch (err) {
      console.error('[ChatGateway] Connection error:', err);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = (client as any).userId as number | undefined;
    const userType = (client as any).userType as
      | 'client'
      | 'technician'
      | undefined;

    if (!userId || !userType) return;

    const status = this.presenceService.userDisconnected(userId);
    if (status === 'left') {
      const conversationIds = await this.chatService.getUserConversationIds(
        userId,
        userType,
      );
      for (const convId of conversationIds) {
        this.server
          .to(`conversation:${convId}`)
          .emit('presence:offline', { userId, userType });
      }
    }

    console.log(`[ChatGateway] ${userType} ${userId} disconnected`);
  }

  private async assertSession(client: Socket) {
    const { userId, userType, tokenVersion } = client as any;
    const account = userType === 'client'
      ? await this.prisma.clientUser.findUnique({ where: { id: userId || 0 }, select: { status: true, tokenVersion: true } })
      : userType === 'technician' ? await this.prisma.technician.findUnique({ where: { id: userId || 0 }, select: { status: true, tokenVersion: true } }) : null;
    if (!account || account.tokenVersion !== tokenVersion || ['deleted', 'suspended'].includes(account.status) || (userType === 'client' && account.status !== 'active')) {
      client.disconnect();
      throw new WsException('账号不可用，请重新登录');
    }
  }

  @SubscribeMessage('message:send')
  async handleMessageSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    await this.assertSession(client);
    const userId = (client as any).userId as number;
    const userType = (client as any).userType as 'client' | 'technician';

    const { message, conversation } = await this.chatService.sendMessage({
      senderType: userType,
      senderId: userId,
      ...dto,
    });

    client.join(`conversation:${conversation.id}`);

    client.to(`conversation:${conversation.id}`).emit('message:new', {
      message,
      conversation,
    });

    return { event: 'message:sent', data: { message, conversation } };
  }

  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number },
  ) {
    await this.assertSession(client);
    const userId = (client as any).userId as number;
    const userType = (client as any).userType as 'client' | 'technician';

    await this.chatService.markAsRead(data.conversationId, userType, userId);

    client.to(`conversation:${data.conversationId}`).emit('message:read', {
      conversationId: data.conversationId,
      readerType: userType,
      readerId: userId,
      readAt: new Date().toISOString(),
    });

    return { event: 'message:read:ack', data: { success: true } };
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number },
  ) {
    await this.assertSession(client);
    const userId = (client as any).userId as number;
    const userType = (client as any).userType as 'client' | 'technician';

    this.typingService.startTyping(data.conversationId, userId, () => {
      client.to(`conversation:${data.conversationId}`).emit('typing:stop', {
        conversationId: data.conversationId,
        userId,
        userType,
      });
    });

    client.to(`conversation:${data.conversationId}`).emit('typing:start', {
      conversationId: data.conversationId,
      userId,
      userType,
    });
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number },
  ) {
    await this.assertSession(client);
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

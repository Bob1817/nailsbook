import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClientMessagesService } from './client-messages.service';

describe('ClientMessagesService', () => {
  let service: ClientMessagesService;
  let prisma: {
    clientTechBinding: { findUnique: jest.Mock };
    conversation: { findFirst: jest.Mock; upsert: jest.Mock };
    message: { findMany: jest.Mock; create: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      clientTechBinding: {
        findUnique: jest.fn(),
      },
      conversation: {
        findFirst: jest.fn(),
        upsert: jest.fn(),
      },
      message: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
    };
    service = new ClientMessagesService(prisma as never);
  });

  it('returns messages only when the conversation belongs to the current client', async () => {
    prisma.conversation.findFirst.mockResolvedValueOnce({
      id: 1,
      clientId: 11,
      techId: 7,
    });
    prisma.message.findMany.mockResolvedValueOnce([
      {
        id: 5,
        conversationId: 1,
        senderType: 'client',
        senderId: 11,
        receiverType: 'technician',
        receiverId: 7,
        messageType: 'text',
        content: '这个款式大概多少钱？',
        imageUrl: null,
        relatedType: null,
        relatedId: null,
        isRead: false,
        createdAt: new Date('2026-04-29T10:00:00.000Z'),
      },
    ]);

    const result = await service.findAll(11, 1);

    expect(prisma.message.findMany).toHaveBeenCalledWith({
      where: { conversationId: 1 },
      orderBy: { createdAt: 'asc' },
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: 5,
        conversationId: 1,
        messageType: 'text',
      }),
    ]);
  });

  it('creates or reuses the single client-technician conversation and sends a client message', async () => {
    prisma.clientTechBinding.findUnique.mockResolvedValueOnce({
      clientId: 11,
      techId: 7,
    });
    prisma.conversation.findFirst.mockResolvedValueOnce({
      id: 1,
      clientId: 11,
      techId: 7,
    });
    prisma.conversation.upsert.mockResolvedValueOnce({
      id: 1,
      clientId: 11,
      techId: 7,
      lastMessage: '这个款式大概多少钱？',
    });
    prisma.message.create.mockResolvedValueOnce({
      id: 6,
      conversationId: 1,
      senderType: 'client',
      senderId: 11,
      receiverType: 'technician',
      receiverId: 7,
      messageType: 'text',
      content: '这个款式大概多少钱？',
      imageUrl: null,
      relatedType: null,
      relatedId: null,
      isRead: false,
      createdAt: new Date('2026-04-29T10:05:00.000Z'),
    });

    const result = await service.create(11, {
      conversationId: 1,
      messageType: 'text',
      content: '这个款式大概多少钱？',
    });

    expect(prisma.conversation.upsert).toHaveBeenCalledWith({
      where: {
        clientId_techId: {
          clientId: 11,
          techId: 7,
        },
      },
      update: expect.objectContaining({
        lastMessage: '这个款式大概多少钱？',
      }),
      create: expect.objectContaining({
        clientId: 11,
        techId: 7,
        lastMessage: '这个款式大概多少钱？',
      }),
    });
    expect(prisma.message.create).toHaveBeenCalledWith({
      data: {
        conversationId: 1,
        senderType: 'client',
        senderId: 11,
        receiverType: 'technician',
        receiverId: 7,
        messageType: 'text',
        content: '这个款式大概多少钱？',
        imageUrl: null,
        relatedType: null,
        relatedId: null,
      },
    });
    expect(result).toMatchObject({
      id: 6,
      conversationId: 1,
      messageType: 'text',
    });
  });

  it('rejects a stale conversation id before mutating conversation state', async () => {
    prisma.clientTechBinding.findUnique.mockResolvedValueOnce({
      clientId: 11,
      techId: 7,
    });
    prisma.conversation.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.create(11, {
        conversationId: 99,
        messageType: 'text',
        content: 'hello',
      }),
    ).rejects.toThrow(new NotFoundException('会话不存在'));

    expect(prisma.conversation.upsert).not.toHaveBeenCalled();
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('rejects reading messages from another clients conversation', async () => {
    prisma.conversation.findFirst.mockResolvedValueOnce(null);

    await expect(service.findAll(11, 99)).rejects.toThrow(
      new NotFoundException('会话不存在'),
    );
  });

  it('rejects unsupported message types before writing', async () => {
    await expect(
      service.create(11, {
        conversationId: 1,
        messageType: 'audio',
        content: 'bad',
      } as never),
    ).rejects.toThrow(new BadRequestException('消息类型不支持'));
  });
});

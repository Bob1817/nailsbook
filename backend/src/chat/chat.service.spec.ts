import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { PrismaService } from '../common/prisma/prisma.service';

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
        id: 1,
        clientId: 10,
        techId: 20,
        lastMessage: 'hello',
        lastMessageAt: new Date(),
      });
      mockPrisma.message.create.mockResolvedValue({
        id: 1,
        conversationId: 1,
        senderType: 'client',
        senderId: 10,
        receiverType: 'technician',
        receiverId: 20,
        messageType: 'text',
        content: 'hello',
        isRead: false,
        createdAt: new Date(),
      });
      mockPrisma.conversation.update.mockResolvedValue({});

      const result = await service.sendMessage({
        senderType: 'client',
        senderId: 10,
        techId: 20,
        messageType: 'text',
        content: 'hello',
      });

      expect(mockPrisma.conversation.create).toHaveBeenCalled();
      expect(mockPrisma.message.create).toHaveBeenCalled();
      expect(result.message.content).toBe('hello');
      expect(result.conversation.id).toBe(1);
    });

    it('should use existing conversation when conversationId is provided', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue({
        id: 5,
        clientId: 10,
        techId: 20,
      });
      mockPrisma.message.create.mockResolvedValue({
        id: 2,
        conversationId: 5,
        senderType: 'technician',
        senderId: 20,
        receiverType: 'client',
        receiverId: 10,
        messageType: 'text',
        content: 'hi',
        isRead: false,
        createdAt: new Date(),
      });
      mockPrisma.conversation.update.mockResolvedValue({});

      const result = await service.sendMessage({
        senderType: 'technician',
        senderId: 20,
        conversationId: 5,
        messageType: 'text',
        content: 'hi',
      });

      expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
      expect(result.message.conversationId).toBe(5);
    });

    it('should throw when conversation not found and no techId/clientId provided', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(null);

      await expect(
        service.sendMessage({
          senderType: 'client',
          senderId: 10,
          conversationId: 999,
          messageType: 'text',
          content: 'hello',
        }),
      ).rejects.toThrow('Conversation not found');
    });

    it('should find existing conversation by clientId_techId unique constraint', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue({
        id: 3,
        clientId: 10,
        techId: 20,
      });
      mockPrisma.message.create.mockResolvedValue({
        id: 3,
        conversationId: 3,
        senderType: 'client',
        senderId: 10,
        receiverType: 'technician',
        receiverId: 20,
        messageType: 'text',
        content: 'test',
        isRead: false,
        createdAt: new Date(),
      });
      mockPrisma.conversation.update.mockResolvedValue({});

      const result = await service.sendMessage({
        senderType: 'client',
        senderId: 10,
        techId: 20,
        messageType: 'text',
        content: 'test',
      });

      expect(mockPrisma.conversation.findUnique).toHaveBeenCalledWith({
        where: { clientId_techId: { clientId: 10, techId: 20 } },
      });
      expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
      expect(result.conversation.id).toBe(3);
    });
  });

  describe('markAsRead', () => {
    it('should update all unread messages in conversation for the given receiver', async () => {
      mockPrisma.message.updateMany.mockResolvedValue({ count: 3 });

      await service.markAsRead(1, 'client', 10);

      expect(mockPrisma.message.updateMany).toHaveBeenCalledWith({
        where: {
          conversationId: 1,
          receiverType: 'client',
          receiverId: 10,
          isRead: false,
        },
        data: { isRead: true },
      });
    });
  });

  describe('getUserConversationIds', () => {
    it('should return conversation IDs for a client', async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ]);

      const ids = await service.getUserConversationIds(10, 'client');

      expect(mockPrisma.conversation.findMany).toHaveBeenCalledWith({
        where: { clientId: 10 },
        select: { id: true },
      });
      expect(ids).toEqual([1, 2, 3]);
    });

    it('should return conversation IDs for a technician', async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([{ id: 5 }]);

      const ids = await service.getUserConversationIds(20, 'technician');

      expect(mockPrisma.conversation.findMany).toHaveBeenCalledWith({
        where: { techId: 20 },
        select: { id: true },
      });
      expect(ids).toEqual([5]);
    });
  });
});

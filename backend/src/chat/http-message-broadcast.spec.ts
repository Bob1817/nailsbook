import { NotFoundException } from '@nestjs/common';
import { ClientMessagesService } from '../client-messages/client-messages.service';
import { TechnicianMessagesService } from '../technician-messages/technician-messages.service';
import { ChatGateway } from './chat.gateway';

const conversation = { id: 9, clientId: 11, techId: 7 };

describe.each(['client', 'technician'] as const)('%s HTTP broadcasts', (role) => {
  const userId = role === 'client' ? 11 : 7;
  let prisma: any;
  let chat: { broadcastMessage: jest.Mock; broadcastRead: jest.Mock };
  let service: ClientMessagesService | TechnicianMessagesService;
  beforeEach(() => {
    prisma = {
      $transaction: jest.fn().mockImplementation((work) => work(prisma)),
      conversation: { update: jest.fn().mockResolvedValue(conversation), findFirst: jest.fn().mockResolvedValue(conversation), upsert: jest.fn().mockResolvedValue(conversation) },
      message: { create: jest.fn().mockResolvedValue({ id: 23, conversationId: 9 }), updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
      clientTechBinding: { findFirst: jest.fn().mockResolvedValue({ id: 1 }) },
      clientUser: { findUnique: jest.fn().mockResolvedValue({ id: 11 }) },
      technician: { findUnique: jest.fn().mockResolvedValue({ id: 7 }) },
      order: { findUnique: jest.fn().mockResolvedValue({ id: 5, technicianId: 7, clientUserId: 11, orderNo: 'ORDER-5' }) },
    };
    chat = { broadcastMessage: jest.fn(), broadcastRead: jest.fn() };
    service = role === 'client' ? new ClientMessagesService(prisma, chat as never) : new TechnicianMessagesService(prisma, chat as never);
  });
  it('broadcasts persisted messages for owned conversations', async () => {
    await service.create(userId, { conversationId: 9, messageType: 'text', content: 'hello' });
    expect(prisma.conversation.findFirst).toHaveBeenCalledWith({ where: { id: 9, [role === 'client' ? 'clientId' : 'techId']: userId } });
    expect(prisma.conversation.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lastMessage: 'hello' }) }));
    expect(chat.broadcastMessage).toHaveBeenCalledTimes(1);
    expect(chat.broadcastMessage).toHaveBeenCalledWith({ id: 23, conversationId: 9 }, conversation);
  });
  it('broadcasts first messages in newly opened conversations', async () => {
    await service.create(userId, { messageType: 'image', imageUrl: '/test.jpg', ...(role === 'client' ? { techId: 7 } : { clientId: 11 }) });
    expect(prisma.conversation.upsert).toHaveBeenCalled();
    expect(chat.broadcastMessage).toHaveBeenCalledTimes(1);
  });
  it('does not broadcast failed writes', async () => {
    prisma.message.create.mockRejectedValue(new Error('database unavailable'));
    await expect(service.create(userId, { conversationId: 9, messageType: 'text' })).rejects.toThrow('database unavailable');
    expect(chat.broadcastMessage).not.toHaveBeenCalled();
  });
  it('does not broadcast when the summary transaction fails', async () => {
    prisma.conversation.update.mockRejectedValue(new Error('summary failed'));
    await expect(service.create(userId, { conversationId: 9, messageType: 'text' })).rejects.toThrow('summary failed');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(chat.broadcastMessage).not.toHaveBeenCalled();
  });
  it('rejects unauthorized sends and reads before writes or broadcasts', async () => {
    prisma.conversation.findFirst.mockResolvedValue(null);
    await expect(service.create(userId, { conversationId: 9, messageType: 'text' })).rejects.toThrow(NotFoundException);
    await expect(service.markAsRead(userId, 9)).rejects.toThrow(NotFoundException);
    expect(prisma.message.create).not.toHaveBeenCalled();
    expect(prisma.message.updateMany).not.toHaveBeenCalled();
    expect(chat.broadcastMessage).not.toHaveBeenCalled();
    expect(chat.broadcastRead).not.toHaveBeenCalled();
  });
  it('broadcasts read receipts only after unread rows change', async () => {
    await service.markAsRead(userId, 9);
    expect(prisma.message.updateMany).toHaveBeenCalledWith({ where: { conversationId: 9, receiverType: role, receiverId: userId, isRead: false }, data: { isRead: true } });
    expect(chat.broadcastRead).toHaveBeenCalledWith(conversation, role, userId);
    prisma.message.updateMany.mockResolvedValue({ count: 0 });
    await service.markAsRead(userId, 9);
    expect(chat.broadcastRead).toHaveBeenCalledTimes(1);
  });
  it('broadcasts forwarded cards after persistence', async () => {
    await service.forward(userId, 5);
    expect(chat.broadcastMessage).toHaveBeenCalledTimes(1);
  });
});

describe('account-room routing', () => {
  it('targets only both accounts including sockets without a conversation room', () => {
    const gateway = new ChatGateway({} as never, {} as never, {} as never, {} as never);
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    gateway.server = { to } as never;
    gateway.broadcastMessage({ id: 23 } as never, conversation as never);
    gateway.broadcastRead(conversation as never, 'client', 11);
    expect(to.mock.calls).toEqual([[['account:client:11', 'account:technician:7']], [['account:client:11', 'account:technician:7']]]);
    expect(emit).toHaveBeenCalledWith('message:new', { message: { id: 23 }, conversation });
    expect(emit).toHaveBeenCalledWith('message:read', expect.objectContaining({ conversationId: 9, readerType: 'client', readerId: 11 }));
  });
});

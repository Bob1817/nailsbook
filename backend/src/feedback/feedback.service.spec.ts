import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';

describe('FeedbackService', () => {
  const prisma = {
    feedback: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const service = new FeedbackService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('scopes client detail lookup to the signed-in owner', async () => {
    prisma.feedback.findFirst.mockResolvedValue(null);
    await expect(service.findMineById(8, 'client', 21)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.feedback.findFirst).toHaveBeenCalledWith({
      where: { id: 8, sourceType: 'client', sourceId: 21 },
    });
  });

  it('requires a reply before feedback can be resolved', async () => {
    prisma.feedback.findUnique.mockResolvedValue({
      id: 8,
      replyContent: null,
      repliedAt: null,
    });
    await expect(
      service.reply(8, { status: 'resolved', replyContent: '' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.feedback.update).not.toHaveBeenCalled();
  });

  it('stores the reply, reply time, and selected status together', async () => {
    prisma.feedback.findUnique.mockResolvedValue({
      id: 8,
      replyContent: null,
      repliedAt: null,
    });
    prisma.feedback.update.mockImplementation(({ data }) =>
      Promise.resolve({ id: 8, attachmentUrls: '[]', ...data }),
    );
    const result = await service.reply(8, {
      status: 'processing',
      replyContent: '已收到，正在核查。',
    });
    expect(result.replyContent).toBe('已收到，正在核查。');
    expect(result.status).toBe('processing');
    expect(result.repliedAt).toBeInstanceOf(Date);
  });
});

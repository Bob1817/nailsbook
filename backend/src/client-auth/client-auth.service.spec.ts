import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientAuthService } from './client-auth.service';

/**
 * 绑定「申请→审批」工作流单元测试（client-auth.service）。
 * 用手搓 prisma mock + 直接 new Service（对齐项目既有 service spec 风格）。
 */
describe('ClientAuthService — 绑定审批工作流', () => {
  let service: ClientAuthService;
  let prisma: any;
  let chatGateway: any;

  beforeEach(() => {
    const emit = jest.fn();
    chatGateway = { server: { to: jest.fn().mockReturnValue({ emit }) } };
    prisma = {
      $transaction: jest.fn(
        async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma),
      ),
      technician: { findUnique: jest.fn() },
      clientTechBinding: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 99 }),
        update: jest.fn().mockResolvedValue({ id: 99, status: 'inactive' }),
        count: jest.fn().mockResolvedValue(0),
      },
      clientUser: {
        findUnique: jest.fn().mockResolvedValue({ nickname: '小红', phone: '13800138001' }),
      },
      clientAddress: {
        findFirst: jest.fn().mockResolvedValue({
          province: '浙江省', city: '杭州市', district: '西湖区', detailAddress: 'A 路 1 号',
        }),
      },
      customer: { upsert: jest.fn() },
      conversation: { upsert: jest.fn().mockResolvedValue({ id: 5 }), findUnique: jest.fn().mockResolvedValue({ id: 5 }) },
      message: { create: jest.fn().mockResolvedValue({ id: 1 }) },
      order: { count: jest.fn().mockResolvedValue(0), updateMany: jest.fn() },
    };
    service = new ClientAuthService(
      prisma, {} as never, {} as never, {} as never, {} as never, chatGateway,
    );
  });

  const activeTech = { id: 1, status: 'active', invitationCode: 'ABC123' };

  describe('bindTechnician（申请）', () => {
    it('邀请码错误 → Unauthorized', async () => {
      prisma.technician.findUnique.mockResolvedValue(activeTech);
      await expect(
        service.bindTechnician(11, { techId: 1, inviteCode: 'WRONG' } as never),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('有效申请 → 创建 pending 并给美甲师发绑定申请系统消息', async () => {
      prisma.technician.findUnique.mockResolvedValue(activeTech);
      prisma.clientTechBinding.findUnique.mockResolvedValue(null);

      const res = await service.bindTechnician(11, {
        techId: 1, inviteCode: 'ABC123', note: '我是老顾客',
      } as never);

      expect(res).toEqual({ status: 'pending', bindingId: 99 });
      expect(prisma.clientTechBinding.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'pending', note: '我是老顾客', techId: 1, clientId: 11 }),
        }),
      );
      // 系统消息：发给美甲师、relatedType=binding、含客户信息与备注
      const msgArg = prisma.message.create.mock.calls[0][0].data;
      expect(msgArg.receiverType).toBe('technician');
      expect(msgArg.relatedType).toBe('binding');
      expect(msgArg.content).toContain('小红');
      expect(msgArg.content).toContain('备注：我是老顾客');
      expect(chatGateway.server.to).toHaveBeenCalled();
    });

    it('已是 active 绑定 → Conflict', async () => {
      prisma.technician.findUnique.mockResolvedValue(activeTech);
      prisma.clientTechBinding.findUnique.mockResolvedValue({ id: 7, status: 'active' });
      await expect(
        service.bindTechnician(11, { techId: 1, inviteCode: 'ABC123' } as never),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('已有 pending 申请 → Conflict（审核中）', async () => {
      prisma.technician.findUnique.mockResolvedValue(activeTech);
      prisma.clientTechBinding.findUnique.mockResolvedValue({ id: 7, status: 'pending' });
      await expect(
        service.bindTechnician(11, { techId: 1, inviteCode: 'ABC123' } as never),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('approveBindingApplication（通过）', () => {
    it('pending → active，补建 customer 并回执客户', async () => {
      prisma.clientTechBinding.findFirst
        .mockResolvedValueOnce({ id: 99, clientId: 11, techId: 1, status: 'pending' })
        .mockResolvedValueOnce(null); // 无默认绑定 → 设为默认

      const res = await service.approveBindingApplication(1, 99);

      expect(res).toEqual({ status: 'active' });
      expect(prisma.clientTechBinding.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'active', isDefault: true }) }),
      );
      expect(prisma.customer.upsert).toHaveBeenCalled();
      expect(prisma.message.create.mock.calls[0][0].data.receiverType).toBe('client');
    });

    it('非 pending → BadRequest', async () => {
      prisma.clientTechBinding.findFirst.mockResolvedValueOnce({ id: 99, status: 'active' });
      await expect(service.approveBindingApplication(1, 99)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('rejectBindingApplication（拒绝）', () => {
    it('pending → rejected 并通知客户', async () => {
      prisma.clientTechBinding.findFirst.mockResolvedValueOnce({ id: 99, clientId: 11, techId: 1, status: 'pending' });
      const res = await service.rejectBindingApplication(1, 99, '名额已满');
      expect(res).toEqual({ status: 'rejected' });
      expect(prisma.clientTechBinding.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'rejected' } }),
      );
      expect(prisma.message.create.mock.calls[0][0].data.content).toContain('名额已满');
    });
  });

  describe('requestRebind（历史会话免邀请码再次申请）', () => {
    it('无历史绑定关系 → BadRequest', async () => {
      prisma.technician.findUnique.mockResolvedValue(activeTech);
      prisma.clientTechBinding.findUnique.mockResolvedValue(null);
      await expect(service.requestRebind(11, 1)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('已解绑(inactive) → 复用并置为 pending', async () => {
      prisma.technician.findUnique.mockResolvedValue(activeTech);
      prisma.clientTechBinding.findUnique.mockResolvedValue({ id: 7, status: 'inactive', inviteCode: 'ABC123' });
      const res = await service.requestRebind(11, 1, '再次申请');
      expect(res).toEqual({ status: 'pending', bindingId: 99 });
      expect(prisma.clientTechBinding.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'pending' }) }),
      );
    });
  });

  describe('unbindTechnician（解绑级联）', () => {
    it('存在待上门/进行中预约 → 禁止解绑 BadRequest', async () => {
      prisma.clientTechBinding.findUnique.mockResolvedValue({ id: 7, status: 'active', isDefault: false });
      prisma.order.count.mockResolvedValue(1); // blocking 订单存在
      await expect(service.unbindTechnician(11, 1)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.clientTechBinding.update).not.toHaveBeenCalled();
    });

    it('无阻塞预约 → 取消其余未完结预约并置 inactive', async () => {
      prisma.clientTechBinding.findUnique.mockResolvedValue({ id: 7, status: 'active', isDefault: false });
      prisma.order.count.mockResolvedValue(0);

      await service.unbindTechnician(11, 1);

      expect(prisma.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'cancelled' } }),
      );
      expect(prisma.clientTechBinding.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'inactive' } }),
      );
    });
  });
});

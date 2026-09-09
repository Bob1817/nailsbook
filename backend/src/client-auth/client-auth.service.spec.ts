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
      technician: { findUnique: jest.fn(), findFirst: jest.fn() },
      technicianFollow: { findUnique: jest.fn(), findMany: jest.fn() },
      clientTechBinding: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 99 }),
        update: jest.fn().mockResolvedValue({ id: 99, status: 'inactive' }),
        count: jest.fn().mockResolvedValue(0),
      },
      clientUser: {
        update: jest.fn(),
        create: jest.fn(),
        findUnique: jest
          .fn()
          .mockResolvedValue({ nickname: '小红', phone: '13800138001' }),
      },
      clientAddress: {
        findFirst: jest.fn().mockResolvedValue({
          province: '浙江省',
          city: '杭州市',
          district: '西湖区',
          detailAddress: 'A 路 1 号',
        }),
      },
      customer: { upsert: jest.fn(), updateMany: jest.fn() },
      conversation: {
        upsert: jest.fn().mockResolvedValue({ id: 5 }),
        findUnique: jest.fn().mockResolvedValue({ id: 5 }),
      },
      message: { create: jest.fn().mockResolvedValue({ id: 1 }) },
      order: { count: jest.fn().mockResolvedValue(0), updateMany: jest.fn() },
    };
    service = new ClientAuthService(
      prisma,
      { sign: jest.fn().mockReturnValueOnce('client-access').mockReturnValueOnce('client-refresh') } as never,
      {} as never,
      {} as never,
      {} as never,
      chatGateway,
    );
  });

  const activeTech = { id: 1, status: 'active', invitationCode: 'ABC12345' };

  describe('美甲师切换为客户身份', () => {
    it('复用同手机号客户并签发客户会话', async () => {
      prisma.technician.findUnique.mockResolvedValue({
        id: 1,
        phone: '13800138001',
        status: 'active',
      });
      prisma.clientUser.findUnique
        .mockResolvedValueOnce({ id: 11, phone: '13800138001' })
        .mockResolvedValueOnce({
          id: 11,
          phone: '13800138001',
          status: 'active',
          tokenVersion: 0,
          bindings: [],
        });

      const result = await service.loginAsClientForTechnician(1);

      expect(result).toEqual(expect.objectContaining({
        accessToken: 'client-access',
        refreshToken: 'client-refresh',
        roles: ['client', 'technician'],
      }));
      expect(prisma.clientUser.create).not.toHaveBeenCalled();
    });

    it('历史美甲师没有客户记录时自动补齐同手机号客户', async () => {
      const technician = {
        id: 1,
        phone: '13800138001',
        name: '贝贝',
        avatarUrl: null,
        city: '杭州',
        status: 'active',
        passwordHash: 'shared-hash',
        managedPasswordCiphertext: null,
      };
      prisma.technician.findUnique.mockResolvedValue(technician);
      prisma.clientUser.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 12,
          phone: technician.phone,
          status: 'active',
          tokenVersion: 0,
          bindings: [],
        });
      prisma.clientUser.create.mockResolvedValue({ id: 12 });

      await service.loginAsClientForTechnician(1);

      expect(prisma.clientUser.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          phone: technician.phone,
          nickname: technician.name,
          passwordHash: technician.passwordHash,
          status: 'active',
        }),
      });
    });

    it('禁用的美甲师不能切换', async () => {
      prisma.technician.findUnique.mockResolvedValue({
        id: 1,
        phone: '13800138001',
        status: 'suspended',
      });
      await expect(service.loginAsClientForTechnician(1)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  it('更新客户头像时同步所有美甲师侧客户快照', async () => {
    prisma.clientUser.update.mockResolvedValue({
      id: 11,
      nickname: '小红',
      phone: '13800138001',
      avatarUrl: '/uploads/new-avatar.webp',
      city: null,
      bio: null,
      status: 'active',
    });

    await service.updateProfile(11, { avatarUrl: '/uploads/new-avatar.webp' });

    expect(prisma.customer.updateMany).toHaveBeenCalledWith({
      where: { clientUserId: 11 },
      data: { avatarUrl: '/uploads/new-avatar.webp' },
    });
  });

  describe('findTechnicianByInviteCode（严格邀请码）', () => {
    it('拒绝非8位字母数字且不查询数据库', async () => {
      await expect(service.findTechnicianByInviteCode('abc!')).rejects.toThrow('邀请码无效');
      expect(prisma.technician.findFirst).not.toHaveBeenCalled();
    });

    it('只按规范化后的完整邀请码查询并返回对应邀请码', async () => {
      prisma.technician.findFirst.mockResolvedValue({ ...activeTech, name: '贝贝', serviceItems: null, shopAddresses: null });
      const result = await service.findTechnicianByInviteCode('abc12345');
      expect(prisma.technician.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ invitationCode: 'ABC12345' }) }));
      expect(result.invitationCode).toBe('ABC12345');
    });
  });

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
        techId: 1,
        inviteCode: 'ABC12345',
        note: '我是老顾客',
      } as never);

      expect(res).toEqual({ status: 'pending', bindingId: 99 });
      expect(prisma.clientTechBinding.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'pending',
            note: '我是老顾客',
            techId: 1,
            clientId: 11,
          }),
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
      prisma.clientTechBinding.findUnique.mockResolvedValue({
        id: 7,
        status: 'active',
      });
      await expect(
        service.bindTechnician(11, {
          techId: 1,
          inviteCode: 'ABC12345',
        } as never),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('已有 pending 申请 → Conflict（审核中）', async () => {
      prisma.technician.findUnique.mockResolvedValue(activeTech);
      prisma.clientTechBinding.findUnique.mockResolvedValue({
        id: 7,
        status: 'pending',
      });
      await expect(
        service.bindTechnician(11, {
          techId: 1,
          inviteCode: 'ABC12345',
        } as never),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('approveBindingApplication（通过）', () => {
    it('pending → active，补建 customer 并回执客户', async () => {
      prisma.clientTechBinding.findFirst
        .mockResolvedValueOnce({
          id: 99,
          clientId: 11,
          techId: 1,
          status: 'pending',
        })
        .mockResolvedValueOnce(null); // 无默认绑定 → 设为默认

      const res = await service.approveBindingApplication(1, 99);

      expect(res).toEqual({ status: 'active' });
      expect(prisma.clientTechBinding.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'active', isDefault: true }),
        }),
      );
      expect(prisma.customer.upsert).toHaveBeenCalled();
      expect(prisma.message.create.mock.calls[0][0].data.receiverType).toBe(
        'client',
      );
    });

    it('非 pending → BadRequest', async () => {
      prisma.clientTechBinding.findFirst.mockResolvedValueOnce({
        id: 99,
        status: 'active',
      });
      await expect(
        service.approveBindingApplication(1, 99),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('rejectBindingApplication（拒绝）', () => {
    it('pending → rejected 并通知客户', async () => {
      prisma.clientTechBinding.findFirst.mockResolvedValueOnce({
        id: 99,
        clientId: 11,
        techId: 1,
        status: 'pending',
      });
      const res = await service.rejectBindingApplication(1, 99, '名额已满');
      expect(res).toEqual({ status: 'rejected' });
      expect(prisma.clientTechBinding.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'rejected' } }),
      );
      expect(prisma.message.create.mock.calls[0][0].data.content).toContain(
        '名额已满',
      );
    });
  });

  describe('requestRebind（历史会话免邀请码再次申请）', () => {
    it('无历史绑定关系 → BadRequest', async () => {
      prisma.technician.findUnique.mockResolvedValue(activeTech);
      prisma.clientTechBinding.findUnique.mockResolvedValue(null);
      prisma.technicianFollow.findUnique.mockResolvedValue(null);
      await expect(service.requestRebind(11, 1)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('已关注美甲师 → 无需邀请码创建 pending 申请', async () => {
      prisma.technician.findUnique.mockResolvedValue(activeTech);
      prisma.clientTechBinding.findUnique.mockResolvedValue(null);
      prisma.technicianFollow.findUnique.mockResolvedValue({ id: 8 });
      const res = await service.requestRebind(11, 1, '从关注列表申请');
      expect(res).toEqual({ status: 'pending', bindingId: 99 });
      expect(prisma.clientTechBinding.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bindSource: 'follow',
            inviteCode: null,
          }),
        }),
      );
    });

    it('已解绑(inactive) → 复用并置为 pending', async () => {
      prisma.technician.findUnique.mockResolvedValue(activeTech);
      prisma.clientTechBinding.findUnique.mockResolvedValue({
        id: 7,
        status: 'inactive',
        inviteCode: 'ABC12345',
      });
      const res = await service.requestRebind(11, 1, '再次申请');
      expect(res).toEqual({ status: 'pending', bindingId: 99 });
      expect(prisma.clientTechBinding.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'pending' }),
        }),
      );
    });
  });

  describe('cancelPendingBinding（取消申请）', () => {
    it('仅允许取消 pending 申请', async () => {
      prisma.clientTechBinding.findUnique.mockResolvedValue({ id: 9, status: 'pending' });
      await expect(service.cancelPendingBinding(11, 1)).resolves.toEqual({ success: true });
      expect(prisma.clientTechBinding.update).toHaveBeenCalledWith({ where: { id: 9 }, data: { status: 'inactive', isDefault: false } });
    });
  });

  describe('unbindTechnician（解绑级联）', () => {
    it('存在待上门/进行中预约 → 禁止解绑 BadRequest', async () => {
      prisma.clientTechBinding.findUnique.mockResolvedValue({
        id: 7,
        status: 'active',
        isDefault: false,
      });
      prisma.order.count.mockResolvedValue(1); // blocking 订单存在
      await expect(service.unbindTechnician(11, 1)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.clientTechBinding.update).not.toHaveBeenCalled();
    });

    it('无阻塞预约 → 取消其余未完结预约并置 inactive', async () => {
      prisma.clientTechBinding.findUnique.mockResolvedValue({
        id: 7,
        status: 'active',
        isDefault: false,
      });
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
  describe('一键预约邀请', () => {
    let previous: string | undefined;
    beforeEach(() => {
      previous = process.env.QUICK_BOOKING_TECHNICIAN_IDS;
      process.env.QUICK_BOOKING_TECHNICIAN_IDS = '1';
      prisma.technician.findFirst = jest.fn().mockResolvedValue(activeTech);
      prisma.clientUser.findUnique.mockResolvedValue({ id: 11, status: 'active', phone: '13800138001' });
    });
    afterEach(() => {
      if (previous === undefined) delete process.env.QUICK_BOOKING_TECHNICIAN_IDS;
      else process.env.QUICK_BOOKING_TECHNICIAN_IDS = previous;
    });
    it('creates an active binding and customer, preserving an existing default', async () => {
      prisma.clientTechBinding.findFirst.mockResolvedValue({ id: 30 });
      await expect(service.bindQuickBookingInvite(11, 1, 'ABC12345')).resolves.toEqual({ status: 'active', techId: 1 });
      expect(prisma.clientTechBinding.create).toHaveBeenCalledWith({ data: expect.objectContaining({ techId: 1, clientId: 11, status: 'active', isDefault: false }) });
      expect(prisma.customer.upsert).toHaveBeenCalledTimes(1);
    });
    it('does not create duplicate active bindings', async () => {
      prisma.clientTechBinding.findUnique.mockResolvedValue({ status: 'active' });
      await service.bindQuickBookingInvite(11, 1, 'ABC12345');
      expect(prisma.clientTechBinding.create).not.toHaveBeenCalled();
    });
    it.each(['pending', 'inactive', 'rejected'])('does not override %s relationships', async (status) => {
      prisma.clientTechBinding.findUnique.mockResolvedValue({ status });
      await expect(service.bindQuickBookingInvite(11, 1, 'ABC12345')).rejects.toThrow(ConflictException);
      expect(prisma.clientTechBinding.update).not.toHaveBeenCalled();
    });
    it('rejects disabled and mismatched invitations', async () => {
      await expect(service.validateQuickBookingInvite(2, 'ABC12345')).rejects.toThrow();
      prisma.technician.findFirst.mockResolvedValue({ ...activeTech, id: 2 });
      await expect(service.validateQuickBookingInvite(1, 'ABC12345')).rejects.toThrow('邀请码与美甲师不匹配');
    });
    it('rejects disabled clients', async () => {
      prisma.clientUser.findUnique.mockResolvedValue({ id: 11, status: 'disabled' });
      await expect(service.bindQuickBookingInvite(11, 1, 'ABC12345')).rejects.toThrow(UnauthorizedException);
    });
  });

});

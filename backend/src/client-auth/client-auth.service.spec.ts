import { BadRequestException, UnauthorizedException } from '@nestjs/common';
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
        updateMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      clientUser: {
        update: jest.fn(),
        create: jest.fn(),
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 11, status: 'active', nickname: '小红', phone: '13800138001' }),
      },
      clientAddress: {
        deleteMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({
          province: '浙江省',
          city: '杭州市',
          district: '西湖区',
          detailAddress: 'A 路 1 号',
        }),
      },
      customer: { upsert: jest.fn(), updateMany: jest.fn() },
      nailWorkShareGrant: { updateMany: jest.fn() },
      deviceToken: { deleteMany: jest.fn() },
      wechatSubscriptionAuthorization: { deleteMany: jest.fn() },
      wechatIdentity: { updateMany: jest.fn() },
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

  it('旧版美甲师切换客户接口被明确阻断', async () => {
    await expect(service.loginAsClientForTechnician(1)).rejects.toThrow(
      '不支持切换账号角色，请注销后再注册',
    );
    expect(prisma.clientUser.create).not.toHaveBeenCalled();
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

  describe('bindTechnician（邀请码直接绑定）', () => {
    it('邀请码错误 → Unauthorized', async () => {
      prisma.technician.findUnique.mockResolvedValue(activeTech);
      await expect(
        service.bindTechnician(11, { techId: 1, inviteCode: 'WRONG' } as never),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('有效邀请码 → 直接创建 active 绑定与客户关系', async () => {
      prisma.technician.findUnique.mockResolvedValue(activeTech);
      prisma.clientTechBinding.findUnique.mockResolvedValue(null);

      const res = await service.bindTechnician(11, {
        techId: 1,
        inviteCode: 'ABC12345',
        note: '我是老顾客',
      } as never);

      expect(res).toEqual({ status: 'active', techId: 1 });
      expect(prisma.clientTechBinding.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'active',
            note: '我是老顾客',
            techId: 1,
            clientId: 11,
          }),
        }),
      );
      expect(prisma.customer.upsert).toHaveBeenCalled();
      expect(prisma.message.create).not.toHaveBeenCalled();
    });

    it('已是 active 绑定 → 幂等返回', async () => {
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
      ).resolves.toEqual({ status: 'active', techId: 1 });
    });

    it('已有 pending 申请 → 直接转为 active', async () => {
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
      ).resolves.toEqual({ status: 'active', techId: 1 });
      expect(prisma.clientTechBinding.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'active' }),
      }));
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

  describe('requestRebind（历史会话直接恢复绑定）', () => {
    it('无历史绑定关系 → BadRequest', async () => {
      prisma.technician.findUnique.mockResolvedValue(activeTech);
      prisma.clientTechBinding.findUnique.mockResolvedValue(null);
      prisma.technicianFollow.findUnique.mockResolvedValue(null);
      await expect(service.requestRebind(11, 1)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('已关注美甲师 → 使用美甲师邀请码直接恢复 active', async () => {
      prisma.technician.findUnique.mockResolvedValue(activeTech);
      prisma.clientTechBinding.findUnique.mockResolvedValue(null);
      prisma.technicianFollow.findUnique.mockResolvedValue({ id: 8 });
      const res = await service.requestRebind(11, 1, '从关注列表申请');
      expect(res).toEqual({ status: 'active', techId: 1 });
      expect(prisma.clientTechBinding.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bindSource: 'follow',
            inviteCode: 'ABC12345',
            status: 'active',
          }),
        }),
      );
    });

    it('已解绑(inactive) → 复用并置为 active', async () => {
      prisma.technician.findUnique.mockResolvedValue(activeTech);
      prisma.clientTechBinding.findUnique.mockResolvedValue({
        id: 7,
        status: 'inactive',
        inviteCode: 'ABC12345',
      });
      const res = await service.requestRebind(11, 1, '再次申请');
      expect(res).toEqual({ status: 'active', techId: 1 });
      expect(prisma.clientTechBinding.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'active' }),
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
      prisma.clientTechBinding.count.mockResolvedValue(2);

      await service.unbindTechnician(11, 1);

      expect(prisma.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'cancelled' } }),
      );
      expect(prisma.clientTechBinding.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'inactive' } }),
      );
    });

    it('最后一位美甲师需明确确认，确认后注销客户账号', async () => {
      prisma.clientTechBinding.findUnique.mockResolvedValue({ id: 7, status: 'active', isDefault: true });
      prisma.clientTechBinding.count.mockResolvedValue(1);
      prisma.order.count.mockResolvedValue(0);

      await expect(service.unbindTechnician(11, 1)).rejects.toThrow('解绑最后一位美甲师将注销账号');
      await expect(service.unbindTechnician(11, 1, true)).resolves.toMatchObject({ accountClosed: true });
      expect(prisma.clientUser.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 11 },
        data: expect.objectContaining({ status: 'deleted', tokenVersion: { increment: 1 } }),
      }));
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
    it.each(['pending', 'inactive', 'rejected'])('activates an invited %s relationship without approval', async (status) => {
      prisma.clientTechBinding.findUnique.mockResolvedValue({ id: 7, status, isDefault: false });
      prisma.clientTechBinding.findFirst.mockResolvedValue(null);
      await expect(service.bindQuickBookingInvite(11, 1, 'ABC12345')).resolves.toEqual({ status: 'active', techId: 1 });
      expect(prisma.clientTechBinding.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: expect.objectContaining({ status: 'active', inviteCode: 'ABC12345', isDefault: true }),
      });
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

describe('登录绑定与首期开放范围', () => {
  const makeService = () => {
    const prisma = {
      clientUser: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      technician: { findUnique: jest.fn(), findFirst: jest.fn() },
      clientTechBinding: {
        findFirst: jest.fn().mockResolvedValue({ id: 1 }),
      },
    };
    const jwt = {
      sign: jest.fn().mockReturnValue('token'),
    };
    const service = Object.create(ClientAuthService.prototype);
    service.prisma = prisma;
    service.jwt = jwt;
    service.signToken = jest.fn().mockReturnValue('access');
    service.signRefreshToken = jest.fn().mockReturnValue('refresh');
    service.parseServiceItems = jest.fn().mockReturnValue([]);
    return { service: service as ClientAuthService, prisma };
  };

  const outOfScopeClient = {
    id: 360,
    phone: '15336520045',
    nickname: '测试客户',
    avatarUrl: null,
    city: null,
    bio: null,
    status: 'active',
    passwordHash: 'hashed',
    tokenVersion: 1,
    bindings: [
      {
        id: 1,
        techId: 55,
        isDefault: true,
        status: 'active',
        technician: {
          id: 55,
          name: '贝贝',
          phone: '15267003169',
          status: 'active',
          homeService: false,
          shopService: true,
          avatarUrl: null,
          city: null,
          serviceArea: null,
          invitationCode: 'EA6A39D2',
          socialMedia: null,
          shopAddresses: null,
          serviceItems: null,
        },
      },
    ],
  };

  beforeEach(() => {
    process.env.MINIPROGRAM_LAUNCH_MODE = 'true';
    process.env.MINIPROGRAM_TECHNICIAN_ID = '57';
    // 模块级缓存会绕过 env，这里直接断言依赖 isLaunchTechnician 的行为
    const launchMode = require('../common/miniprogram-launch-mode');
    launchMode.configureLaunchTechnicianId(57);
  });

  afterEach(() => {
    const launchMode = require('../common/miniprogram-launch-mode');
    launchMode.resetLaunchTechnicianIdConfiguration();
    delete process.env.MINIPROGRAM_LAUNCH_MODE;
    delete process.env.MINIPROGRAM_TECHNICIAN_ID;
  });

  it('密码登录：绑定不在首期范围时报明确原因，而不是“没有绑定美甲师”', async () => {
    const { service, prisma } = makeService();
    prisma.clientUser.findUnique.mockResolvedValue(outOfScopeClient);
    prisma.clientUser.findFirst.mockResolvedValue(outOfScopeClient);
    prisma.technician.findUnique.mockResolvedValue(null);
    prisma.technician.findFirst.mockResolvedValue(null);
    (service as any).bcryptCompare = undefined;

    const bcrypt = require('bcryptjs');
    const compareSpy = jest
      .spyOn(bcrypt, 'compare')
      .mockResolvedValue(true);

    try {
      const result = await service.login({
        phone: '15336520045',
        password: 'any',
      } as never);
      expect(result.technicians).toEqual([]);
      expect(result.bindingsOutsideLaunchScope).toBe(true);
      expect(result.needsOnboarding).toBe(false);
      expect(result.client.phone).toBe('15336520045');
    } finally {
      compareSpy.mockRestore();
    }
  });

  it('buildLoginResult：有绑定但不在首期范围时，错误文案不得暗示未绑定', async () => {
    const { service } = makeService();
    let message = '';
    try {
      (service as any).buildLoginResult(outOfScopeClient);
    } catch (error: any) {
      message = error.message;
    }
    expect(message).toContain('不在本期开放范围');
    expect(message).not.toContain('没有绑定');
    expect(message).not.toContain('尚未绑定指定美甲店');
  });
});

describe('private technician notes', () => {
  const makeService = () => {
    const prisma = { clientTechBinding: { findUnique: jest.fn() }, clientTechnicianNote: { findMany: jest.fn(), upsert: jest.fn() } };
    const service = Object.create(ClientAuthService.prototype);
    service.prisma = prisma;
    return { service: service as ClientAuthService, prisma };
  };
  it('scopes reads to the authenticated client and omits internal fields', async () => {
    const { service, prisma } = makeService();
    await service.getPrivateTechnicianNotes(7);
    expect(prisma.clientTechnicianNote.findMany).toHaveBeenCalledWith({ where: { clientId: 7 }, select: { techId: true, content: true } });
  });
  it('rejects writes without an active binding', async () => {
    const { service, prisma } = makeService();
    prisma.clientTechBinding.findUnique.mockResolvedValue({ status: 'pending' });
    await expect(service.savePrivateTechnicianNote(7, 2, 'note')).rejects.toThrow();
    expect(prisma.clientTechnicianNote.upsert).not.toHaveBeenCalled();
  });
  it('uses the authenticated client in the write key and supports clearing', async () => {
    const { service, prisma } = makeService();
    prisma.clientTechBinding.findUnique.mockResolvedValue({ status: 'active' });
    await service.savePrivateTechnicianNote(7, 2, '   ');
    expect(prisma.clientTechnicianNote.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { clientId_techId: { clientId: 7, techId: 2 } }, update: { content: '' } }));
  });
  it('rejects invalid content before touching storage', async () => {
    const { service, prisma } = makeService();
    await expect(service.savePrivateTechnicianNote(7, 2, 'x'.repeat(201))).rejects.toThrow();
    await expect(service.savePrivateTechnicianNote(7, 2, null)).rejects.toThrow();
    expect(prisma.clientTechnicianNote.upsert).not.toHaveBeenCalled();
  });
});

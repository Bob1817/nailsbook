import { ClientAuthService } from './client-auth.service';

describe('作品分享直接绑定', () => {
  let db: any;
  let service: ClientAuthService;
  beforeEach(() => {
    db = {
      nailWork: { findFirst: jest.fn().mockResolvedValue({ id: 10, visibilityScope: 'public', technician: { id: 7, status: 'active', invitationCode: 'INVITE07' } }) },
      nailWorkShareGrant: { findFirst: jest.fn() },
      clientUser: { findUnique: jest.fn().mockResolvedValue({ id: 3, nickname: '客户', phone: '13800000000' }) },
      clientTechBinding: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      customer: { upsert: jest.fn() },
      conversionEvent: { create: jest.fn() },
      $transaction: jest.fn(async fn => fn(db)),
    };
    service = new ClientAuthService(db, {} as any, {} as any, {} as any, {} as any, {} as any);
  });
  it('未确认不能绑定', async () => {
    await expect(service.bindSharedWork(3, { workId: 10, confirmed: false })).rejects.toThrow();
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('从作品确定归属且不覆盖已有默认绑定', async () => {
    db.clientTechBinding.findFirst.mockResolvedValue({ techId: 9 });
    await expect(service.bindSharedWork(3, { workId: 10, confirmed: true })).resolves.toEqual({ status: 'active', techId: 7, workId: 10 });
    expect(db.clientTechBinding.create).toHaveBeenCalledWith({ data: {
      clientId: 3, techId: 7, inviteCode: 'INVITE07', status: 'active', bindSource: 'work_share', note: null, isDefault: false,
    } });
    expect(db.clientTechBinding.update).not.toHaveBeenCalled();
    expect(db.conversionEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      eventType: 'binding_created', source: 'work_share', clientUserId: 3, workId: 10, technicianId: 7,
    }) });
  });
  it('已有绑定幂等返回', async () => {
    db.clientTechBinding.findUnique.mockResolvedValue({ status: 'active' });
    await service.bindSharedWork(3, { workId: 10, confirmed: true });
    expect(db.clientTechBinding.create).not.toHaveBeenCalled();
    expect(db.conversionEvent.create).not.toHaveBeenCalled();
  });
  it.each(['pending', 'inactive', 'rejected'])('分享预约直接激活 %s 关系', async (status) => {
    db.clientTechBinding.findUnique.mockResolvedValue({ id: 8, status, isDefault: false });
    db.clientTechBinding.findFirst.mockResolvedValue(null);
    await service.bindSharedWork(3, { workId: 10, confirmed: true });
    expect(db.clientTechBinding.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: expect.objectContaining({ status: 'active', inviteCode: 'INVITE07', isDefault: true }),
    });
  });
  it('归档作品不能用于建立绑定', async () => {
    db.nailWork.findFirst.mockResolvedValue(null);
    await expect(service.bindSharedWork(3, { workId: 10, confirmed: true })).rejects.toThrow('作品不存在');
    expect(db.nailWork.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ archivedAt: null }) }));
    expect(db.clientTechBinding.create).not.toHaveBeenCalled();
  });
  it('私密作品无授权不能绑定', async () => {
    db.nailWork.findFirst.mockResolvedValue({ id: 10, visibilityScope: 'authorized_clients', technician: { id: 7, status: 'active', invitationCode: 'INVITE07' } });
    await expect(service.bindSharedWork(3, { workId: 10, confirmed: true })).rejects.toThrow('分享已失效');
  });
  it('失效令牌不能回退为公开访问', async () => {
    db.nailWorkShareGrant.findFirst.mockResolvedValue(null);
    await expect(service.bindSharedWork(3, { workId: 10, confirmed: true, shareToken: 'a'.repeat(48) })).rejects.toThrow('分享已失效');
  });
  it('暂停接单不能绑定预约', async () => {
    db.nailWork.findFirst.mockResolvedValue({ id: 10, visibilityScope: 'public', technician: { id: 7, status: 'inactive', invitationCode: 'INVITE07' } });
    await expect(service.bindSharedWork(3, { workId: 10, confirmed: true })).rejects.toThrow('暂未开启接单');
  });
  it('串行化冲突重试', async () => {
    db.$transaction.mockRejectedValueOnce({ code: 'P2034' });
    await service.bindSharedWork(3, { workId: 10, confirmed: true });
    expect(db.$transaction).toHaveBeenCalledTimes(2);
  });
});

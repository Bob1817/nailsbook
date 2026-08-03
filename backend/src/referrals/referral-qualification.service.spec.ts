import { ReferralQualificationService } from './referral-qualification.service';

describe('ReferralQualificationService', () => {
  const tx: any = {
    referralRelation: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    referralQualification: {
      upsert: jest.fn(),
    },
  };
  const order = {
    id: 21,
    clientUserId: 8,
    technicianId: 3,
    quotePrice: 199,
  };
  let service: ReferralQualificationService;
  const rewardFunds = { issueReferralReward: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    rewardFunds.issueReferralReward.mockResolvedValue({ id: 12 });
    service = new ReferralQualificationService(rewardFunds as any);
  });

  it('首个有效完成订单按有效实付金额的5%确认资格并发放奖励', async () => {
    tx.referralRelation.findUnique.mockResolvedValue({
      id: 5,
      technicianId: 3,
      referrerClientId: 7,
      rewardPromised: true,
      rewardAmount: null,
      minimumOrderAmount: 199,
      qualification: null,
    });
    tx.referralQualification.upsert.mockResolvedValue({
      id: 9,
      rewardAmount: 9.95,
    });

    await expect(
      service.qualifyCompletedOrder(tx, order),
    ).resolves.toEqual({ id: 9, rewardAmount: 9.95 });
    expect(tx.referralQualification.upsert).toHaveBeenCalledWith({
      where: { relationId: 5 },
      create: {
        relationId: 5,
        orderId: 21,
        paidAmount: 199,
        minimumOrderAmount: 199,
        rewardAmount: 9.95,
      },
      update: {},
    });
    expect(tx.referralRelation.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { status: 'qualified' },
    });
    expect(rewardFunds.issueReferralReward).toHaveBeenCalledWith(tx, {
      qualificationId: 9,
      technicianId: 3,
      referrerClientId: 7,
      rewardAmount: 9.95,
    });
  });

  it('基金抵扣后的有效实付金额按5%计算并四舍五入到分', async () => {
    tx.referralRelation.findUnique.mockResolvedValue({
      id: 5,
      technicianId: 3,
      referrerClientId: 7,
      rewardPromised: true,
      rewardAmount: null,
      minimumOrderAmount: 0,
      qualification: null,
    });
    tx.referralQualification.upsert.mockResolvedValue({ id: 10, rewardAmount: 7.45 });

    await service.qualifyCompletedOrder(tx, {
      ...order,
      quotePrice: 199,
      fundDiscountAmount: 50,
    });

    expect(tx.referralQualification.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ paidAmount: 149, rewardAmount: 7.45 }),
      }),
    );
  });

  it('低于最低实付金额时不确认，后续有效订单仍可触发', async () => {
    tx.referralRelation.findUnique.mockResolvedValue({
      id: 5,
      rewardPromised: true,
      rewardAmount: null,
      minimumOrderAmount: 200,
      qualification: null,
    });

    await expect(
      service.qualifyCompletedOrder(tx, order),
    ).resolves.toBeNull();
    expect(tx.referralQualification.upsert).not.toHaveBeenCalled();
  });

  it('重复完成或定时重试返回已有资格且不重复写入', async () => {
    const qualification = { id: 9, orderId: 20, rewardAmount: 30 };
    tx.referralRelation.findUnique.mockResolvedValue({
      id: 5,
      rewardPromised: true,
      rewardAmount: 30,
      minimumOrderAmount: 0,
      technicianId: 3,
      referrerClientId: 7,
      qualification,
    });

    await expect(
      service.qualifyCompletedOrder(tx, order),
    ).resolves.toBe(qualification);
    expect(tx.referralQualification.upsert).not.toHaveBeenCalled();
    expect(tx.referralRelation.update).not.toHaveBeenCalled();
    expect(rewardFunds.issueReferralReward).toHaveBeenCalledWith(tx, {
      qualificationId: 9,
      technicianId: 3,
      referrerClientId: 7,
      rewardAmount: 30,
    });
  });

  it('未承诺奖励的分享不建立奖励资格', async () => {
    tx.referralRelation.findUnique.mockResolvedValue({
      id: 5,
      rewardPromised: false,
      rewardAmount: null,
      minimumOrderAmount: 0,
      qualification: null,
    });

    await expect(
      service.qualifyCompletedOrder(tx, order),
    ).resolves.toBeNull();
    expect(tx.referralQualification.upsert).not.toHaveBeenCalled();
  });
});

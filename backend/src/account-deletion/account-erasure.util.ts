import { Prisma } from '@prisma/client';

export type ErasableAccountType = 'client' | 'technician';

/**
 * 检查账号是否存在未完结的预约、支付或奖励金流水，防止注销/转角色破坏财务与履约完整性。
 */
export async function findAccountBlockers(
  tx: Prisma.TransactionClient,
  type: ErasableAccountType,
  id: number,
): Promise<string[]> {
  const owner = type === 'client' ? { clientUserId: id } : { technicianId: id };
  const orders = await tx.order.count({
    where: { ...owner, status: { notIn: ['completed', 'cancelled', 'expired'] } },
  });
  const payments = await tx.paymentOrder.count({
    where: {
      ...owner,
      status: { notIn: ['paid', 'closed', 'failed', 'refunded', 'cancelled'] },
    },
  });
  const accounts = await tx.rewardAccount.findMany({
    where: owner,
    include: { ledger: true },
  });
  const funds = accounts.filter(
    (a) =>
      Math.abs(
        a.ledger
          .filter((entry) => ['available', 'used'].includes(entry.status))
          .reduce((sum, entry) => sum + entry.amount, 0),
      ) > 0.001 || a.ledger.some((entry) => entry.status === 'pending'),
  ).length;
  return [
    orders ? `还有 ${orders} 个未结束预约` : '',
    payments ? `还有 ${payments} 笔支付或退款待处理` : '',
    funds ? `还有 ${funds} 个基金账户余额待处理` : '',
  ].filter(Boolean);
}

/**
 * 注销并销毁指定账号的全部业务配置、作品可见性、绑定关系、令牌与微信映射。
 */
export async function eraseAccountData(
  tx: Prisma.TransactionClient,
  type: ErasableAccountType,
  id: number,
) {
  const owner = type === 'client' ? { clientUserId: id } : { technicianId: id };
  const common = {
    status: 'deleted',
    phone: `deleted_${type}_${id}`,
    passwordHash: '',
    managedPasswordCiphertext: null,
    avatarUrl: null,
    city: null,
    bio: null,
    tokenVersion: { increment: 1 },
  };
  if (type === 'client') {
    await tx.clientUser.update({
      where: { id },
      data: { ...common, nickname: '已注销用户' },
    });
    await tx.clientAddress.deleteMany({ where: { clientId: id } });
    await tx.customer.updateMany({
      where: { clientUserId: id },
      data: {
        name: '已注销用户',
        phone: null,
        avatarUrl: null,
        gender: null,
        birthday: null,
        address: null,
        tags: null,
        notes: null,
      },
    });
    await tx.nailWorkShareGrant.updateMany({
      where: { clientUserId: id },
      data: { revokedAt: new Date() },
    });
  } else {
    await tx.technician.update({
      where: { id },
      data: {
        ...common,
        name: '已注销美甲师',
        invitationCode: null,
        homeService: false,
        shopService: false,
        shopAddresses: null,
        socialMedia: null,
        coverImageUrl: null,
        province: null,
        serviceArea: null,
      },
    });
    await tx.nailWork.updateMany({
      where: { techId: id },
      data: { isVisible: false },
    });
    if ((tx as any).brandProfile?.updateMany) {
      await (tx as any).brandProfile.updateMany({
        where: { technicianId: id },
        data: {
          publicationStatus: 'draft',
          tagline: null,
          artistIntroduction: null,
          aestheticPhilosophy: null,
          heroImageUrl: null,
          shareCoverUrl: null,
        },
      });
    }
  }
  await tx.clientTechBinding.updateMany({
    where: type === 'client' ? { clientId: id } : { techId: id },
    data: { status: 'inactive', isDefault: false, note: null },
  });
  await tx.deviceToken.deleteMany({ where: { ...owner, role: type } });
  await tx.wechatSubscriptionAuthorization.deleteMany({
    where: { ownerKey: `${type}:${id}`, role: type },
  });
  await tx.wechatIdentity.updateMany({
    where: owner,
    data: type === 'client' ? { clientUserId: null } : { technicianId: null },
  });
}

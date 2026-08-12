import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const minimumTechnicians = Number(process.env.MIN_LAUNCH_TECHNICIANS || 1);
  const minimumWorks = Number(process.env.MIN_PUBLIC_WORKS || 6);
  const [activeTechnicians, publicWorks, demoOrders, wechatConfig] =
    await Promise.all([
      prisma.technician.findMany({
        where: { status: 'active' },
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          bio: true,
          invitationCode: true,
          homeService: true,
          shopService: true,
          serviceItems: true,
          serviceSchedule: true,
        },
      }),
      prisma.nailWork.findMany({
        where: {
          isVisible: true,
          visibilityScope: 'public',
          publicationStatus: 'approved',
          technician: { status: 'active' },
        },
        select: { id: true, title: true, coverUrl: true, images: true },
      }),
      prisma.order.count({ where: { source: 'demo_seed' } }),
      prisma.wechatPlatformConfig.findUnique({ where: { id: 1 } }),
    ]);

  const incompleteTechnicians = activeTechnicians.filter(
    (item) =>
      !item.name.trim() ||
      !item.avatarUrl ||
      !item.bio?.trim() ||
      !item.invitationCode ||
      (!item.homeService && !item.shopService) ||
      !item.serviceItems ||
      !item.serviceSchedule,
  );
  const incompleteWorks = publicWorks.filter(
    (item) => !item.title?.trim() || (!item.coverUrl && !item.images),
  );
  const checks = [
    {
      key: 'active_technicians',
      passed: activeTechnicians.length >= minimumTechnicians,
      detail: `${activeTechnicians.length}/${minimumTechnicians}`,
    },
    {
      key: 'technician_profiles_complete',
      passed: incompleteTechnicians.length === 0,
      detail: incompleteTechnicians.map((item) => item.id).join(',') || 'ok',
    },
    {
      key: 'approved_public_works',
      passed: publicWorks.length >= minimumWorks,
      detail: `${publicWorks.length}/${minimumWorks}`,
    },
    {
      key: 'public_work_content_complete',
      passed: incompleteWorks.length === 0,
      detail: incompleteWorks.map((item) => item.id).join(',') || 'ok',
    },
    {
      key: 'demo_orders_absent',
      passed: demoOrders === 0,
      detail: String(demoOrders),
    },
    {
      key: 'wechat_login_effective',
      passed: Boolean(
        wechatConfig?.loginEnabled &&
        wechatConfig.loginValidatedAt &&
        !wechatConfig.loginValidationError,
      ),
      detail: wechatConfig?.loginValidationError || 'ok',
    },
    {
      key: 'wechat_payment_effective',
      passed: Boolean(
        wechatConfig?.paymentEnabled &&
        wechatConfig.paymentValidatedAt &&
        !wechatConfig.paymentValidationError,
      ),
      detail: wechatConfig?.paymentValidationError || 'ok',
    },
  ];

  console.table(checks);
  if (checks.some((check) => !check.passed)) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

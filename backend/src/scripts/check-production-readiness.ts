import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const minimumWorks = Number(process.env.MIN_PUBLIC_WORKS || 6);
  const wechatConfig = await prisma.wechatPlatformConfig.findUnique({
    where: { id: 1 },
  });
  const launchTechnicianId =
    wechatConfig?.launchTechnicianId ??
    Number(process.env.MINIPROGRAM_TECHNICIAN_ID);
  const requiredText = [
    ['operatorName', wechatConfig?.operatorName],
    ['storeName', wechatConfig?.storeName],
    ['storeAddress', wechatConfig?.storeAddress],
    ['storePhone', wechatConfig?.storePhone],
    ['privacyContact', wechatConfig?.privacyContact],
    ['filingNumber', wechatConfig?.filingNumber],
    ['bookingReminderTemplateId', wechatConfig?.bookingReminderTemplateId],
  ] as const;
  const [activeTechnicians, publicWorks, demoOrders] =
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
          techId: Number.isInteger(launchTechnicianId)
            ? launchTechnicianId
            : -1,
          technician: { status: 'active' },
        },
        select: { id: true, title: true, coverUrl: true, images: true },
      }),
      prisma.order.count({ where: { source: 'demo_seed' } }),
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
      key: 'launch_mode_enabled',
      passed: process.env.MINIPROGRAM_LAUNCH_MODE !== 'false',
      detail: process.env.MINIPROGRAM_LAUNCH_MODE || 'default(true)',
    },
    {
      key: 'single_launch_technician_configured',
      passed:
        Number.isInteger(launchTechnicianId) &&
        activeTechnicians.some((item) => item.id === launchTechnicianId),
      detail: Number.isFinite(launchTechnicianId)
        ? String(launchTechnicianId)
        : 'missing',
    },
    {
      key: 'launch_technician_shop_only',
      passed: activeTechnicians.some(
        (item) =>
          item.id === launchTechnicianId &&
          item.shopService &&
          !item.homeService,
      ),
      detail: 'shop=true, home=false',
    },
    {
      key: 'technician_profiles_complete',
      passed: !incompleteTechnicians.some(
        (item) => item.id === launchTechnicianId,
      ),
      detail:
        incompleteTechnicians
          .filter((item) => item.id === launchTechnicianId)
          .map((item) => item.id)
          .join(',') || 'ok',
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
      key: 'wechat_payment_disabled',
      passed: !wechatConfig?.paymentEnabled,
      detail: wechatConfig?.paymentEnabled ? 'enabled' : 'disabled',
    },
    {
      key: 'release_identity_and_message_configured',
      passed: requiredText.every(([, value]) => Boolean(value?.trim())),
      detail:
        requiredText
          .filter(([, value]) => !value?.trim())
          .map(([key]) => key)
          .join(',') || 'ok',
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

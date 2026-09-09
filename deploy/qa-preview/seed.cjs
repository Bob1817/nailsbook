const { PrismaClient } = require('/app/node_modules/@prisma/client');
const bcrypt = require('/app/node_modules/bcryptjs');
const fs = require('node:fs');

if (process.env.QA_PREVIEW !== 'true' || process.env.DATABASE_URL !== 'file:/app/data/qa-preview.db') {
  throw new Error('Refusing to seed outside the isolated preview database');
}
const prisma = new PrismaClient();
async function main() {
  if (!process.env.QA_ACCOUNT_PASSWORD) throw new Error('Missing QA password');
  const passwordHash = await bcrypt.hash(process.env.QA_ACCOUNT_PASSWORD, 10);
  const serviceItems = JSON.stringify([{ id: 'qa-basic', name: '测试基础美甲', category: 'basic_care', price: 128, durationMinutes: 60, isActive: true, sortOrder: 0 }]);
  const tech = await prisma.technician.upsert({
    where: { phone: '19900000001' }, update: {},
    create: {
      id: 1, phone: '19900000001', name: '测试美甲师（隔离）', passwordHash,
      status: 'active', invitationCode: 'QAPREVIEW', bio: '仅限隔离环境验收，不提供真实服务',
      city: '上海市', province: '上海市', homeService: false, shopService: true,
      shopAddresses: JSON.stringify([{ name: '隔离测试店', city: '上海市', detailAddress: '虚拟测试地址，不提供真实服务', enabled: true }]),
      serviceItems,
      serviceSchedule: JSON.stringify({ activeSchemeId: 'qa', schemes: [{ id: 'qa', days: ['mon','tue','wed','thu','fri','sat','sun'], startTime: '09:00', endTime: '21:00' }], restDays: [] }),
    },
  });
  const service = await prisma.service.upsert({
    where: { technicianId_publicId: { technicianId: tech.id, publicId: 'qa-basic' } }, update: {},
    create: { technicianId: tech.id, publicId: 'qa-basic', name: '测试基础美甲', category: 'basic_care', durationMinutes: 60, priceMinFen: 12800, priceMaxFen: 12800 },
  });
  fs.mkdirSync('/app/uploads', { recursive: true });
  fs.writeFileSync('/app/uploads/qa-sample.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="700"><rect width="600" height="700" fill="#F5F5F7"/><text x="300" y="330" text-anchor="middle" font-size="48" fill="#48484D">QA TEST</text><text x="300" y="400" text-anchor="middle" font-size="24" fill="#6E6E73">ISOLATED PREVIEW</text></svg>');
  if (!await prisma.nailWork.findFirst({ where: { techId: tech.id, title: '隔离测试作品（非真实作品）' } })) {
    await prisma.nailWork.create({ data: {
      techId: tech.id, title: '隔离测试作品（非真实作品）', coverUrl: '/uploads/qa-sample.svg',
      images: JSON.stringify(['/uploads/qa-sample.svg']), price: 128, standardPriceFen: 12800, serviceSubtotalFen: 12800,
      productionMinutes: 60, publicationStatus: 'approved', visibilityScope: 'public',
      isPinned: true, isFeatured: true, isHomepageFeatured: true, publishedAt: new Date(),
      serviceLines: { create: { serviceId: service.id, servicePublicIdSnapshot: 'qa-basic', nameSnapshot: service.name, unitPriceFen: 12800, durationMinutes: 60, quantity: 1, subtotalFen: 12800 } },
    } });
  }
  for (const [phone, nickname, bind] of [['19900000002', '测试客户A', true], ['19900000003', '测试客户B', false]]) {
    const client = await prisma.clientUser.upsert({ where: { phone }, update: {}, create: { phone, nickname, passwordHash, status: 'active' } });
    if (bind) {
      await prisma.clientTechBinding.upsert({ where: { clientId_techId: { clientId: client.id, techId: tech.id } }, update: {}, create: { clientId: client.id, techId: tech.id, inviteCode: 'QAPREVIEW', bindSource: 'invite', isDefault: true, status: 'active' } });
      if (!await prisma.customer.findFirst({ where: { technicianId: tech.id, clientUserId: client.id } })) {
        await prisma.customer.create({ data: { technicianId: tech.id, clientUserId: client.id, name: nickname, phone } });
      }
    }
  }
  await prisma.wechatPlatformConfig.upsert({
    where: { id: 1 },
    create: { id: 1, launchTechnicianId: tech.id, operatorName: '隔离测试主体', storeName: '隔离测试店', storeAddress: '虚拟测试地址', storePhone: '19900000001', privacyContact: 'qa@example.invalid' },
    update: { launchTechnicianId: tech.id, operatorName: '隔离测试主体', storeName: '隔离测试店', storeAddress: '虚拟测试地址', storePhone: '19900000001', privacyContact: 'qa@example.invalid' },
  });
  console.log('QA technician, bound client A and unbound client B ready; no credentials printed.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());

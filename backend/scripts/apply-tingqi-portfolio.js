const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function run() {
  const dataPath = path.join(__dirname, 'uploaded_portfolio_data.json');
  if (!fs.existsSync(dataPath)) {
    throw new Error('uploaded_portfolio_data.json not found!');
  }
  const { uploadedWorks, existingCorrections } = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  const tech = await prisma.technician.findUnique({ where: { phone: '15267003169' } });
  if (!tech) {
    throw new Error('Technician 15267003169 not found!');
  }
  const techId = tech.id;
  console.log(`Found technician ID: ${techId} (${tech.name})`);

  // Fetch active services
  const services = await prisma.service.findMany({
    where: { technicianId: techId, archivedAt: null },
    orderBy: { sortOrder: 'asc' }
  });
  console.log(`Found ${services.length} active services for technician.`);
  const serviceBySortOrder = {};
  services.forEach(s => {
    serviceBySortOrder[s.sortOrder] = s;
  });

  const complexService = serviceBySortOrder[3]; // 复杂款设计 (298)
  const extremeService = serviceBySortOrder[4]; // 极复杂款式 (388)
  console.log(`Using complexService: #${complexService?.id} ${complexService?.name}`);
  console.log(`Using extremeService: #${extremeService?.id} ${extremeService?.name}`);

  // 1. Update existing 5 works
  console.log('=== Updating existing 5 works ===');
  for (const item of existingCorrections) {
    const targetService = item.serviceSortOrder === 4 ? extremeService : complexService;
    const work = await prisma.nailWork.findFirst({
      where: { id: item.id, techId }
    });
    if (!work) {
      console.warn(`Existing work ID ${item.id} not found, skipping.`);
      continue;
    }

    const priceFen = item.price * 100;

    await prisma.nailWork.update({
      where: { id: item.id },
      data: {
        title: item.title,
        price: item.price,
        standardPriceFen: priceFen,
        serviceSubtotalFen: priceFen,
        serviceId: targetService?.id || null,
        style: item.style,
        color: item.color,
        nailShape: item.nailShape,
        nailLength: item.nailLength,
        tags: item.tags,
        designIdea: item.designIdea,
        suitableScene: item.suitableScene,
        outfitSuggestion: item.outfitSuggestion,
        publicationStatus: 'approved',
        isVisible: true,
        assetStatus: 'published',
        publicAuthorizationStatus: 'authorized'
      }
    });

    // Delete existing service lines and recreate with current service snapshot
    await prisma.nailWorkServiceLine.deleteMany({ where: { workId: item.id } });
    if (targetService) {
      await prisma.nailWorkServiceLine.create({
        data: {
          workId: item.id,
          serviceId: targetService.id,
          servicePublicIdSnapshot: targetService.publicId,
          nameSnapshot: targetService.name,
          unitPriceFen: priceFen,
          durationMinutes: targetService.durationMinutes || 120,
          quantity: 1,
          subtotalFen: priceFen,
          sortOrder: 1
        }
      });
    }
    console.log(`Updated existing work #${item.id}: ${item.title} (¥${item.price})`);
  }

  // 2. Insert 7 new works
  console.log('=== Inserting 7 new works ===');
  const createdWorkIds = [];
  for (let i = 0; i < uploadedWorks.length; i++) {
    const w = uploadedWorks[i];
    const targetService = w.serviceSortOrder === 4 ? extremeService : complexService;
    const priceFen = w.price * 100;
    const durationMinutes = w.durationMinutes || (targetService?.durationMinutes ?? 120);

    // Check if work with identical title already exists
    let work = await prisma.nailWork.findFirst({
      where: { techId, title: w.title }
    });

    if (work) {
      console.log(`Work "${w.title}" already exists (#${work.id}), updating...`);
      await prisma.nailWork.update({
        where: { id: work.id },
        data: {
          coverUrl: w.coverUrl,
          coverWidth: w.coverWidth,
          coverHeight: w.coverHeight,
          images: w.images,
          description: w.designIdea,
          designIdea: w.designIdea,
          suitableScene: w.suitableScene,
          outfitSuggestion: w.outfitSuggestion,
          tags: w.tags,
          price: w.price,
          standardPriceFen: priceFen,
          serviceSubtotalFen: priceFen,
          totalDurationMinutes: durationMinutes,
          productionMinutes: durationMinutes,
          serviceId: targetService?.id || null,
          style: w.style,
          color: w.color,
          nailShape: w.nailShape,
          nailLength: w.nailLength,
          craftHighlights: w.craftHighlights,
          publicationStatus: 'approved',
          isVisible: true,
          isReproducible: true,
          assetStatus: 'published',
          publicAuthorizationStatus: 'authorized',
          publishedAt: new Date()
        }
      });
      await prisma.nailWorkServiceLine.deleteMany({ where: { workId: work.id } });
    } else {
      work = await prisma.nailWork.create({
        data: {
          techId,
          title: w.title,
          coverUrl: w.coverUrl,
          coverWidth: w.coverWidth,
          coverHeight: w.coverHeight,
          images: w.images,
          description: w.designIdea,
          designIdea: w.designIdea,
          suitableScene: w.suitableScene,
          outfitSuggestion: w.outfitSuggestion,
          tags: w.tags,
          price: w.price,
          standardPriceFen: priceFen,
          serviceSubtotalFen: priceFen,
          totalDurationMinutes: durationMinutes,
          productionMinutes: durationMinutes,
          serviceId: targetService?.id || null,
          style: w.style,
          color: w.color,
          nailShape: w.nailShape,
          nailLength: w.nailLength,
          craftHighlights: w.craftHighlights,
          publicationStatus: 'approved',
          isVisible: true,
          isReproducible: true,
          assetStatus: 'published',
          publicAuthorizationStatus: 'authorized',
          publishedAt: new Date(),
          sortOrder: i + 1
        }
      });
      console.log(`Created new work #${work.id}: ${w.title} (¥${w.price})`);
    }

    if (targetService) {
      await prisma.nailWorkServiceLine.create({
        data: {
          workId: work.id,
          serviceId: targetService.id,
          servicePublicIdSnapshot: targetService.publicId,
          nameSnapshot: targetService.name,
          unitPriceFen: priceFen,
          durationMinutes: durationMinutes,
          quantity: 1,
          subtotalFen: priceFen,
          sortOrder: 1
        }
      });
    }
    createdWorkIds.push(work.id);
  }

  // 3. Set top 3 heroSlots for homepage showcases
  // Reset existing heroSlots first to avoid unique constraint clash
  await prisma.nailWork.updateMany({
    where: { techId },
    data: { heroSlot: null, isFeatured: false, isHomepageFeatured: false }
  });

  // Pick top 3 signature works for heroSlot:
  // Slot 1: 巴洛克哥特暗黑高定 (作品5) - 最重工大片
  // Slot 2: 烟岚流银水墨大理石 (作品6) - 美院国风代表
  // Slot 3: 极光流金微波流线 (作品2) - 优雅轻奢爆款
  if (createdWorkIds.length >= 6) {
    await prisma.nailWork.update({
      where: { id: createdWorkIds[4] }, // 作品5
      data: { heroSlot: 1, isFeatured: true, isHomepageFeatured: true }
    });
    await prisma.nailWork.update({
      where: { id: createdWorkIds[5] }, // 作品6
      data: { heroSlot: 2, isFeatured: true, isHomepageFeatured: true }
    });
    await prisma.nailWork.update({
      where: { id: createdWorkIds[1] }, // 作品2
      data: { heroSlot: 3, isFeatured: true, isHomepageFeatured: true }
    });
    console.log('Configured top 3 hero recommendations on homepage.');
  }

  console.log('=== All works synchronized successfully! ===');
}

run()
  .catch(err => {
    console.error('Execution failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

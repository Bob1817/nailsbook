import { PrismaClient } from '@prisma/client';
import { ensureDemoData } from '../demo-data.seed';

async function main() {
  const prisma = new PrismaClient();

  try {
    const result = await ensureDemoData(prisma);
    console.log(`Demo seed verified for technician ${result.technicianPhone}`);
    console.log(`Clients: ${result.clientPhones.join(', ')}`);
    console.log(`Orders: ${result.orderNos.join(', ')}`);
    console.log(`Revenues: ${result.revenueNos.join(', ')}`);
    console.log(`Artist applications: ${result.artistApplicationPhones.join(', ')}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Demo seed failed');
  console.error(error);
  process.exit(1);
});

/**
 * 试用申请记录重复手机号清洗去重脚本。
 *
 * 运行方式：
 *   本地开发：
 *     cd backend && npx ts-node -r tsconfig-paths/register src/scripts/deduplicate-artist-applications.ts
 *   容器/生产：
 *     docker exec -it nailbook-backend-1 node dist/src/scripts/deduplicate-artist-applications.js
 */

import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ArtistApplicationsService } from '../artist-applications/artist-applications.service';

async function main() {
  const prisma = new PrismaClient();

  try {
    const service = new ArtistApplicationsService(prisma as unknown as PrismaService);
    console.log('开始扫描并去重美甲师试用申请 (ArtistApplication)...');

    const result = await service.deduplicateApplications();

    console.log('----------------------------------------');
    console.log(`扫描申请总数: ${result.scannedCount}`);
    console.log(`发现重复手机号数: ${result.duplicatePhoneCount}`);
    console.log(`删除冗余记录数: ${result.deletedCount}`);
    console.log('----------------------------------------');

    if (result.details.length > 0) {
      console.log('去重明细:');
      for (const item of result.details) {
        console.log(
          `  - 手机号: ${item.phone} -> 保留记录 ID: ${item.keptId} (状态: ${item.keptStatus})，已删除记录 IDs: [${item.deletedIds.join(', ')}]`,
        );
      }
    } else {
      console.log('系统中无重复手机号记录，数据干净。');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('去重执行失败：', err);
  process.exit(1);
});

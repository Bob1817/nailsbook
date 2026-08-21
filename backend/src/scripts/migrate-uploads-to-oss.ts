/**
 * 迁移脚本：将数据库中 /uploads/ 开头的图片 URL 上传到阿里云 OSS，
 * 然后更新数据库记录为 OSS 绝对 URL。
 *
 * 用法（在 ECS 服务器上通过 docker exec 运行）：
 *   # 1. 预览模式（容器名按 docker ps 实际名称替换）
 *   docker exec -it nailbook-backend-1 sh -c \
 *     "DATABASE_URL=file:/app/data/prod.db node dist/src/scripts/migrate-uploads-to-oss.js"
 *
 *   # 2. 实际执行
 *   docker exec -it nailbook-backend-1 sh -c \
 *     "DATABASE_URL=file:/app/data/prod.db node dist/src/scripts/migrate-uploads-to-oss.js --apply"
 *
 * 本地开发用法：
 *   cd backend
 *   npx ts-node src/scripts/migrate-uploads-to-oss.ts          # 预览模式
 *   npx ts-node src/scripts/migrate-uploads-to-oss.ts --apply   # 实际执行
 */
import { PrismaClient } from '@prisma/client';
import OSS from 'ali-oss';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ---- 配置 ----
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const DRY_RUN = !process.argv.includes('--apply');

const OSS_REGION = process.env.OSS_REGION || 'oss-cn-hangzhou';
const OSS_BUCKET = process.env.OSS_BUCKET || '';
const OSS_ACCESS_KEY_ID = process.env.OSS_ACCESS_KEY_ID || '';
const OSS_ACCESS_KEY_SECRET = process.env.OSS_ACCESS_KEY_SECRET || '';
const OSS_ENDPOINT = process.env.OSS_ENDPOINT || undefined;
const OSS_BASE_URL = process.env.OSS_BASE_URL || '';
const OSS_PREFIX = (process.env.OSS_PREFIX || 'images/').replace(/^\/+|\/+$/g, '') + '/';

const prisma = new PrismaClient();

function getOssClient(): OSS {
  return new OSS({
    region: OSS_REGION,
    accessKeyId: OSS_ACCESS_KEY_ID,
    accessKeySecret: OSS_ACCESS_KEY_SECRET,
    bucket: OSS_BUCKET,
    endpoint: OSS_ENDPOINT,
    secure: true,
  });
}

function buildOssUrl(objectKey: string): string {
  if (OSS_BASE_URL) {
    return `${OSS_BASE_URL.replace(/\/+$/, '')}/${objectKey}`;
  }
  // 默认 OSS 域名
  const endpoint = OSS_ENDPOINT || `oss-${OSS_REGION.replace('oss-', '')}.aliyuncs.com`;
  return `https://${OSS_BUCKET}.${endpoint}/${objectKey}`;
}

interface MigrationItem {
  table: string;
  id: number;
  column: string;
  oldValue: string;
  newValue?: string;
}

async function uploadFile(localPath: string, ossClient: OSS): Promise<string | null> {
  if (!fs.existsSync(localPath)) {
    console.warn(`  ⚠ 文件不存在: ${localPath}`);
    return null;
  }
  const buffer = fs.readFileSync(localPath);
  const ext = path.extname(localPath).toLowerCase();
  const mimeType: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };
  const mime = mimeType[ext] || 'application/octet-stream';
  const objectKey = `${OSS_PREFIX}${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;

  if (DRY_RUN) {
    console.log(`  [DRY] 会上传 ${localPath} → ${objectKey}`);
    return buildOssUrl(objectKey);
  }

  await ossClient.put(objectKey, buffer, {
    mime,
    headers: { 'Cache-Control': 'public, max-age=31536000' },
  });
  return buildOssUrl(objectKey);
}

/** 替换字符串中的 /uploads/ 路径；返回 null 表示无需变更 */
async function migrateValue(
  value: string | null | undefined,
  ossClient: OSS,
): Promise<string | null> {
  if (!value) return null;

  // 处理 JSON 数组格式（如 NailWork.images, Order.customImages）
  if (value.startsWith('[')) {
    try {
      const arr: string[] = JSON.parse(value);
      let changed = false;
      const result = await Promise.all(
        arr.map(async (url) => {
          if (!url.startsWith('/uploads/')) return url;
          const localPath = path.join(UPLOADS_DIR, path.basename(url));
          const newUrl = await uploadFile(localPath, ossClient);
          if (newUrl) {
            changed = true;
            return newUrl;
          }
          return url;
        }),
      );
      return changed ? JSON.stringify(result) : null;
    } catch {
      // 不是合法 JSON，按普通字符串处理
    }
  }

  // 单个 URL
  if (value.startsWith('/uploads/')) {
    const localPath = path.join(UPLOADS_DIR, path.basename(value));
    const newUrl = await uploadFile(localPath, ossClient);
    return newUrl || null;
  }

  return null;
}

// 需要扫描的字段定义
interface FieldDef {
  table: string;
  model: keyof PrismaClient;
  column: string;
}

const FIELDS: FieldDef[] = [
  { table: 'Technician', model: 'technician', column: 'avatarUrl' },
  { table: 'Customer', model: 'customer', column: 'avatarUrl' },
  { table: 'ClientUser', model: 'clientUser', column: 'avatarUrl' },
  { table: 'NailWork', model: 'nailWork', column: 'coverUrl' },
  { table: 'NailWork', model: 'nailWork', column: 'images' },
  { table: 'Order', model: 'order', column: 'customImages' },
  { table: 'ClientDesignRequest', model: 'clientDesignRequest', column: 'images' },
  { table: 'CustomServiceRequest', model: 'customServiceRequest', column: 'images' },
  { table: 'Message', model: 'message', column: 'imageUrl' },
];

async function main() {
  console.log('=== uploads → OSS 迁移脚本 ===');
  console.log(`模式: ${DRY_RUN ? '🔍 预览（加 --apply 执行）' : '🚀 执行'}`);
  console.log(`本地 uploads 目录: ${UPLOADS_DIR}`);
  console.log(`OSS Bucket: ${OSS_BUCKET}`);
  console.log(`OSS Prefix: ${OSS_PREFIX}`);
  console.log('');

  if (!OSS_BUCKET || !OSS_ACCESS_KEY_ID) {
    console.error('❌ 缺少 OSS 配置，请检查 .env 中的 OSS_* 变量');
    process.exit(1);
  }

  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log('✅ 本地 uploads 目录不存在，无需迁移');
    return;
  }

  const ossClient = getOssClient();
  const allItems: MigrationItem[] = [];

  for (const field of FIELDS) {
    const model = (prisma as any)[field.model];
    if (!model) continue;

    const records = await model.findMany({
      where: {
        [field.column]: { contains: '/uploads/' },
      },
      select: { id: true, [field.column]: true },
    });

    if (records.length === 0) continue;
    console.log(`📋 ${field.table}.${field.column}: ${records.length} 条待迁移`);

    for (const record of records) {
      const oldVal = record[field.column] as string | null;
      const newVal = await migrateValue(oldVal, ossClient);
      if (newVal) {
        allItems.push({
          table: field.table,
          id: record.id,
          column: field.column,
          oldValue: oldVal || '',
          newValue: newVal,
        });
        console.log(`  #${record.id} ${field.column}: ${oldVal} → ${newVal}`);
      }
    }
  }

  console.log(`\n共 ${allItems.length} 条记录需要更新。`);

  if (DRY_RUN) {
    console.log('\n💡 预览模式，未做任何修改。加 --apply 参数执行实际迁移。');
  } else {
    // 按 table 分组批量更新
    const byTable = new Map<string, MigrationItem[]>();
    for (const item of allItems) {
      const key = item.table;
      if (!byTable.has(key)) byTable.set(key, []);
      byTable.get(key)!.push(item);
    }

    for (const [table, items] of byTable) {
      const fieldDef = FIELDS.find((f) => f.table === table)!;
      const model = (prisma as any)[fieldDef.model];
      for (const item of items) {
        await model.update({
          where: { id: item.id },
          data: { [item.column]: item.newValue },
        });
      }
      console.log(`✅ ${table}: 更新了 ${items.length} 条记录`);
    }
    console.log('\n🎉 迁移完成！');
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('迁移失败:', err);
  prisma.$disconnect();
  process.exit(1);
});

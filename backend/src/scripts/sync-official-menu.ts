/**
 * 公众号自定义菜单运维脚本。
 *
 * 推荐在后端容器内执行：
 *   docker exec -it nailbook-backend-1 node dist/src/scripts/sync-official-menu.js get
 *   docker exec -it nailbook-backend-1 node dist/src/scripts/sync-official-menu.js create
 *   docker exec -it nailbook-backend-1 node dist/src/scripts/sync-official-menu.js delete
 *
 * 本地开发：
 *   npx ts-node -r tsconfig-paths/register src/scripts/sync-official-menu.ts get
 */

import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { OfficialCryptoService } from '../wechat-official/official-crypto.service';
import { OfficialAccessTokenService } from '../wechat-official/official-access-token.service';
import { OfficialMenuService } from '../wechat-official/official-menu.service';
import { WechatOfficialConfigService } from '../wechat-official/wechat-official-config.service';

async function main() {
  const action = (process.argv[2] ?? 'get').toLowerCase();
  if (!['create', 'get', 'delete'].includes(action)) {
    console.error('用法：sync-official-menu.js <create|get|delete>');
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  const crypto = new OfficialCryptoService(new ConfigService());
  const officialConfig = new WechatOfficialConfigService(
    prisma as never,
    crypto,
  );
  const menuService = new OfficialMenuService(
    new OfficialAccessTokenService(officialConfig),
  );

  try {
    if (action === 'create') {
      await menuService.createMenu();
      console.log('菜单创建成功（老用户最长 24 小时内更新，取消关注再关注可立即看到）。');
      return;
    }
    if (action === 'delete') {
      await menuService.deleteMenu();
      console.log('菜单已删除。');
      return;
    }
    const menu = await menuService.getMenu();
    console.log(JSON.stringify(menu, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('菜单操作失败：', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

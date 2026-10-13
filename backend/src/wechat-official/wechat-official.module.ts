import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { OfficialAccessTokenService } from './official-access-token.service';
import { OfficialCryptoService } from './official-crypto.service';
import { OfficialInboxService } from './official-inbox.service';
import { OfficialMenuService } from './official-menu.service';
import {
  AdminWechatOfficialController,
  WechatOfficialCallbackController,
} from './wechat-official.controller';
import { WechatOfficialConfigService } from './wechat-official-config.service';
import { WechatOfficialMessageService } from './wechat-official-message.service';

/**
 * 微信公众号（服务号）接入模块。
 *
 * 能力：消息与事件推送回调、关键词自动回复、关注欢迎语、自定义菜单同步、
 * 关注用户身份（含 unionId）登记、消息留痕与人工客服回复。
 */
@Module({
  imports: [PrismaModule],
  controllers: [
    WechatOfficialCallbackController,
    AdminWechatOfficialController,
  ],
  providers: [
    OfficialCryptoService,
    WechatOfficialConfigService,
    OfficialAccessTokenService,
    OfficialMenuService,
    OfficialInboxService,
    WechatOfficialMessageService,
  ],
  exports: [
    WechatOfficialConfigService,
    OfficialAccessTokenService,
    OfficialMenuService,
    OfficialInboxService,
    WechatOfficialMessageService,
  ],
})
export class WechatOfficialModule {}

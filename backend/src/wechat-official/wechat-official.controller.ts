import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OperationLog } from '../auth/operation-log.decorator';
import { Permissions } from '../auth/permission.decorator';
import {
  ListOfficialMessagesQueryDto,
  ReplyOfficialMessageDto,
} from './dto/official-message.dto';
import { UpdateOfficialConfigDto } from './dto/update-official-config.dto';
import { OfficialAccessTokenService } from './official-access-token.service';
import { OfficialInboxService } from './official-inbox.service';
import { OfficialMenuService } from './official-menu.service';
import {
  buildSignature,
  decryptMessage,
  encryptMessage,
  verifySignature,
} from './official-signature.util';
import { parseWechatXml } from './official-xml.util';
import { WechatOfficialConfigService } from './wechat-official-config.service';
import { WechatOfficialMessageService } from './wechat-official-message.service';

/** 微信消息推送回调（公网，无鉴权，靠签名校验保证来源可信）。 */
@Controller('wechat/official')
@SkipThrottle()
export class WechatOfficialCallbackController {
  private readonly logger = new Logger(WechatOfficialCallbackController.name);

  constructor(
    private readonly officialConfig: WechatOfficialConfigService,
    private readonly messageService: WechatOfficialMessageService,
  ) {}

  /** 微信保存「服务器配置」时的一次性校验：签名一致则原样返回 echostr。 */
  @Get('callback')
  async verify(
    @Query('signature') signature: string,
    @Query('timestamp') timestamp: string,
    @Query('nonce') nonce: string,
    @Query('echostr') echostr: string,
    @Res() res: Response,
  ) {
    const token = await this.officialConfig.getVerificationToken();
    const valid = verifySignature({ token, timestamp, nonce, signature });
    if (!valid) {
      this.logger.warn('回调签名校验失败（GET）');
      res.status(403).type('text/plain').send('signature mismatch');
      return;
    }
    res.type('text/plain').send(echostr ?? '');
  }

  /** 接收消息与事件推送。 */
  @Post('callback')
  async receive(@Req() req: Request, @Res() res: Response) {
    if (!(await this.officialConfig.isEnabled())) {
      this.logger.warn('公众号消息推送未启用，已忽略本次消息');
      res.type('text/plain').send('success');
      return;
    }

    const config = await this.officialConfig.requireResolvedConfig();
    const rawXml = this.readRawBody(req);
    if (!rawXml) {
      res.type('text/plain').send('success');
      return;
    }

    const envelope = parseWechatXml(rawXml);
    const timestamp = String(req.query.timestamp ?? envelope.CreateTime ?? '');
    const nonce = String(req.query.nonce ?? '');

    let payloadXml = rawXml;
    if (envelope.Encrypt) {
      // 安全模式（或兼容模式下的密文推送）：先校验 msg_signature 再解密。
      const valid = verifySignature({
        token: config.token,
        timestamp,
        nonce,
        signature: String(req.query.msg_signature ?? ''),
        encrypt: envelope.Encrypt,
      });
      if (!valid) {
        this.logger.warn('回调签名校验失败（POST 密文）');
        res.type('text/plain').send('success');
        return;
      }
      try {
        payloadXml = decryptMessage(
          config.encodingAesKey,
          envelope.Encrypt,
        ).message;
      } catch (error) {
        this.logger.error(`消息解密失败：${String(error)}`);
        res.type('text/plain').send('success');
        return;
      }
    } else {
      const valid = verifySignature({
        token: config.token,
        timestamp,
        nonce,
        signature: String(req.query.signature ?? ''),
      });
      if (!valid) {
        this.logger.warn('回调签名校验失败（POST 明文）');
        res.type('text/plain').send('success');
        return;
      }
    }

    let replyXml = '';
    try {
      replyXml = await this.messageService.handleMessage(payloadXml);
    } catch (error) {
      this.logger.error(`处理微信消息失败：${String(error)}`);
    }

    if (!replyXml) {
      // 空串会让微信重试，统一返回 success。
      res.type('text/plain').send('success');
      return;
    }

    if (config.encryptMode === 'safe') {
      res.type('application/xml').send(
        this.wrapEncryptedReply(config, replyXml, timestamp, nonce),
      );
      return;
    }

    res.type('application/xml').send(replyXml);
  }

  private readRawBody(req: Request): string {
    const body: unknown = req.body;
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    const raw = (req as Request & { rawBody?: Buffer }).rawBody;
    return raw?.toString('utf8') ?? '';
  }

  private wrapEncryptedReply(
    config: { appId: string; token: string; encodingAesKey: string },
    replyXml: string,
    timestamp: string,
    nonce: string,
  ) {
    const encrypted = encryptMessage(
      config.encodingAesKey,
      replyXml,
      config.appId,
    );
    const time = timestamp || String(Math.floor(Date.now() / 1000));
    const replyNonce = nonce || String(Math.floor(Math.random() * 1e9));
    const signature = buildSignature(config.token, time, replyNonce, encrypted);
    return [
      '<xml>',
      `<Encrypt><![CDATA[${encrypted}]]></Encrypt>`,
      `<MsgSignature><![CDATA[${signature}]]></MsgSignature>`,
      `<TimeStamp>${time}</TimeStamp>`,
      `<Nonce><![CDATA[${replyNonce}]]></Nonce>`,
      '</xml>',
    ].join('');
  }
}

/** 管理端配置与菜单运维接口。 */
@Controller('admin/wechat-official')
@UseGuards(JwtAuthGuard)
export class AdminWechatOfficialController {
  constructor(
    private readonly officialConfig: WechatOfficialConfigService,
    private readonly accessToken: OfficialAccessTokenService,
    private readonly menuService: OfficialMenuService,
    private readonly inbox: OfficialInboxService,
  ) {}

  @Get('config')
  @Permissions('feature_flag:view')
  getConfig() {
    return this.officialConfig.getAdminConfig();
  }

  @Patch('config')
  @Permissions('feature_flag:update')
  @OperationLog({ module: 'wechat_official', action: 'update_config' })
  updateConfig(@Body() dto: UpdateOfficialConfigDto) {
    this.accessToken.invalidate();
    return this.officialConfig.update(dto);
  }

  /** 校验 AppSecret 与 IP 白名单：能取到 access_token 即为通过。 */
  @Post('config/validate')
  @Permissions('feature_flag:update')
  @OperationLog({ module: 'wechat_official', action: 'validate_config' })
  async validate() {
    this.accessToken.invalidate();
    try {
      await this.accessToken.getAccessToken(true);
      await this.officialConfig.markValidated();
      return { ok: true, message: '凭据与 IP 白名单校验通过' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.officialConfig.markValidated(message);
      return { ok: false, message };
    }
  }

  @Post('menu/sync')
  @Permissions('feature_flag:update')
  @OperationLog({ module: 'wechat_official', action: 'sync_menu' })
  syncMenu() {
    return this.menuService.createMenu();
  }

  @Get('menu')
  @Permissions('feature_flag:view')
  getMenu() {
    return this.menuService.getMenu();
  }

  @Delete('menu')
  @Permissions('feature_flag:update')
  @OperationLog({ module: 'wechat_official', action: 'delete_menu' })
  deleteMenu() {
    return this.menuService.deleteMenu();
  }

  /** 用户消息列表（客服承接）。默认按时间倒序，可只看待人工处理。 */
  @Get('messages')
  @Permissions('feature_flag:view')
  listMessages(@Query() query: ListOfficialMessagesQueryDto) {
    return this.inbox.listMessages(query);
  }

  /** 单个用户的会话线程。 */
  @Get('messages/thread')
  @Permissions('feature_flag:view')
  getMessageThread(
    @Query('openId') openId: string,
    @Query('limit') limit?: string,
  ) {
    return this.inbox.getThread(openId, limit ? Number(limit) : undefined);
  }

  /** 人工回复（客服消息接口，受微信 48 小时窗口限制）。 */
  @Post('messages/reply')
  @Permissions('feature_flag:update')
  @OperationLog({ module: 'wechat_official', action: 'reply_message' })
  replyMessage(
    @Body() dto: ReplyOfficialMessageDto,
    @Req() req: Request,
  ) {
    const operator = (req as Request & { user?: { username?: string } }).user
      ?.username;
    return this.inbox.replyToUser({ ...dto, operator });
  }

  /** 标记单条消息为已处理。 */
  @Post('messages/:id/handle')
  @Permissions('feature_flag:update')
  @OperationLog({ module: 'wechat_official', action: 'handle_message' })
  handleMessage(@Param('id') id: string, @Req() req: Request) {
    const operator = (req as Request & { user?: { username?: string } }).user
      ?.username;
    return this.inbox.markHandled(Number(id), operator);
  }
}

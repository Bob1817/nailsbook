import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { GrantConsentDto } from './dto/manage-consent.dto';
import { PublicationConsentsService } from './publication-consents.service';
@Controller('client/publication-consents')
@UseGuards(ClientJwtAuthGuard)
export class PublicationConsentsController {
  constructor(private readonly service: PublicationConsentsService) {}
  @Get() list(@Req() r: { user: { clientUserId: number } }) {
    return this.service.list(r.user.clientUserId);
  }
  @Post() grant(
    @Req() r: { user: { clientUserId: number } },
    @Body() d: GrantConsentDto,
  ) {
    return this.service.grant(r.user.clientUserId, d);
  }
  @Post('revoke-all') revokeAll(@Req() r: { user: { clientUserId: number } }) {
    return this.service.revokeAll(r.user.clientUserId);
  }
  @Post(':id/revoke') revoke(
    @Req() r: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.revoke(r.user.clientUserId, id);
  }
}

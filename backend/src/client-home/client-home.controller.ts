import { Controller, Delete, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { ClientHomeService } from './client-home.service';

@Controller('client')
@UseGuards(ClientJwtAuthGuard)
export class ClientHomeController {
  constructor(private readonly clientHomeService: ClientHomeService) {}

  @Get('home')
  getHome(@Req() request: { user: { clientUserId: number } }) {
    return this.clientHomeService.getHome(request.user.clientUserId);
  }

  @Get('works')
  getWorks(@Req() request: { user: { clientUserId: number } }) {
    return this.clientHomeService.getWorks(request.user.clientUserId);
  }

  @Get('works/:id')
  getWork(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientHomeService.getWork(request.user.clientUserId, id);
  }

  @Post('works/:id/like')
  likeWork(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientHomeService.likeWork(request.user.clientUserId, id);
  }

  @Post('works/:id/favorite')
  favoriteWork(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientHomeService.favoriteWork(request.user.clientUserId, id);
  }

  @Get('works/:id/comments')
  getComments(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientHomeService.getComments(request.user.clientUserId, id);
  }

  @Post('works/:id/comments')
  addComment(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const content = req.body.content;
    return this.clientHomeService.addComment(request.user.clientUserId, id, content);
  }
}

import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { ClientHomeService } from './client-home.service';

@Controller('client')
@UseGuards(ClientJwtAuthGuard)
@ApiTags('客户端-首页')
@ApiBearerAuth()
export class ClientHomeController {
  constructor(private readonly clientHomeService: ClientHomeService) {}

  @Get('home')
  @ApiOperation({ summary: '获取首页数据' })
  @ApiResponse({ status: 200, description: '返回首页推荐数据' })
  getHome(@Req() request: { user: { clientUserId: number } }) {
    return this.clientHomeService.getHome(request.user.clientUserId);
  }

  @Get('works')
  @ApiOperation({ summary: '获取作品列表' })
  @ApiResponse({ status: 200, description: '返回作品列表' })
  getWorks(@Req() request: { user: { clientUserId: number } }) {
    return this.clientHomeService.getWorks(request.user.clientUserId);
  }

  @Get('works/:id')
  @ApiOperation({ summary: '获取作品详情' })
  @ApiResponse({ status: 200, description: '返回作品详情' })
  @ApiResponse({ status: 404, description: '作品不存在' })
  @ApiParam({ name: 'id', type: Number, description: '作品ID' })
  getWork(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientHomeService.getWork(request.user.clientUserId, id);
  }

  @Post('works/:id/like')
  @ApiOperation({ summary: '点赞作品' })
  @ApiResponse({ status: 200, description: '点赞成功' })
  @ApiParam({ name: 'id', type: Number, description: '作品ID' })
  likeWork(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientHomeService.likeWork(request.user.clientUserId, id);
  }

  @Post('works/:id/favorite')
  @ApiOperation({ summary: '收藏作品' })
  @ApiResponse({ status: 200, description: '收藏成功' })
  @ApiParam({ name: 'id', type: Number, description: '作品ID' })
  favoriteWork(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientHomeService.favoriteWork(request.user.clientUserId, id);
  }

  @Get('works/:id/comments')
  @ApiOperation({ summary: '获取作品评论列表' })
  @ApiResponse({ status: 200, description: '返回评论列表' })
  @ApiParam({ name: 'id', type: Number, description: '作品ID' })
  getComments(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientHomeService.getComments(request.user.clientUserId, id);
  }

  @Post('works/:id/comments')
  @ApiOperation({ summary: '添加作品评论' })
  @ApiResponse({ status: 200, description: '评论成功' })
  @ApiResponse({ status: 400, description: '评论内容为空' })
  @ApiParam({ name: 'id', type: Number, description: '作品ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: '评论内容' },
      },
      required: ['content'],
    },
  })
  addComment(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const content = req.body.content;
    return this.clientHomeService.addComment(
      request.user.clientUserId,
      id,
      content,
    );
  }
}

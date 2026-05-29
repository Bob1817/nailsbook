import {
  Body,
  Controller,
  Delete,
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

  @Get('favorites')
  @ApiOperation({ summary: '获取我收藏的作品列表' })
  @ApiResponse({ status: 200, description: '返回收藏作品列表' })
  getFavorites(@Req() request: { user: { clientUserId: number } }) {
    return this.clientHomeService.getFavorites(request.user.clientUserId);
  }

  @Get('likes')
  @ApiOperation({ summary: '获取我点赞的作品列表' })
  @ApiResponse({ status: 200, description: '返回点赞作品列表' })
  getLikes(@Req() request: { user: { clientUserId: number } }) {
    return this.clientHomeService.getLikes(request.user.clientUserId);
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
  @ApiParam({ name: 'id', type: Number, description: '作品ID' })
  addComment(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body('content') content: string,
    @Body('parentId') parentId?: number,
  ) {
    return this.clientHomeService.addComment(
      request.user.clientUserId,
      id,
      content,
      parentId,
    );
  }

  @Delete('works/:workId/comments/:commentId')
  @ApiOperation({ summary: '删除评论（仅限自己的评论）' })
  @ApiParam({ name: 'workId', type: Number })
  @ApiParam({ name: 'commentId', type: Number })
  @ApiResponse({ status: 200, description: '删除成功' })
  deleteComment(
    @Req() request: { user: { clientUserId: number } },
    @Param('commentId', ParseIntPipe) commentId: number,
  ) {
    return this.clientHomeService.deleteComment(
      request.user.clientUserId,
      commentId,
    );
  }
}

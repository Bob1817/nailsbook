import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { ClientOptionalJwtAuthGuard } from '../client-auth/client-optional-jwt-auth.guard';
import { ClientHomeService } from './client-home.service';

@Controller('client')
@ApiTags('客户端-首页')
export class ClientHomeController {
  constructor(private readonly clientHomeService: ClientHomeService) {}

  // ========== 公开接口（无需登录）==========

  @Get('home')
  @UseGuards(ClientOptionalJwtAuthGuard)
  @ApiOperation({ summary: '获取首页数据（未登录返回公开精品作品）' })
  @ApiResponse({ status: 200, description: '返回首页数据' })
  getHome(@Req() request?: { user?: { clientUserId: number } }) {
    const userId = request?.user?.clientUserId;
    if (userId) {
      return this.clientHomeService.getHome(userId);
    }
    return this.clientHomeService.getHomePublic();
  }

  @Get('featured-works')
  @UseGuards(ClientOptionalJwtAuthGuard)
  @ApiOperation({ summary: '获取推荐作品（分页）' })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  getFeaturedWorks(
    @Req() request?: { user?: { clientUserId: number } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = request?.user?.clientUserId;
    if (userId) {
      return this.clientHomeService.getFeaturedWorks(
        userId,
        page ? parseInt(page, 10) : 1,
        limit ? parseInt(limit, 10) : 10,
      );
    }
    // 未登录：返回公开作品
    return this.clientHomeService.getFeaturedWorksPublic(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('works')
  @UseGuards(ClientOptionalJwtAuthGuard)
  @ApiOperation({ summary: '获取作品列表' })
  @ApiQuery({ name: 'techId', type: Number, required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortDir', required: false })
  getWorks(
    @Req() request?: { user?: { clientUserId: number } },
    @Query('techId') techId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
  ) {
    const userId = request?.user?.clientUserId;
    if (userId) {
      const allowed = ['latest', 'likes', 'comments', 'favorites'] as const;
      const sort = (allowed as readonly string[]).includes(sortBy ?? '')
        ? (sortBy as (typeof allowed)[number])
        : 'latest';
      const dir = sortDir === 'asc' ? 'asc' : 'desc';
      return this.clientHomeService.getWorks(
        userId,
        techId ? parseInt(techId, 10) : undefined,
        sort,
        dir,
      );
    }
    // 未登录：返回公开作品
    return this.clientHomeService.getWorksPublic(
      techId ? parseInt(techId, 10) : undefined,
    );
  }

  @Get('works/:id')
  @UseGuards(ClientOptionalJwtAuthGuard)
  @ApiOperation({ summary: '获取作品详情' })
  @ApiParam({ name: 'id', type: Number })
  getWork(
    @Param('id', ParseIntPipe) id: number,
    @Req() request?: { user?: { clientUserId: number } },
  ) {
    const userId = request?.user?.clientUserId;
    if (userId) {
      return this.clientHomeService.getWork(userId, id);
    }
    return this.clientHomeService.getWorkPublic(id);
  }

  @Get('works/:id/comments')
  @UseGuards(ClientOptionalJwtAuthGuard)
  @ApiOperation({ summary: '获取作品评论列表' })
  @ApiParam({ name: 'id', type: Number })
  getComments(
    @Param('id', ParseIntPipe) id: number,
    @Req() request?: { user?: { clientUserId: number } },
  ) {
    const userId = request?.user?.clientUserId;
    if (userId) {
      return this.clientHomeService.getComments(userId, id);
    }
    return this.clientHomeService.getCommentsPublic(id);
  }

  // ========== 需认证的私密接口 ==========

  @Get('beauty-archive')
  @UseGuards(ClientJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前客户的私人美甲档案' })
  getBeautyArchive(@Req() request: { user: { clientUserId: number } }) {
    return this.clientHomeService.getBeautyArchive(request.user.clientUserId);
  }

  @Get('favorites')
  @UseGuards(ClientJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取我收藏的作品列表' })
  getFavorites(@Req() request: { user: { clientUserId: number } }) {
    return this.clientHomeService.getFavorites(request.user.clientUserId);
  }

  @Get('likes')
  @UseGuards(ClientJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取我点赞的作品列表' })
  getLikes(@Req() request: { user: { clientUserId: number } }) {
    return this.clientHomeService.getLikes(request.user.clientUserId);
  }

  // ========== 写操作（需认证）==========

  @Post('works/:id/like')
  @UseGuards(ClientJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '点赞作品' })
  @ApiParam({ name: 'id', type: Number })
  likeWork(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientHomeService.likeWork(request.user.clientUserId, id);
  }

  @Post('works/:id/favorite')
  @UseGuards(ClientJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '收藏作品' })
  @ApiParam({ name: 'id', type: Number })
  favoriteWork(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientHomeService.favoriteWork(request.user.clientUserId, id);
  }

  @Post('works/:id/share-grant')
  @UseGuards(ClientJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建作品分享授权' })
  createShareGrant(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientHomeService.createShareGrant(
      request.user.clientUserId,
      id,
    );
  }

  @Post('works/:id/share-event')
  @UseGuards(ClientJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '记录客户实际发起作品分享' })
  recordShare(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body('channel') channel?: string,
  ) {
    return this.clientHomeService.recordShare(
      request.user.clientUserId,
      id,
      channel || 'wechat_friend',
    );
  }

  @Post('works/:id/comments')
  @UseGuards(ClientJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '添加作品评论' })
  @ApiParam({ name: 'id', type: Number })
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
  @UseGuards(ClientJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除评论（仅限自己的评论）' })
  @ApiParam({ name: 'workId', type: Number })
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

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
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
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TouristGuard } from '../technician-auth/tourist.guard';
import { TechnicianWorksService } from './technician-works.service';
import { CreateWorkDto, UpdateWorkDto } from './dto/create-work.dto';
import { UpdateWorkAccessDto } from './dto/work-access.dto';
import { SaveHeroRecommendationsDto } from './dto/hero-recommendations.dto';
import { SaveWorkPromotionDto } from './dto/work-promotion.dto';

@ApiTags('美甲师-作品')
@ApiBearerAuth()
@Controller('technician/works')
@UseGuards(TechnicianJwtAuthGuard, TouristGuard)
export class TechnicianWorksController {
  constructor(
    private readonly technicianWorksService: TechnicianWorksService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取作品列表' })
  @ApiResponse({ status: 200, description: '返回作品列表' })
  @ApiResponse({ status: 401, description: '未授权' })
  findAll(@Req() request: { user: { technicianId: number } }) {
    return this.technicianWorksService.findAll(request.user.technicianId);
  }

  @Get('access-options')
  @ApiOperation({ summary: '获取可关联到作品的客户与订单' })
  getAccessOptions(@Req() request: { user: { technicianId: number } }) {
    return this.technicianWorksService.getAccessOptions(request.user.technicianId);
  }

  @Get('hero-recommendations')
  getHeroRecommendations(@Req() request: { user: { technicianId: number } }) {
    return this.technicianWorksService.getHeroRecommendations(request.user.technicianId);
  }

  @Put('hero-recommendations')
  saveHeroRecommendations(
    @Req() request: { user: { technicianId: number } },
    @Body() dto: SaveHeroRecommendationsDto,
  ) {
    return this.technicianWorksService.saveHeroRecommendations(request.user.technicianId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取作品详情' })
  @ApiParam({ name: 'id', type: Number, description: '作品ID' })
  @ApiResponse({ status: 200, description: '返回作品详情' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '作品不存在' })
  findOne(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.technicianWorksService.findOne(request.user.technicianId, id);
  }

  @Get(':id/promotion')
  getPromotion(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.technicianWorksService.getPromotion(request.user.technicianId, id);
  }

  @Put(':id/promotion')
  savePromotion(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveWorkPromotionDto,
  ) {
    return this.technicianWorksService.savePromotion(request.user.technicianId, id, dto);
  }

  @Post()
  @ApiOperation({ summary: '创建作品' })
  @ApiBody({ type: CreateWorkDto })
  @ApiResponse({ status: 200, description: '作品创建成功' })
  @ApiResponse({ status: 400, description: '参数校验失败' })
  @ApiResponse({ status: 401, description: '未授权' })
  create(
    @Req() request: { user: { technicianId: number } },
    @Body() dto: CreateWorkDto,
  ) {
    return this.technicianWorksService.create(request.user.technicianId, dto);
  }

  @Post('drafts')
  @ApiOperation({ summary: '创建作品草稿' })
  createDraft(
    @Req() request: { user: { technicianId: number } },
    @Body() dto: UpdateWorkDto,
  ) {
    return this.technicianWorksService.createDraft(request.user.technicianId, dto);
  }

  @Post('from-order/:orderId')
  @ApiOperation({ summary: '获取或创建已完成订单的唯一作品草稿' })
  createFromOrder(
    @Req() request: { user: { technicianId: number } },
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.technicianWorksService.createFromOrder(request.user.technicianId, orderId);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新作品' })
  @ApiParam({ name: 'id', type: Number, description: '作品ID' })
  @ApiBody({ type: UpdateWorkDto })
  @ApiResponse({ status: 200, description: '作品更新成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '作品不存在' })
  update(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkDto,
  ) {
    return this.technicianWorksService.update(
      request.user.technicianId,
      id,
      dto,
    );
  }

  @Patch(':id/draft')
  @ApiOperation({ summary: '保存作品草稿' })
  saveDraft(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkDto,
  ) {
    return this.technicianWorksService.saveDraft(request.user.technicianId, id, dto);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: '提交作品发布审核' })
  publish(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.technicianWorksService.publish(request.user.technicianId, id);
  }

  @Put(':id/access')
  @ApiOperation({ summary: '更新作品客户关联与授权' })
  updateAccess(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkAccessDto,
  ) {
    return this.technicianWorksService.updateAccess(request.user.technicianId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除作品' })
  @ApiParam({ name: 'id', type: Number, description: '作品ID' })
  @ApiResponse({ status: 200, description: '作品删除成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '作品不存在' })
  remove(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.technicianWorksService.remove(request.user.technicianId, id);
  }

  @Post(':id/toggle-visible')
  @ApiOperation({ summary: '切换作品可见性' })
  @ApiParam({ name: 'id', type: Number, description: '作品ID' })
  @ApiResponse({ status: 200, description: '可见性切换成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '作品不存在' })
  toggleVisible(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.technicianWorksService.toggleVisible(
      request.user.technicianId,
      id,
    );
  }

  @Post(':id/toggle-pinned')
  @ApiOperation({ summary: '切换作品置顶状态' })
  @ApiParam({ name: 'id', type: Number, description: '作品ID' })
  @ApiResponse({ status: 200, description: '置顶状态切换成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '作品不存在' })
  togglePinned(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.technicianWorksService.togglePinned(
      request.user.technicianId,
      id,
    );
  }

  @Post(':id/toggle-featured')
  @ApiOperation({ summary: '切换作品精选状态' })
  @ApiParam({ name: 'id', type: Number, description: '作品ID' })
  @ApiResponse({ status: 200, description: '精选状态切换成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '作品不存在' })
  toggleFeatured(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.technicianWorksService.toggleFeatured(
      request.user.technicianId,
      id,
    );
  }

  @Post(':id/like')
  @ApiOperation({ summary: '点赞作品' })
  @ApiParam({ name: 'id', type: Number, description: '作品ID' })
  @ApiResponse({ status: 200, description: '点赞成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '作品不存在' })
  likeWork(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.technicianWorksService.likeWork(
      id,
      request.user.technicianId,
      undefined,
    );
  }

  @Post(':id/favorite')
  @ApiOperation({ summary: '收藏作品' })
  @ApiParam({ name: 'id', type: Number, description: '作品ID' })
  @ApiResponse({ status: 200, description: '收藏成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '作品不存在' })
  favoriteWork(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.technicianWorksService.favoriteWork(
      id,
      request.user.technicianId,
      undefined,
    );
  }

  @Get(':id/comments')
  @ApiOperation({ summary: '获取作品评论列表' })
  @ApiParam({ name: 'id', type: Number, description: '作品ID' })
  @ApiResponse({ status: 200, description: '返回评论列表' })
  @ApiResponse({ status: 404, description: '作品不存在' })
  getComments(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.technicianWorksService.getComments(id, request.user.technicianId);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: '添加作品评论' })
  @ApiParam({ name: 'id', type: Number, description: '作品ID' })
  @ApiBody({
    schema: {
      properties: { content: { type: 'string', description: '评论内容' } },
      required: ['content'],
    },
  })
  @ApiResponse({ status: 200, description: '评论添加成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '作品不存在' })
  addComment(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body('content') content: string,
    @Body('parentId') parentId?: number,
  ) {
    return this.technicianWorksService.addComment(
      id,
      content,
      request.user.technicianId,
      undefined,
      parentId,
    );
  }

  @Delete(':workId/comments/:commentId')
  @ApiOperation({ summary: '删除作品评论' })
  @ApiParam({ name: 'workId', type: String, description: '作品ID' })
  @ApiParam({ name: 'commentId', type: Number, description: '评论ID' })
  @ApiResponse({ status: 200, description: '评论删除成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '评论不存在' })
  deleteComment(
    @Req() request: { user: { technicianId: number } },
    @Param('commentId', ParseIntPipe) commentId: number,
  ) {
    return this.technicianWorksService.deleteComment(
      commentId,
      request.user.technicianId,
    );
  }

  @Post(':workId/comments/:commentId/pin')
  @ApiOperation({ summary: '置顶/取消置顶评论' })
  @ApiParam({ name: 'workId', type: Number })
  @ApiParam({ name: 'commentId', type: Number })
  @ApiResponse({ status: 200, description: '操作成功' })
  pinComment(
    @Req() request: { user: { technicianId: number } },
    @Param('commentId', ParseIntPipe) commentId: number,
  ) {
    return this.technicianWorksService.pinComment(
      commentId,
      request.user.technicianId,
    );
  }

  @Post(':workId/comments/:commentId/hide')
  @ApiOperation({ summary: '隐藏/取消隐藏评论' })
  @ApiParam({ name: 'workId', type: Number })
  @ApiParam({ name: 'commentId', type: Number })
  @ApiResponse({ status: 200, description: '操作成功' })
  hideComment(
    @Req() request: { user: { technicianId: number } },
    @Param('commentId', ParseIntPipe) commentId: number,
  ) {
    return this.technicianWorksService.hideComment(
      commentId,
      request.user.technicianId,
    );
  }

  @Post(':id/mark-comments-read')
  @ApiOperation({ summary: '标记评论已读' })
  @ApiParam({ name: 'id', type: Number, description: '作品ID' })
  @ApiResponse({ status: 200, description: '标记成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '作品不存在' })
  markCommentsAsRead(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.technicianWorksService.markCommentsAsRead(
      id,
      request.user.technicianId,
    );
  }

  @Post(':id/mark-likes-read')
  @ApiOperation({ summary: '标记点赞已读' })
  @ApiParam({ name: 'id', type: Number, description: '作品ID' })
  @ApiResponse({ status: 200, description: '标记成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '作品不存在' })
  markLikesAsRead(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.technicianWorksService.markLikesAsRead(
      id,
      request.user.technicianId,
    );
  }

  @Post(':id/mark-favorites-read')
  @ApiOperation({ summary: '标记收藏已读' })
  @ApiParam({ name: 'id', type: Number, description: '作品ID' })
  @ApiResponse({ status: 200, description: '标记成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '作品不存在' })
  markFavoritesAsRead(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.technicianWorksService.markFavoritesAsRead(
      id,
      request.user.technicianId,
    );
  }
}

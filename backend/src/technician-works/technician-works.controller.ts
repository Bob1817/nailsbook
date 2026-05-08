import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TechnicianWorksService } from './technician-works.service';
import { CreateWorkDto, UpdateWorkDto } from './dto/create-work.dto';

@Controller('technician/works')
@UseGuards(TechnicianJwtAuthGuard)
export class TechnicianWorksController {
  constructor(private readonly technicianWorksService: TechnicianWorksService) {}

  @Get()
  findAll(
    @Req() request: { user: { technicianId: number } },
  ) {
    return this.technicianWorksService.findAll(request.user.technicianId);
  }

  @Get(':id')
  findOne(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.technicianWorksService.findOne(request.user.technicianId, id);
  }

  @Post()
  create(
    @Req() request: { user: { technicianId: number } },
    @Body() dto: CreateWorkDto,
  ) {
    return this.technicianWorksService.create(request.user.technicianId, dto);
  }

  @Patch(':id')
  update(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkDto,
  ) {
    return this.technicianWorksService.update(request.user.technicianId, id, dto);
  }

  @Delete(':id')
  remove(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.technicianWorksService.remove(request.user.technicianId, id);
  }

  @Post(':id/toggle-visible')
  toggleVisible(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.technicianWorksService.toggleVisible(request.user.technicianId, id);
  }

  @Post(':id/toggle-pinned')
  togglePinned(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.technicianWorksService.togglePinned(request.user.technicianId, id);
  }

  @Post(':id/toggle-featured')
  toggleFeatured(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.technicianWorksService.toggleFeatured(request.user.technicianId, id);
  }

  @Post(':id/like')
  likeWork(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.technicianWorksService.likeWork(id, request.user.technicianId, undefined);
  }

  @Post(':id/favorite')
  favoriteWork(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.technicianWorksService.favoriteWork(id, request.user.technicianId, undefined);
  }

  @Get(':id/comments')
  getComments(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.technicianWorksService.getComments(id);
  }

  @Post(':id/comments')
  addComment(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body('content') content: string,
  ) {
    return this.technicianWorksService.addComment(id, content, request.user.technicianId, undefined);
  }

  @Delete(':workId/comments/:commentId')
  deleteComment(
    @Req() request: { user: { technicianId: number } },
    @Param('commentId', ParseIntPipe) commentId: number,
  ) {
    return this.technicianWorksService.deleteComment(commentId, request.user.technicianId);
  }

  @Post(':id/mark-comments-read')
  markCommentsAsRead(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.technicianWorksService.markCommentsAsRead(id, request.user.technicianId);
  }
}

import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { DemoService } from './demo.service';

@ApiTags('公开样板间与 Demo')
@Controller('demo')
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  @Get('showcase')
  @ApiOperation({ summary: '获取免登录只读样板间数据（一期）' })
  getShowcase() {
    return this.demoService.getShowcaseData();
  }

  @Post('showcase/quote-preview')
  @ApiOperation({ summary: '样板间只读快捷报价试算（无落库）' })
  quotePreview(
    @Body()
    body: {
      workPrice?: number;
      workDurationMinutes?: number;
      addonIds?: string[];
    },
  ) {
    return this.demoService.calculateShowcaseQuotePreview(body || {});
  }

  @Post('enter')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: '一键免密进入共享 Demo 临时会话（二期）' })
  enterDemo(
    @Body() body?: { role?: 'technician' | 'client' },
    @Query('role') queryRole?: 'technician' | 'client',
  ) {
    const role = body?.role || queryRole || 'technician';
    return this.demoService.enterDemoWorkspace(
      role === 'client' ? 'client' : 'technician',
    );
  }
}

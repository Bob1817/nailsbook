import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { PrismaService } from '../common/prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import {
  CreateMarketingMaterialDto,
  UpdateMarketingMaterialDto,
} from './dto/marketing-material.dto';

@Injectable()
export class MarketingMaterialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
    private readonly config: ConfigService,
  ) {}

  list(technicianId: number) {
    return this.prisma.marketingMaterial
      .findMany({
        where: { technicianId },
        orderBy: { updatedAt: 'desc' },
      })
      .then((items) => items.map((item) => this.mapMaterial(item)));
  }

  async create(technicianId: number, dto: CreateMarketingMaterialDto) {
    const material = await this.prisma.marketingMaterial.create({
      data: {
        technicianId,
        type: dto.type,
        title: dto.title.trim(),
        content: JSON.stringify(dto.content),
      },
    });
    return this.mapMaterial(material);
  }

  async update(
    technicianId: number,
    id: number,
    dto: UpdateMarketingMaterialDto,
  ) {
    await this.findOwned(technicianId, id);
    const material = await this.prisma.marketingMaterial.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.content !== undefined
          ? { content: JSON.stringify(dto.content) }
          : {}),
        revision: { increment: 1 },
        status: 'draft',
      },
    });
    return this.mapMaterial(material);
  }

  async preview(technicianId: number, id: number) {
    const material = await this.findOwned(technicianId, id);
    const current =
      await this.subscriptions.getCurrentForTechnician(technicianId);
    const platformMark = !current.plan.features.includes('branding');
    const svg = this.renderSvg(material, platformMark);
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    return {
      material: this.mapMaterial(material),
      imageBase64: png.toString('base64'),
      mimeType: 'image/png',
      platformMark,
      charged: false,
    };
  }

  async export(
    technicianId: number,
    id: number,
    idempotencyKey: string,
    now = new Date(),
  ) {
    const material = await this.findOwned(technicianId, id);
    const current =
      await this.subscriptions.getCurrentForTechnician(technicianId);
    const platformMark = !current.plan.features.includes('branding');
    const svg = this.renderSvg(material, platformMark);
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    const reexportWindowMinutes = this.config.get<number>(
      'MARKETING_FREE_REEXPORT_MINUTES',
      10,
    );
    const maxFreeReexports = this.config.get<number>(
      'MARKETING_MAX_FREE_REEXPORTS',
      2,
    );
    const withinWindow = Boolean(
      material.lastChargedAt &&
      now.getTime() - material.lastChargedAt.getTime() <=
        reexportWindowMinutes * 60_000,
    );
    const freeReexport =
      withinWindow && material.freeReexportCount < maxFreeReexports;

    if (!freeReexport) {
      await this.subscriptions.consumeMonthlyResource(
        technicianId,
        'marketingExports',
        idempotencyKey,
        1,
        { materialId: id, revision: material.revision },
      );
    }

    const updated = await this.prisma.marketingMaterial.update({
      where: { id },
      data: {
        status: 'exported',
        exportCount: { increment: 1 },
        lastExportedAt: now,
        ...(freeReexport
          ? { freeReexportCount: { increment: 1 } }
          : { lastChargedAt: now, freeReexportCount: 0 }),
      },
    });
    return {
      material: this.mapMaterial(updated),
      imageBase64: png.toString('base64'),
      mimeType: 'image/png',
      fileName: `nailart-material-${id}.png`,
      platformMark,
      charged: !freeReexport,
    };
  }

  private async findOwned(technicianId: number, id: number) {
    const material = await this.prisma.marketingMaterial.findFirst({
      where: { id, technicianId },
    });
    if (!material) throw new NotFoundException('宣传物料不存在');
    return material;
  }

  private renderSvg(material: any, platformMark: boolean) {
    const content = this.parseContent(material.content);
    const title = this.escapeXml(material.title);
    const subtitle = this.escapeXml(
      String(content.subtitle || '精致美甲，预约你的专属时刻'),
    );
    const price = content.price ? this.escapeXml(`¥${content.price}`) : '';
    const contact = this.escapeXml(String(content.contact || '欢迎咨询预约'));
    const mark = platformMark
      ? '<text x="540" y="900" text-anchor="middle" fill="#9f8792" font-size="24">由美甲师经营管理平台生成</text>'
      : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff1f6"/><stop offset="1" stop-color="#f3e8ff"/></linearGradient></defs><rect width="1080" height="1080" rx="64" fill="url(#bg)"/><circle cx="540" cy="330" r="190" fill="#fff" opacity=".82"/><path d="M430 350c60-130 160-130 220 0-55 85-165 85-220 0Z" fill="#ec4899" opacity=".82"/><text x="540" y="620" text-anchor="middle" fill="#831843" font-size="64" font-weight="700">${title}</text><text x="540" y="690" text-anchor="middle" fill="#6b5560" font-size="32">${subtitle}</text>${price ? `<text x="540" y="790" text-anchor="middle" fill="#ec4899" font-size="58" font-weight="700">${price}</text>` : ''}<text x="540" y="855" text-anchor="middle" fill="#6b5560" font-size="30">${contact}</text>${mark}</svg>`;
  }

  private parseContent(value: string) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private mapMaterial(material: any) {
    return { ...material, content: this.parseContent(material.content) };
  }

  private escapeXml(value: string) {
    return value.replace(
      /[<>&"']/g,
      (character) =>
        ({
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          '"': '&quot;',
          "'": '&apos;',
        })[character] || character,
    );
  }
}

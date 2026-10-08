import { NotFoundException } from '@nestjs/common';
import { PublicBrandService } from './public-brand.service';

describe('PublicBrandService public DTO snapshots', () => {
  it('品牌主页 DTO 只包含公开资料并保留来源参数', async () => {
    const prisma = {
      technician: {
        findFirst: jest.fn().mockResolvedValue({
          id: 7,
          name: 'Luna',
          avatarUrl: '/uploads/luna-medium.webp',
          city: '上海',
          serviceArea: '静安区',
          homeService: true,
          shopService: true,
          serviceItems:
            '[{"name":"护理","price":99,"durationMinutes":60,"isActive":true}]',
          serviceSchedule:
            '{"activeSchemeId":"regular","schemes":[{"id":"regular","days":["mon"],"startTime":"09:00","endTime":"18:00"}]}',
          brandProfile: {
            brandName: 'Luna Nail',
            tagline: '低饱和手绘美甲',
            city: '上海',
            publicServiceArea: '静安区及周边',
            artistIntroduction: '独立美甲师',
            aestheticPhilosophy: '简洁耐看',
            transportationNotes: '地铁步行可达',
            hygieneStandards: '一客一消毒',
            materialStandards: '正规材料',
            allergyNotice: '请提前说明过敏史',
            latePolicy: '迟到请联系',
            cancellationPolicy: '24小时前取消',
            aftercarePolicy: '7天内联系',
            shareTitle: 'Luna Nail',
            shareDescription: '预约美甲',
            shareCoverUrl: '/uploads/share-medium.webp',
            publicationStatus: 'published',
            environmentPhotos: [
              { imageUrl: '/uploads/room-medium.webp', caption: '工作台' },
            ],
            faqs: [{ question: '需要预约吗？', answer: '需要' }],
          },
          _count: {
            homepageLikes: 3,
            homepageFavorites: 2,
            homepageComments: 1,
          },
          phone: '13800000000',
          shopAddresses: '[{"detailAddress":"内部精确地址"}]',
        }),
      },
    };
    const service = new PublicBrandService(prisma as never);
    const result = await service.profile(7, {
      imageSize: 'thumbnail',
      source: 'wechat',
      campaign: 'summer',
      content: 'card-a',
    });

    expect(result).toMatchInlineSnapshot(`
     {
       "attribution": {
         "campaign": "summer",
         "content": "card-a",
         "source": "wechat",
       },
       "brand": {
         "aestheticPhilosophy": "简洁耐看",
         "avatarUrl": "http://localhost:3000/uploads/luna-thumb.webp",
         "bookingReady": true,
         "certificationTitle": null,
         "city": "上海",
         "environmentPhotos": [
           {
             "caption": "工作台",
             "imageUrl": "http://localhost:3000/uploads/room-thumb.webp",
           },
         ],
         "exclusiveServiceNote": null,
         "experienceYears": null,
         "faqs": [
           {
             "answer": "需要",
             "question": "需要预约吗？",
           },
         ],
         "featuredReviewIds": [],
         "featuredServiceIds": null,
         "featuredShopKey": null,
         "heroImageUrl": "http://localhost:3000/uploads/share-thumb.webp",
         "id": 7,
         "interactionCounts": {
           "comments": 1,
           "favorites": 2,
           "likes": 3,
         },
         "introduction": "独立美甲师",
         "name": "Luna Nail",
         "policies": {
           "aftercare": "7天内联系",
           "cancellation": "24小时前取消",
           "late": "迟到请联系",
         },
         "privacyNote": null,
         "serviceArea": "静安区及周边",
         "serviceModes": {
           "home": true,
           "studio": true,
         },
         "serviceProcess": [],
         "share": {
           "coverUrl": "http://localhost:3000/uploads/share-thumb.webp",
           "description": "预约美甲",
           "title": "Luna Nail",
         },
         "specialties": [],
         "standards": {
           "allergyNotice": "请提前说明过敏史",
           "hygiene": "一客一消毒",
           "materials": "正规材料",
         },
         "tagline": "低饱和手绘美甲",
         "timeline": [],
         "transportationNotes": "地铁步行可达",
       },
     }
    `);
    expect(JSON.stringify(result)).not.toContain('13800000000');
    expect(JSON.stringify(result)).not.toContain('内部精确地址');
  });

  it('整组规则为空时为公开主页提供标准模板', async () => {
    const service = new PublicBrandService({
      technician: {
        findFirst: jest.fn().mockResolvedValue({
          id: 7,
          name: 'Luna',
          homeService: false,
          shopService: true,
          brandProfile: {
            publicationStatus: 'published',
            environmentPhotos: [],
            faqs: [],
          },
          _count: {
            homepageLikes: 0,
            homepageFavorites: 0,
            homepageComments: 0,
          },
        }),
      },
    } as never);

    const result = await service.profile(7, {});

    expect(result.brand.standards?.hygiene).toContain('清洁与消毒');
    expect(result.brand.standards?.materials).toContain('正规渠道');
    expect(result.brand.policies?.cancellation).toContain('提前 24 小时');
    expect(result.brand.policies?.aftercare).toContain('保障期');
  });

  it('已下架品牌统一返回 404', async () => {
    const service = new PublicBrandService({
      technician: { findFirst: jest.fn().mockResolvedValue(null) },
    } as never);
    await expect(service.profile(7, {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('公开服务只返回主页已选择的项目', async () => {
    const prisma = {
      technician: {
        findFirst: jest.fn().mockResolvedValue({ id: 7 }),
        count: jest.fn().mockResolvedValue(1),
      },
      brandProfile: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ featuredServiceIds: '["svc-care"]' }),
      },
      service: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const service = new PublicBrandService(prisma as never);

    await service.services(7, { page: '1', pageSize: '20' });

    expect(prisma.service.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          technicianId: 7,
          publicId: { in: ['svc-care'] },
        }),
      }),
    );
  });

  it('未配置主页服务时默认返回前六项可预约服务', async () => {
    const prisma = {
      technician: {
        findFirst: jest.fn().mockResolvedValue({ id: 7 }),
        count: jest.fn().mockResolvedValue(1),
      },
      brandProfile: {
        findUnique: jest.fn().mockResolvedValue({ featuredServiceIds: null }),
      },
      service: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([{ publicId: 'svc-default' }])
          .mockResolvedValueOnce([]),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    const service = new PublicBrandService(prisma as never);

    await service.services(7, { page: '1', pageSize: '20' });

    expect(prisma.service.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ technicianId: 7, isBookable: true }),
        take: 6,
      }),
    );
    expect(prisma.service.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ publicId: { in: ['svc-default'] } }),
      }),
    );
  });
});

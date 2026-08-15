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
         "experienceYears": null,
         "faqs": [
           {
             "answer": "需要",
             "question": "需要预约吗？",
           },
         ],
         "featuredReviewIds": [],
         "heroImageUrl": "http://localhost:3000/uploads/share-thumb.webp",
         "id": 7,
         "introduction": "独立美甲师",
         "name": "Luna Nail",
         "policies": {
           "aftercare": "7天内联系",
           "cancellation": "24小时前取消",
           "late": "迟到请联系",
         },
         "serviceArea": "静安区及周边",
         "serviceModes": {
           "home": true,
           "studio": true,
         },
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
         "transportationNotes": "地铁步行可达",
       },
     }
    `);
    expect(JSON.stringify(result)).not.toContain('13800000000');
    expect(JSON.stringify(result)).not.toContain('内部精确地址');
  });

  it('已下架品牌统一返回 404', async () => {
    const service = new PublicBrandService({
      technician: { findFirst: jest.fn().mockResolvedValue(null) },
    } as never);
    await expect(service.profile(7, {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

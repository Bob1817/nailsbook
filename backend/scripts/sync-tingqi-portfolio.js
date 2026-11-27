const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const OSS = require('ali-oss');
const sharp = require('sharp');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ossConfig = {
  region: 'oss-cn-hangzhou',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: 'nails-products-lunails',
  secure: true
};

const ossClient = new OSS(ossConfig);

async function uploadImageToOss(filePath) {
  const buf = fs.readFileSync(filePath);
  const meta = await sharp(buf).metadata();
  const swapped = typeof meta.orientation === 'number' && meta.orientation >= 5 && meta.orientation <= 8;
  const width = swapped ? meta.height : meta.width;
  const height = swapped ? meta.width : meta.height;

  const baseName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;

  const [highBuf, medBuf, thumbBuf] = await Promise.all([
    sharp(buf).rotate().resize({ width: 2048, withoutEnlargement: true }).webp({ quality: 84 }).toBuffer(),
    sharp(buf).rotate().resize({ width: 1080, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(),
    sharp(buf).rotate().resize({ width: 480, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer()
  ]);

  const prefix = 'images/';
  const highKey = `${prefix}${baseName}-high.webp`;
  const medKey = `${prefix}${baseName}-medium.webp`;
  const thumbKey = `${prefix}${baseName}-thumb.webp`;

  const [highRes, medRes, thumbRes] = await Promise.all([
    ossClient.put(highKey, highBuf, { mime: 'image/webp', headers: { 'Cache-Control': 'public, max-age=31536000' } }),
    ossClient.put(medKey, medBuf, { mime: 'image/webp', headers: { 'Cache-Control': 'public, max-age=31536000' } }),
    ossClient.put(thumbKey, thumbBuf, { mime: 'image/webp', headers: { 'Cache-Control': 'public, max-age=31536000' } })
  ]);

  return {
    url: medRes.url,
    highUrl: highRes.url,
    mediumUrl: medRes.url,
    thumbnailUrl: thumbRes.url,
    width,
    height
  };
}

const DESKTOP_DIR = '/Users/shibo/Desktop/企业资料/作品集';

const NEW_WORKS_META = [
  {
    folder: '作品1',
    coverFile: '1.jpg',
    validFiles: ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg'],
    title: '暗夜烟岚微瑕墨晕 / 冷冽短甲设计',
    price: 298,
    durationMinutes: 120,
    serviceSortOrder: 3, // 对应 复杂款设计
    style: '暗黑微晕',
    color: '墨黑与烟紫',
    nailShape: '短方圆',
    nailLength: '中短',
    tags: JSON.stringify(['暗黑风', '水墨晕染', '短甲显白', '酷感中性', '建构处理']),
    designIdea: '多层水墨层次微晕染技法，呈现暗夜烟雾与玉质光泽的交融。克制清冷，适合不喜过分张扬但注重细节质感的酷女孩与中性风格。',
    suitableScene: '日常通勤、暗黑出街、音乐节、派对活动',
    outfitSuggestion: '极简黑白、微暗黑工装、冷色系针织衫、纯银饰品。',
    craftHighlights: '多层水墨透氧微晕染，前置极致修形建构，甲面流平饱满'
  },
  {
    folder: '作品2',
    coverFile: '微信图片_20261115162334_128_9.jpg',
    validFiles: [
      '微信图片_20261115162334_128_9.jpg',
      '微信图片_20261115162335_129_9.jpg',
      '微信图片_20261115162336_130_9.jpg',
      '微信图片_20261115162338_131_9.jpg'
    ],
    title: '极光流金微波流线 / 轻奢尖圆延长甲',
    price: 298,
    durationMinutes: 150,
    serviceSortOrder: 3, // 对应 复杂款设计
    style: '轻奢法式',
    color: '冰茶裸透与香槟金',
    nailShape: '杏仁尖圆型',
    nailLength: '长款延长',
    tags: JSON.stringify(['尖圆延长', '流光金线', '微雕波纹', '轻奢老钱风', '修长显手细']),
    designIdea: '如流动的液态光泽掠过指尖，精准勾勒的微雕弧线打破单调，在光影流转中带来拉长手部线条的视觉张力。',
    suitableScene: '高级宴会、名媛聚会、精致度假、日常高级感',
    outfitSuggestion: '真丝缎面衬衫、轻奢礼服裙、高智感老钱风羊绒套装。',
    craftHighlights: '定制游离流线微雕，液态浅金立体勾线，极致杏仁甲型雕塑'
  },
  {
    folder: '作品3',
    coverFile: '微信图片_20261115162217_123_9.jpg',
    validFiles: [
      '微信图片_20261115162217_123_9.jpg',
      '微信图片_20261115162219_124_9.jpg',
      '微信图片_20261115162221_125_9.jpg',
      '微信图片_20261115162223_126_9.jpg',
      '微信图片_20261115162225_127_9.jpg'
    ],
    title: '薄荷银辉双色微法式 / 灵动星芒碎钻',
    price: 298,
    durationMinutes: 130,
    serviceSortOrder: 3, // 对应 复杂款设计
    style: '清透法式',
    color: '薄荷冰绿与星芒银',
    nailShape: '尖圆椭圆型',
    nailLength: '中长款',
    tags: JSON.stringify(['双色法式', '薄荷绿', '碎钻星芒', '灵动减龄', '冰透果冻']),
    designIdea: '打破常规白法式的拘谨，采用清透薄荷绿与微细银辉双层拉线，点缀细碎极光亮片，透氧又灵动。',
    suitableScene: '春夏季节、约会出游、闺蜜聚会、日常通勤',
    outfitSuggestion: '羊绒针织衫、淡色系西装、马卡龙系清新休闲风。',
    craftHighlights: '精细游离微边双色拉线，手工点缀极光亮片，多层透氧加固'
  },
  {
    folder: '作品4',
    coverFile: '微信图片_20261115162048_119_9.jpg',
    validFiles: [
      '微信图片_20261115162048_119_9.jpg',
      '微信图片_20261115162050_120_9.jpg',
      '微信图片_20261115162051_121_9.jpg',
      '微信图片_20261115162052_122_9.jpg'
    ],
    title: '哑光极简银珠微铆 / 锐利先锋 stiletto',
    price: 298,
    durationMinutes: 120,
    serviceSortOrder: 3, // 对应 复杂款设计
    style: '先锋几何',
    color: '雾面裸粉与冷光银',
    nailShape: 'Stiletto尖甲',
    nailLength: '长款',
    tags: JSON.stringify(['锋芒尖甲', '哑光磨砂', '金属钢珠', '极简高级', '先锋独立']),
    designIdea: '少即是多（Less is more）。干净通透的雾面打底与坚硬冷冽的金属小钢珠碰撞，将锋芒感与高级感收敛于毫厘之间。',
    suitableScene: '艺术展看展、先锋派对、时装周、个性出街',
    outfitSuggestion: '结构感廓形大衣、黑色西装、先锋独立设计师品牌。',
    craftHighlights: '微米级对准金属小钢珠固定，柔焦天鹅绒磨砂质感封层'
  },
  {
    folder: '作品5',
    coverFile: '微信图片_20261115161912_111_9.jpg',
    validFiles: [
      '微信图片_20261115161912_111_9.jpg',
      '微信图片_20261115161913_112_9.jpg',
      '微信图片_20261115161915_113_9.jpg',
      '微信图片_20261115161916_114_9.jpg',
      '微信图片_20261115161917_115_9.jpg',
      '微信图片_20261115161919_116_9.jpg',
      '微信图片_20261115161920_117_9.jpg'
    ],
    title: '巴洛克哥特暗黑高定 / 复古报纸手绘与重工十字',
    price: 428,
    durationMinutes: 180,
    serviceSortOrder: 4, // 对应 极复杂款式
    style: '哥特巴洛克',
    color: '深浓咖、古铜与璀璨钻光',
    nailShape: '长梯形+尖型',
    nailLength: '特长款',
    tags: JSON.stringify(['重工高定', '施华洛世奇钻', '复古报纸手绘', '哥特巴洛克', '暗夜女王']),
    designIdea: '暗夜华丽与复古废土美学的极致呈现。手工精绘复古报纸质感，结合立体金属十字与施华洛世奇水晶群镶，气场拉满的孤品高定。',
    suitableScene: '舞台表演、大片拍摄、重磅晚宴、个性收藏',
    outfitSuggestion: '重工机车皮衣、暗黑歌德长裙、暗调复古混搭。',
    craftHighlights: '微型复古英文报纸纯手绘、施华洛世奇异形钻密镶、仿鳄鱼皮质感肌理'
  },
  {
    folder: '作品6',
    coverFile: '微信图片_20261115161800_106_9.jpg',
    validFiles: [
      '微信图片_20261115161800_106_9.jpg',
      '微信图片_20261115161801_107_9.jpg',
      '微信图片_20261115161803_108_9.jpg',
      '微信图片_20261115161804_109_9.jpg',
      '微信图片_20261115161806_110_9.jpg'
    ],
    title: '烟岚流银水墨大理石 / 冰透灰阶水韵款',
    price: 298,
    durationMinutes: 130,
    serviceSortOrder: 3, // 对应 复杂款设计
    style: '新中式水墨',
    color: '烟岚灰白与碎银细丝',
    nailShape: '尖圆杏仁型',
    nailLength: '中长款',
    tags: JSON.stringify(['水墨大理石', '新中式', '流银细丝', '国风美学', '气质显白']),
    designIdea: '中国美院纯正水墨美学转化。将宣纸上水汽晕散的偶然性转化为指尖的诗意，细微银丝流淌如月下溪流，温润而有风骨。',
    suitableScene: '茶道雅集、中式艺术展、高级职场、知性聚会',
    outfitSuggestion: '新中式棉麻、素色羊绒大衣、东方禅意风格。',
    craftHighlights: '宣纸质感水汽微晕染、手工嵌入细银丝、流平加固建构'
  },
  {
    folder: '作品7',
    coverFile: '微信图片_20261115161652_102_9.jpg',
    validFiles: [
      '微信图片_20261115161652_102_9.jpg',
      '微信图片_20261115161653_103_9.jpg',
      '微信图片_20261115161655_104_9.jpg',
      '微信图片_20261115161656_105_9.jpg'
    ],
    title: '月影幻彩贝母冰透晕染 / 仙气质感天然贝片',
    price: 298,
    durationMinutes: 120,
    serviceSortOrder: 3, // 对应 复杂款设计
    style: '温润仙气',
    color: '冰茶裸透与幻彩月影',
    nailShape: '尖圆型',
    nailLength: '中长款',
    tags: JSON.stringify(['天然贝母', '冰透晕染', '月光极光', '仙气温柔', '百搭显白']),
    designIdea: '选用高品质天然贝母薄片手工拼接，折射出温润如珍珠般的流动虹光，极致显白，宛若指尖自带柔光滤镜。',
    suitableScene: '新娘订婚、约会日常、早春踏青、高级通勤',
    outfitSuggestion: '奶油白粗花呢、浅色系风衣、温婉通勤与约会穿搭。',
    craftHighlights: '天然超薄贝母精准拼贴、月影极光漫射微晕、水晶封层平整包边'
  }
];

const EXISTING_WORKS_CORRECTIONS = [
  {
    id: 8,
    title: '复古琥珀日式暖咖晕染 / 手绘小花与金箔点缀',
    price: 298,
    serviceSortOrder: 3,
    style: '日杂复古',
    color: '暖咖琥珀',
    nailShape: '椭圆短甲',
    nailLength: '短款',
    tags: JSON.stringify(['日式复古', '琥珀晕染', '手绘小花', '温暖治愈', '秋冬显白']),
    designIdea: '复古暖调琥珀与黄油奶油底色的温润交融，点缀手绘雏菊小花与轻微金箔，温暖又治愈。',
    suitableScene: '日常出街、咖啡馆打卡、秋冬通勤',
    outfitSuggestion: '复古毛衣、棕色风衣、大地色系穿搭。'
  },
  {
    id: 10,
    title: '琉璃繁花水晶延长甲 / 仙气真干花与璀璨异形钻高定',
    price: 428,
    serviceSortOrder: 4,
    style: '仙气高定',
    color: '透光琉璃粉',
    nailShape: '尖长款',
    nailLength: '长款延长',
    tags: JSON.stringify(['琉璃繁花', '真干花封层', '异形堆钻', '新娘美甲', '高定婚甲']),
    designIdea: '剔透琉璃水晶尖长甲，封层内嵌真实压花繁花，指根堆叠璀璨异形水晶钻，华美仙气。',
    suitableScene: '婚礼新娘、订婚宴、盛大晚宴、写真大片',
    outfitSuggestion: '轻纱婚纱、礼服长裙、白色系名媛穿搭。'
  },
  {
    id: 12,
    title: '冰川晶石立体凝胶微雕 / 幻彩极光尖长延长甲',
    price: 388,
    serviceSortOrder: 4,
    style: '前卫立体',
    color: '透光晶石白',
    nailShape: 'Stiletto尖甲',
    nailLength: '长款延长',
    tags: JSON.stringify(['冰川晶石', '立体微雕', '极光水滴', '清冷仙气', '延长高定']),
    designIdea: '全透冰川立体凝胶水滴微雕，结合幻彩细闪与润泽珍珠，如同凝固的极光冰凌。',
    suitableScene: '艺术活动、聚会焦点、高级看展',
    outfitSuggestion: '黑色吊带礼服、纯银立体耳饰、前卫极简设计感服饰。'
  },
  {
    id: 14,
    title: '极简冰茶裸透长甲 / 单指轻奢钻戒圈设计',
    price: 298,
    serviceSortOrder: 3,
    style: '轻奢简约',
    color: '冰茶果冻色',
    nailShape: '尖圆型',
    nailLength: '长款',
    tags: JSON.stringify(['极简奢华', '单指排钻', '冰茶果冻', '修长指尖', '老钱风']),
    designIdea: '极致通透的冰茶果冻底色尖长甲，仅在单指环绕一圈高光微钻戒圈，克制而奢华。',
    suitableScene: '名媛约会、高端职场、品质日常',
    outfitSuggestion: '皮草外套、黑色大衣、真丝衬衫。'
  },
  {
    id: 18,
    title: '暗黑未来主义微雕 / 赛博图腾与手绘之眼高定',
    price: 428,
    serviceSortOrder: 4,
    style: '暗黑先锋',
    color: '黑白与金属银',
    nailShape: 'Stiletto尖甲',
    nailLength: '长款',
    tags: JSON.stringify(['暗黑赛博', '图腾手绘', '未来主义', '超现实之眼', '个性孤品']),
    designIdea: '立体金属流线、手绘超现实主义之眼与赛博图腾微雕，诠释先锋前卫的艺术表达。',
    suitableScene: '时装周、独立摇滚演出、先锋艺术展',
    outfitSuggestion: '机车皮衣、解构主义暗黑风穿搭、金属配饰。'
  }
];

async function main() {
  console.log('=== Step 1: Uploading images to OSS for 7 works ===');
  const uploadedWorks = [];

  for (let i = 0; i < NEW_WORKS_META.length; i++) {
    const meta = NEW_WORKS_META[i];
    const folderPath = path.join(DESKTOP_DIR, meta.folder);
    console.log(`Processing work #${i + 1}: ${meta.title} (${meta.folder})...`);

    let coverUrl = null;
    let coverWidth = null;
    let coverHeight = null;
    const imageUrls = [];

    for (const f of meta.validFiles) {
      const fp = path.join(folderPath, f);
      console.log(`  Uploading ${f}...`);
      const res = await uploadImageToOss(fp);
      imageUrls.push(res.url);

      if (f === meta.coverFile || !coverUrl) {
        coverUrl = res.url;
        coverWidth = res.width;
        coverHeight = res.height;
      }
    }

    uploadedWorks.push({
      ...meta,
      coverUrl,
      coverWidth,
      coverHeight,
      images: JSON.stringify(imageUrls)
    });
  }

  console.log('=== Step 1 Completed: All images uploaded to OSS! ===');

  // Save the metadata with uploaded URLs to a JSON file for deployment
  const outputPath = path.join(__dirname, 'uploaded_portfolio_data.json');
  fs.writeFileSync(outputPath, JSON.stringify({ uploadedWorks, existingCorrections: EXISTING_WORKS_CORRECTIONS }, null, 2));
  console.log('Saved upload metadata to:', outputPath);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

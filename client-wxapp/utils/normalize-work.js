/**
 * normalizeWork(raw, technician, options)
 *
 * 统一作品卡（work-card 组件 / 作品详情页 / 各列表页）与美甲师主页顶部美甲师信息的口径。
 * 同时输出"嵌套 technician 对象"（作品详情页用）与"扁平 technician*"字段（work-card editorial/grid 通用），
 * 以及 compactExpertise 依赖的 experienceYears / specialtiesText / specialty / expertiseText / specialties 五件套。
 *
 * @param {Object} raw           原始 work 对象（从 API 返回）
 * @param {Object} technician    美甲师信息快照，必须包含 id/name/avatarUrl，可选 city/experienceYears/specialtiesText/specialties/styleTags
 * @param {Object} [options]
 * @param {number} [options.index=0]        当前作品在列表中的位置，用于兜底 styleText/duration
 * @param {Array<string>} [options.styleTags=[]] 美甲师擅长风格标签，用于当作品无 tags 时兜底 gallery styleText
 * @param {boolean} [options.isBound=false] 该美甲师是否是当前用户绑定的美甲师（作品卡显示"我的美甲师"徽标）
 * @returns {Object} 标准化 work 对象
 */
function normalizeWork(raw, technician, options) {
  raw = raw || {};
  options = options || {};
  const index = Number(options.index || 0);
  const styleTags = Array.isArray(options.styleTags) ? options.styleTags : [];
  const isBound = !!options.isBound;

  // ===== 1. 合并 technician 信息 =====
  // 优先级规则（严格，不 OR 混合，防止旧快照数据污染）：
  //   当显式传入 technician 参数 → 它是唯一真理源，每个字段都用 `!= null` 判断（0 也算有效值），不 fallback 到 raw
  //   当未传入 technician → 用 raw.technician 对象，再 fallback 到 raw 的扁平字段
  const hasTechParam = !!technician;
  const rawTech = technician || raw.technician || {};

  function pickTech(field, flatField) {
    // technician 传入时：严格从 technician 取值（0 也有效），只有 undefined/null 才看 raw
    if (hasTechParam && technician[field] != null) return technician[field];
    if (rawTech[field] != null) return rawTech[field];
    flatField = flatField || field;
    return raw[flatField] != null ? raw[flatField] : undefined;
  }

  const fallbackId = String(pickTech('id', 'technicianId') || pickTech('technicianId') || '');
  const fallbackName = pickTech('name', 'technicianName') || '';
  const fallbackAvatar = pickTech('avatarUrl', 'technicianAvatarUrl') || '';
  const fallbackCity = pickTech('city', 'technicianCity') || '';
  const fallbackExperience = Number(pickTech('experienceYears') || 0) || 0;
  const rawStyleTags = pickTech('styleTags') || pickTech('specialties');
  const fallbackStyleTags = Array.isArray(rawStyleTags)
    ? rawStyleTags
    : Array.isArray(raw.specialties) ? raw.specialties : [];
  const fallbackSpecialtiesText = pickTech('specialtiesText')
    || (fallbackStyleTags.length ? fallbackStyleTags.join(' · ') : '')
    || raw.specialtiesText
    || '';

  const cityText = fallbackCity || '';
  const experienceNum = Math.max(1, fallbackExperience);
  const experienceText = '从业' + experienceNum + '年';
  const specialtiesPart = fallbackSpecialtiesText || '';
  const artistMetaParts = [cityText, experienceText, specialtiesPart].filter(Boolean);
  const artistMetaText = artistMetaParts.join(' · ');

  const mergedTech = {
    id: fallbackId,
    technicianId: fallbackId,
    name: fallbackName || '美甲师',
    avatarUrl: fallbackAvatar,
    city: fallbackCity,
    cityText: cityText,
    experienceYears: fallbackExperience,
    experienceText: experienceText,
    specialtiesText: fallbackSpecialtiesText,
    specialties: fallbackStyleTags,
    expertiseText: (fallbackExperience ? fallbackExperience + '年' : '1年') + ' · ' + (fallbackSpecialtiesText || '-'),
    specialty: fallbackSpecialtiesText || (fallbackStyleTags[0] || ''),
    artistMetaText: artistMetaText
  };

  // ===== 2. 作品自身标准字段 =====
  const coverUrl = raw.coverUrl || (raw.imageUrls && raw.imageUrls[0]) || '';
  const imageUrls = raw.imageUrls && raw.imageUrls.length ? raw.imageUrls : (coverUrl ? [coverUrl] : []);
  const tags = Array.isArray(raw.tags) ? raw.tags : [];
  const firstTag = tags[0] || (styleTags[index % (styleTags.length || 1)]) || '';
  const duration = raw.duration || [60, 75, 90, 120][index % 4];
  const priceFen = Number(raw.standardPriceFen || raw.serviceSubtotalFen || raw.priceCents || 0);
  const normalizedPrice = priceFen > 0 ? priceFen / 100 : Number(raw.price || 0);

  return {
    id: raw.id,
    title: raw.title || '美甲作品',
    coverUrl: coverUrl,
    imageUrls: imageUrls,
    tags: tags,
    tagsText: tags.join(' · '),
    styleText: firstTag || '美甲设计',
    duration: duration,
    dateStr: raw.dateStr || raw.createdAt || '',
    price: normalizedPrice,
    priceText: raw.priceText || (normalizedPrice > 0 ? '¥' + normalizedPrice : ''),
    serviceSubtotalFen: Number(raw.serviceSubtotalFen || 0),
    standardPriceFen: raw.standardPriceFen == null ? null : Number(raw.standardPriceFen),
    totalDurationMinutes: Number(raw.totalDurationMinutes || 0),
    likeCount: Number(raw.likeCount || 0),
    favoriteCount: Number(raw.favoriteCount || 0),
    commentCount: Number(raw.commentCount || 0),
    isLiked: !!raw.isLiked,
    isFavorited: !!raw.isFavorited,
    description: raw.description || '',

    // —— 美甲师信息：嵌套对象（public-work 作品详情页用）——
    technician: {
      id: mergedTech.id,
      name: mergedTech.name,
      avatarUrl: mergedTech.avatarUrl,
      city: mergedTech.city,
      cityText: mergedTech.cityText,
      experienceYears: mergedTech.experienceYears,
      experienceText: mergedTech.experienceText,
      specialtiesText: mergedTech.specialtiesText,
      artistMetaText: mergedTech.artistMetaText
    },

    // —— 美甲师信息：扁平字段（work-card 通用组件用）——
    technicianId: mergedTech.id,
    technicianName: mergedTech.name,
    technicianAvatarUrl: mergedTech.avatarUrl,
    technicianCity: mergedTech.cityText,
    techInitial: (mergedTech.name || '美').charAt(0),
    experienceYears: mergedTech.experienceYears,
    experienceText: mergedTech.experienceText,
    specialtiesText: mergedTech.specialtiesText,
    specialties: mergedTech.specialties,
    specialty: mergedTech.specialty,
    expertiseText: mergedTech.expertiseText,
    artistMetaText: mergedTech.artistMetaText,

    // —— 徽标：我的美甲师（显示在 grid 模式作品卡右上角）——
    isMyTechnician: isBound
  };
}

function normalizeSourceWorkSummary(raw) {
  if (!raw) return null;
  const priceFen = Number(raw.standardPriceFen || raw.serviceSubtotalFen || raw.priceCents || 0)
    || Math.round(Number(raw.price || 0) * 100);
  return { ...raw, _priceFen: priceFen };
}

function normalizeWorkDetail(raw) {
  raw = raw || {};
  const serviceSubtotalFen = Number(raw.serviceSubtotalFen || 0);
  const standardPriceFen = Number(raw.standardPriceFen || 0)
    || Math.round(Number(raw.price || 0) * 100);
  const differenceFen = standardPriceFen > 0 ? standardPriceFen - serviceSubtotalFen : 0;
  return {
    ...raw,
    serviceSubtotalFen,
    standardPriceFen: standardPriceFen || null,
    _priceFen: standardPriceFen || serviceSubtotalFen,
    _priceText: standardPriceFen > 0
      ? '¥' + formatFen(standardPriceFen)
      : (serviceSubtotalFen > 0 ? '¥' + formatFen(serviceSubtotalFen) : ''),
    _priceDiffType: differenceFen < 0 ? 'discount' : (differenceFen > 0 ? 'surcharge' : ''),
    _priceDiffFen: Math.abs(differenceFen)
  };
}

function formatFen(value) {
  const yuan = Number(value || 0) / 100;
  return Number.isInteger(yuan) ? String(yuan) : yuan.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

module.exports = { normalizeWork, normalizeSourceWorkSummary, normalizeWorkDetail };

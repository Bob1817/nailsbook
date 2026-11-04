function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function clamp(value, maxLength) {
  const text = clean(value);
  return text.length > maxLength ? text.slice(0, maxLength - 1) + '…' : text;
}

function buildArtistShareTitle(artist, customTitle) {
  const source = artist || {};
  const name = clean(source.name) || '美甲师';
  const custom = clean(customTitle);
  if (custom && custom !== name && custom !== name + '的主页' && custom.length >= name.length + 3) {
    return clamp(custom, 28);
  }

  const specialties = clean(source.specialtiesText) || (Array.isArray(source.styleTags)
    ? source.styleTags.map(clean).filter(Boolean).slice(0, 2).join('·')
    : '');
  const descriptor = specialties
    ? (specialties.includes('美甲') ? specialties : specialties + '美甲')
    : '一对一私人美甲';
  return clamp(name + '｜' + descriptor + '·作品与预约', 28);
}

function buildWorkShareTitle(work, artist) {
  const source = work || {};
  const technician = artist || source.technician || {};
  const workTitle = clean(source.title) || '美甲灵感';
  const artistName = clean(source.technicianName || technician.name);
  const suffix = artistName ? artistName + '美甲·预约同款' : '查看作品·预约同款';
  return clamp(workTitle + '｜' + suffix, 28);
}

function buildWorkXhsCopy(work, artist) {
  const source = work || {};
  const technician = artist || source.technician || {};
  const workTitle = clean(source.title) || '今日美甲灵感';
  const artistName = clean(source.technicianName || technician.name) || '美甲师';
  let rawTags = [];
  if (Array.isArray(source.tags)) {
    rawTags = source.tags;
  } else if (typeof source.tags === 'string') {
    try { rawTags = JSON.parse(source.tags); } catch (_) { rawTags = []; }
  }
  const tagList = rawTags.length
    ? rawTags.map(t => '#' + clean(t).replace(/^#/, ''))
    : ['#美甲', '#美甲灵感', '#显白美甲', '#高级感美甲', '#日常美甲'];
  const tagStr = tagList.join(' ');
  const desc = source.description ? `\n\n${clean(source.description)}` : '';
  const priceText = source.priceFen ? `\n💰 参考报价：¥${(source.priceFen / 100).toFixed(0)}` : '';
  return `✨ ${workTitle} | ${artistName}${desc}${priceText}\n\n🏷️ 灵感标签：\n${tagStr}\n\n💅 喜欢同款或想定制同款的小姐姐，微信搜索同名小程序即可在线查看作品并预约同款~ 欢迎保存原图！`;
}

module.exports = { buildArtistShareTitle, buildWorkShareTitle, buildWorkXhsCopy };


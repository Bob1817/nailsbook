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

module.exports = { buildArtistShareTitle, buildWorkShareTitle };

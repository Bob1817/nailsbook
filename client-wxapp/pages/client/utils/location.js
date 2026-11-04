// 微信内置地图使用 GCJ-02；选点与查看位置复用同一坐标校验。
function coordinates(place) {
  if (!place || place.latitude == null || place.longitude == null || place.latitude === '' || place.longitude === '') return null;
  const latitude = Number(place.latitude), longitude = Number(place.longitude);
  return Number.isFinite(latitude) && Math.abs(latitude) <= 90 && Number.isFinite(longitude) && Math.abs(longitude) <= 180 && (latitude !== 0 || longitude !== 0)
    ? { latitude, longitude } : null;
}
function selectLocation(place, onSelect, complete) {
  wx.chooseLocation({ ...(coordinates(place) || {}),
    success:result => {
      const point = coordinates(result);
      if (point) onSelect({ ...result, ...point });
      else wx.showToast({ title:'未获取到有效位置，请重新选点', icon:'none' });
    },
    fail:error => {
      const message = String(error.errMsg || '');
      if (/cancel/i.test(message)) return;
      if (/auth deny|authorize|permission denied/i.test(message)) {
        wx.showModal({ title:'需要位置权限', content:'请在设置中允许使用位置，再返回地图选择地址。', confirmText:'去设置', success:res => { if (res.confirm) wx.openSetting({}); } });
      } else wx.showToast({ title:'地图暂时无法打开，请稍后重试', icon:'none' });
    }, complete
  });
}
function openLocation(place) {
  const point = coordinates(place);
  const copy = () => {
    if (place && place.address) wx.setClipboardData({ data:place.address, success:() => wx.showToast({ title:'地址已复制，可粘贴到地图搜索', icon:'none' }) });
    else wx.showToast({ title:'暂无有效地址，请联系美甲师确认', icon:'none' });
  };
  if (!point) {
    if (!place || !place.address) return copy();
    return wx.showModal({ title:'该地址尚未标注地图位置', content:place.address, confirmText:'复制地址', success:res => { if (res.confirm) copy(); } });
  }
  wx.openLocation({ ...point, name:place.name || '服务地点', address:place.address || '', scale:18,
    fail:error => { if (!/cancel/i.test(String(error.errMsg || ''))) wx.showModal({ title:'地图打开失败', content:'可以复制地址后在地图中搜索。', confirmText:'复制地址', success:res => { if (res.confirm) copy(); } }); }
  });
}
function matchingShop(shops, address) {
  const target = String(address || '').replace(/\s+/g, '');
  if (!target) return null;
  const matches = (shops || []).filter(shop => {
    if (shop.enabled === false) return false;
    const detail = String(shop.detailAddress || shop.address || '').replace(/\s+/g, '');
    const full = [shop.province, shop.city, shop.district, detail, shop.doorInfo].filter(Boolean).join('').replace(/\s+/g, '');
    return detail && (target === detail || target === full);
  });
  return matches.length === 1 ? matches[0] : null;
}
function detailForRegion(address, region) {
  let detail = String(address || '').trim();
  (region || []).filter(Boolean).forEach(part => { if (detail.startsWith(part)) detail = detail.slice(part.length).trim(); });
  return detail;
}
module.exports = { coordinates, selectLocation, openLocation, matchingShop, detailForRegion };

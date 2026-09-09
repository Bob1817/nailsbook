function normalizeCity(value) {
  return String(value || '').trim().replace(/(特别行政区|自治州|地区|盟|市)$/u, '');
}

function distanceKm(a, b) {
  const rad = value => Number(value) * Math.PI / 180;
  const lat1 = rad(a.latitude); const lat2 = rad(b.latitude);
  const dLat = lat2 - lat1; const dLng = rad(b.longitude) - rad(a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function cityFromLocation(location) {
  if (location && location.city) return String(location.city).trim();
  const text = String((location && (location.address || location.name)) || '');
  const match = text.match(/([^省自治区特别行政区]{2,12}(?:市|自治州|地区|盟))/u);
  return match ? match[1] : '';
}

function evaluateBookingCity(location, technician) {
  const serviceCity = String((technician && technician.city) || '').trim();
  const currentCity = cityFromLocation(location);
  if (currentCity && serviceCity) {
    return { currentCity, serviceCity, mismatch: normalizeCity(currentCity) !== normalizeCity(serviceCity), distance: 0, inferred: false };
  }
  const shops = ((technician && technician.shopAddresses) || []).filter(shop =>
    shop && shop.enabled !== false && Number.isFinite(Number(shop.latitude)) && Number.isFinite(Number(shop.longitude))
  );
  if (location && shops.length) {
    const distance = Math.min(...shops.map(shop => distanceKm(location, shop)));
    return { currentCity: '', serviceCity, mismatch: distance >= 80, distance: Math.round(distance), inferred: true };
  }
  return { currentCity, serviceCity, mismatch: false, distance: 0, inferred: true };
}

module.exports = { normalizeCity, cityFromLocation, evaluateBookingCity };

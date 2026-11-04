function homeSettings(raw) {
  if (typeof raw === 'string') { try { return JSON.parse(raw) || {}; } catch (_) { return {}; } }
  return raw || {};
}
function formIssues(user, type) {
  if (type === 'shop') return (user.shopAddresses || []).some(s => s.enabled !== false && String(s.name || '').trim() && String(s.detailAddress || s.address || '').trim()) ? [] : ['请完善至少一家启用店铺的名称和详细地址'];
  const c = homeSettings(user.homeServiceSettings);
  const issues = [];
  if (!c.province || !c.city || c.province === '全部' || c.city === '全部') issues.push('请选择上门服务区域');
  if (!c.origin || !Number.isFinite(c.origin.latitude) || !Number.isFinite(c.origin.longitude) || !c.origin.address) issues.push('请在地图选择出发地点');
  if (!Array.isArray(c.tiers) || !c.tiers.length || c.tiers.length > 10 || c.tiers.some((t, i) => !Number.isFinite(t.maxKm) || t.maxKm <= (i ? c.tiers[i-1].maxKm : 0) || t.maxKm > 200 || !Number.isSafeInteger(t.feeFen) || t.feeFen < 0 || t.feeFen > 10000000)) issues.push('请按距离递增填写收费档位，费用可为 0 元');
  if (!c.days || !c.days.length || !/^([01]\d|2[0-3]):[0-5]\d$/.test(c.startTime || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(c.endTime || '') || c.startTime >= c.endTime) issues.push('请选择上门服务日和有效时间');
  return issues;
}
module.exports = { homeSettings, formIssues };

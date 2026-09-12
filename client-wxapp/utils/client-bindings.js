function normalizeBindings(bindings) {
  return bindings.map(b => {
    const technician = b.technician || b;
    const defaultShop = (technician.shopAddresses || []).find(shop => shop.enabled !== false);
    const status = technician.status || 'active';
    return {
      id: technician.id, name: technician.name || '美甲师', phone: technician.phone || '',
      avatar: technician.avatarUrl || technician.avatar || '', city: technician.city || '',
      status,
      statusLabel: status === 'active' ? '接单中' : status === 'inactive' ? '休息中' : '暂停服务',
      statusTone: status === 'active' ? 'active' : 'inactive',
      canBook: status === 'active', shopService: !!technician.shopService,
      shopName: defaultShop?.name || technician.shopName || '', isDefault: !!b.isDefault,
      bindingStatus: b.bindingStatus || (b.status === 'pending' ? 'pending' : 'active'),
      boundAt: b.boundAt || b.createdAt || ''
    };
  });
}

function bindingSummary(technicians) {
  const sorted = technicians.slice().sort((a,b) => Number(b.isDefault) - Number(a.isDefault) || String(b.boundAt || '').localeCompare(String(a.boundAt || '')) || Number(b.id) - Number(a.id));
  const active = sorted.filter(item => item.bindingStatus === 'active');
  const pendingCount = sorted.filter(item => item.bindingStatus === 'pending').length;
  const hiddenActiveCount = Math.max(active.length - 2, 0);
  const previewSummary = [
    hiddenActiveCount ? `还有 ${hiddenActiveCount} 位已绑定` : '',
    pendingCount ? `${pendingCount} 位待确认` : ''
  ].filter(Boolean).join(' · ');
  return { technicians: sorted, previewTechnicians: active.slice(0,2), activeCount: active.length, pendingCount, hiddenActiveCount, previewSummary };
}

module.exports = { normalizeBindings, bindingSummary };

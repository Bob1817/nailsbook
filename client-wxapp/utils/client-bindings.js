function normalizeBindings(bindings) {
  return bindings.map(b => {
    const technician = b.technician || b;
    const defaultShop = (technician.shopAddresses || []).find(shop => shop.enabled !== false);
    return {
      id: technician.id, name: technician.name || '美甲师', phone: technician.phone || '',
      avatar: technician.avatarUrl || technician.avatar || '', city: technician.city || '',
      status: technician.status || 'active', shopService: !!technician.shopService,
      shopName: defaultShop?.name || technician.shopName || '', isDefault: !!b.isDefault,
      bindingStatus: b.bindingStatus || (b.status === 'pending' ? 'pending' : 'active'),
      boundAt: b.boundAt || b.createdAt || ''
    };
  });
}

function bindingSummary(technicians) {
  const sorted = technicians.slice().sort((a,b) => Number(b.isDefault) - Number(a.isDefault) || String(b.boundAt || '').localeCompare(String(a.boundAt || '')) || Number(b.id) - Number(a.id));
  const active = sorted.filter(item => item.bindingStatus === 'active');
  return { technicians: sorted, previewTechnicians: active.slice(0,2), activeCount: active.length, pendingCount: sorted.filter(item => item.bindingStatus === 'pending').length };
}

module.exports = { normalizeBindings, bindingSummary };

function normalizeBindings(bindings) {
  return bindings.map(b => {
    const technician = b.technician || b;
    const defaultShop = (technician.shopAddresses || []).find(shop => shop.enabled !== false);
    const status = technician.status || 'active';
    const relationship = technician.relationship || {};
    const completedVisits = Number(relationship.completedVisits || 0);
    const savedAmountFen = Number(relationship.savedAmountFen || 0);
    const membership = relationship.membership || null;
    const points = relationship.points;
    const benefits = Array.isArray(relationship.benefits) ? relationship.benefits.filter(Boolean) : [];
    return {
      id: technician.id, name: technician.name || '美甲师', phone: technician.phone || '',
      avatar: technician.avatarUrl || technician.avatar || '', city: technician.city || '',
      status,
      statusLabel: status === 'active' ? '接单中' : status === 'inactive' ? '休息中' : '暂停服务',
      statusTone: status === 'active' ? 'active' : 'inactive',
      canBook: status === 'active', shopService: !!technician.shopService,
      relationship: {
        completedVisits,
        savedAmountFen,
        savedAmountText: `¥${(savedAmountFen / 100).toFixed(2)}`,
        membership,
        points,
        summary: [membership && membership.name, `${completedVisits} 次消费`, points != null ? `${points} 积分` : ''].filter(Boolean).join(' · '),
        benefitSummary: benefits.length ? benefits.join(' · ') : '该美甲师暂未设置会员权益'
      },
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

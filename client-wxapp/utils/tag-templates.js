function unwrapTagTemplates(result) {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.list)) return result.list;
  if (result && Array.isArray(result.data)) return result.data;
  return [];
}

function filterTagTemplates(result, type) {
  const targetType = type === 'work' ? 'work' : 'customer';
  return unwrapTagTemplates(result).filter((item) => {
    if (!item || !item.name) return false;
    const itemType = item.type === 'work' ? 'work' : 'customer';
    return itemType === targetType;
  });
}

module.exports = { filterTagTemplates };

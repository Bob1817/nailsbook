function summarizeServices(serviceItems, selectedServiceIds) {
  var selected = Array.isArray(selectedServiceIds) ? selectedServiceIds : [];
  var items = (Array.isArray(serviceItems) ? serviceItems : []).filter(function (item) {
    return selected.indexOf(item.id) >= 0;
  });
  return {
    count: items.length,
    totalPrice: items.reduce(function (sum, item) { return sum + Math.round(Number(item.price || 0) * 100); }, 0) / 100,
    totalDurationMinutes: items.reduce(function (sum, item) { return sum + Number(item.durationMinutes || 0); }, 0)
  };
}

module.exports = { summarizeServices: summarizeServices };

function bookingUrl(options) {
  const params = ['mode=full', 'content=custom'];
  ['techId', 'tech_id', 'invite', 'source'].forEach(key => {
    if (options[key]) params.push(`${key}=${encodeURIComponent(options[key])}`);
  });
  return `/pages/client/create-order/index?${params.join('&')}`;
}

Page({
  onLoad(options) {
    wx.redirectTo({ url: bookingUrl(options || {}) });
  }
});

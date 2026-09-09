// 兼容旧入口：不再接收任意照片 URL，历史照片仍在客户记录中。
Page({
  onLoad() { wx.redirectTo({ url: '/pages/client/beauty-archive/index' }); },
  openRecords() { wx.redirectTo({ url: '/pages/client/beauty-archive/index' }); }
});

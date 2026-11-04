Page({
  data: { tools: [
  {
    "key": "homepage",
    "label": "美甲师主页",
    "icon": "/static/icons/profile-edit.svg",
    "url": "/pages/technician/homepage-settings/index"
  },
  {
    "key": "works",
    "label": "作品管理",
    "icon": "/static/icons/image.svg",
    "url": "/pages/technician/works/index"
  },
  {
    "key": "quickQuote",
    "label": "快速报价",
    "icon": "/static/icons/calendar.svg",
    "url": "/pages/technician/quick-quote/index"
  },
  {
    "key": "quoteRecords",
    "label": "我的报价",
    "icon": "/static/icons/document.svg",
    "url": "/pages/technician/quote-records/index"
  },
  {
    "key": "customers",
    "label": "邀请客户",
    "icon": "/static/icons/role-client.svg",
    "url": "/pages/technician/customers/index"
  },
  {
    "key": "poster",
    "label": "作品宣传海报",
    "icon": "/static/icons/share.svg",
    "url": "/pages/technician/marketing-poster/index"
  }
] },
  openTool(e) {
    const tool = this.data.tools.find(item => item.key === e.currentTarget.dataset.key);
    if (!tool) return;
    if (tool.key === 'customers') return wx.switchTab({ url: tool.url });
    wx.navigateTo({ url: tool.url });
  }
});

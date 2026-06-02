Page({
  data: {
    faqs: [
      { q: '如何设置服务项目和价格？', a: '在「服务管理」页面可以添加、编辑你的服务项目，设置价格和时长。', open: false },
      { q: '如何开启/关闭接单？', a: '在「我的」页面切换接单状态，或在首页快速切换。', open: false },
      { q: '客户预约后如何处理？', a: '在「预约管理」查看待处理预约，可进行报价、确认或取消操作。', open: false },
      { q: '如何设置上门服务？', a: '在「上门设置」中开启上门服务，配置服务范围和费用。', open: false },
      { q: '邀请码在哪里找？', a: '在「我的」页面可查看和复制你的邀请码，分享给客户绑定使用。', open: false }
    ]
  },

  toggleFaq(e) {
    const idx = e.currentTarget.dataset.idx;
    const faqs = this.data.faqs.map((item, i) => ({ ...item, open: i === idx ? !item.open : item.open }));
    this.setData({ faqs });
  }
});

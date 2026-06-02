Page({
  data: {
    faqs: [
      { q: '如何绑定美甲师？', a: '通过美甲师分享的邀请链接进入并完成注册即可自动绑定；已注册用户可在【我的】页面点击「绑定新美甲师」，输入美甲师提供的邀请码完成绑定。', open: false },
      { q: '如何发起预约？', a: '在【预约】页面新建预约，选择已绑定的美甲师、服务时间与地址后提交，等待美甲师报价确认即可。', open: false },
      { q: '定金是如何处理的？', a: '平台不内置线上支付，定金通过线下方式支付。支付后在订单中标记「已付定金」，仅作状态记录。', open: false },
      { q: '可以绑定多个美甲师吗？', a: '可以。你可以绑定多位美甲师，并在【我的】页面设置默认美甲师，预约时也可选择不同的美甲师。', open: false },
      { q: '如何取消预约？', a: '在预约详情页找到该预约，点击「取消预约」按钮即可。已确认的预约请提前联系美甲师沟通。', open: false }
    ]
  },

  toggleFaq(e) {
    const idx = e.currentTarget.dataset.idx;
    const faqs = this.data.faqs.map((item, i) => ({
      ...item,
      open: i === idx ? !item.open : item.open
    }));
    this.setData({ faqs });
  },

  goChat() {
    wx.navigateTo({ url: '/pages/client/chat/index' });
  }
});

const { clientGuideKey } = require('../../utils/onboarding-plan');
const tips = {
  shop: { title: '接单准备 1 · 店铺信息', text: '点击“添加店铺”，填写店名、地区和详细地址，打开“启用店铺”后保存，再返回工作台核对进度。' },
  homepage: { title: '接单准备 3 · 公开主页', text: '先上架服务，再填写头像、名称、Slogan、城市、服务区域与介绍，上传背景图和环境照片，补充卫生说明及取消规则。打开“公开展示主页”后保存。' },
  works: { title: '接单准备 4 · 代表作品', text: '点击上传作品，设置封面和照片，选择对所有客户公开。至少一个作品审核通过后，此项才会完成；待审核时可以先完善其他项。' },
  services: { title: '接单准备 2 · 服务与价格', text: '添加服务名称、价格和预计时长，并保持上架。价格可以为 0，但不能留空；时长用于计算可预约时段。' },
  schedule: { title: '接单准备 5 · 工作时间', text: '点击“工作时间”添加方案，选择工作日和起止时间，启用并保存。临时休息可在方案中单独标记。' },
  'client-home': { title: '从喜欢的款式开始', text: '点击作品查看细节；进入美甲师主页可了解服务和门店。选好后再预约。', action: '去浏览作品', url: '/pages/client/works/index' },
  'client-works': { title: '挑选你的第一款美甲', text: '点击任意作品查看大图、收藏灵感，或在详情中选择“预约同款”。' },
  'client-work': { title: '喜欢这款？直接预约', text: '点击预约同款，带着这件作品去选择服务与可约时间；也可以先收藏。', action: '预约这款', event: true },
  'client-booking': { title: '在这里完成预约', text: '先选择服务和门店，再选择可约日期与时间。填写需求并核对价格，最后提交预约申请。' },
  'client-orders': { title: '在这里跟进预约', text: '点击订单查看预约进度、门店与时间，使用联系入口与美甲师确认需求。' }
};
Component({
  properties: { kind: String },
  data: { visible: false, tip: {}, technician: false },
  lifetimes: { attached() { this.refresh(); } },
  pageLifetimes: { show() { this.refresh(); } },
  methods: {
    refresh() {
      const kind = this.properties.kind;
      const technician = !kind.startsWith('client-');
      const state = wx.getStorageSync(clientGuideKey()) || {};
      const role = wx.getStorageSync('role');
      this.setData({ tip: tips[kind] || {}, technician,
        visible: !!tips[kind] && (technician ? role === 'technician' : role === 'client' && !!state.dismissed && !state.dismissed[kind]) });
    },
    dismiss() {
      const key = clientGuideKey();
      if (key) {
        const state = wx.getStorageSync(key) || { dismissed: {} };
        state.dismissed[this.properties.kind] = true;
        wx.setStorageSync(key, state);
      }
      this.setData({ visible: false });
    },
    act() {
      if (this.data.tip.event) { this.triggerEvent('action'); return; }
      const url = this.data.technician ? '/pages/technician/home/index' : this.data.tip.url;
      if (!url) return;
      if (this.data.technician) wx.reLaunch({ url });
      else wx.navigateTo({ url });
    }
  }
});

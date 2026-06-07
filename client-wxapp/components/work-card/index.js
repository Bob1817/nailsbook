// 统一作品卡片组件（发现 / 首页最新动态 / 作品 / 点赞 / 收藏 通用视觉）
// 由外层 .w-card 包裹负责瀑布流尺寸；本组件绝对填充其内部。
Component({
  properties: {
    work: {
      type: Object,
      value: {}
    }
  }
});

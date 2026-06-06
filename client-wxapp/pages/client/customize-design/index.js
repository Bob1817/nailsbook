const api = require('../../../services/api');

// 基础款式选项
const baseStyles = [
  { id: 'french', name: '法式', icon: '🇫🇷', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80' },
  { id: 'gradient', name: '渐变', icon: '🌸', image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400&q=80' },
  { id: 'cat-eye', name: '猫眼', icon: '✨', image: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=400&q=80' },
  { id: 'nude', name: '裸色', icon: '🤎', image: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400&q=80' },
  { id: 'geometric', name: '几何', icon: '🔷', image: 'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=400&q=80' },
  { id: 'floral', name: '花卉', icon: '🌺', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80' }
];

// 甲型选项
const nailShapes = [
  { id: 'square', name: '方形', description: '经典方头' },
  { id: 'round', name: '圆形', description: '柔和圆润' },
  { id: 'almond', name: '杏仁', description: '优雅修长' },
  { id: 'stiletto', name: '尖形', description: '个性时尚' },
  { id: 'coffin', name: '梯形', description: '潮流前卫' },
  { id: 'oval', name: '椭圆', description: '自然百搭' }
];

// 颜色选项
const colorOptions = [
  { id: 'pink', name: '粉色系', hex: '#FFB6C1' },
  { id: 'red', name: '红色系', hex: '#DC143C' },
  { id: 'nude', name: '裸色系', hex: '#D2B48C' },
  { id: 'white', name: '白色系', hex: '#FFFFFF' },
  { id: 'black', name: '黑色系', hex: '#1a1a1a' },
  { id: 'blue', name: '蓝色系', hex: '#4169E1' },
  { id: 'purple', name: '紫色系', hex: '#9370DB' },
  { id: 'green', name: '绿色系', hex: '#3CB371' },
  { id: 'gold', name: '金色系', hex: '#FFD700' },
  { id: 'silver', name: '银色系', hex: '#C0C0C0' }
];

// 元素/配饰选项
const elementOptions = [
  { id: 'rhinestone', name: '水钻', icon: '💎' },
  { id: 'pearl', name: '珍珠', icon: '⚪' },
  { id: 'glitter', name: '闪粉', icon: '✨' },
  { id: 'foil', name: '金箔', icon: '🥇' },
  { id: 'sticker', name: '贴纸', icon: '🏷️' },
  { id: 'line', name: '线条', icon: '📏' },
  { id: 'dot', name: '波点', icon: '🔘' },
  { id: 'marble', name: '大理石', icon: '🪨' }
];

Page({
  data: {
    currentStep: 1,
    steps: [
      { id: 1, name: '基础款' },
      { id: 2, name: '甲型' },
      { id: 3, name: '颜色' },
      { id: 4, name: '配饰' },
      { id: 5, name: '预览' }
    ],
    baseStyles,
    nailShapes,
    colorOptions,
    elementOptions,
    selectedBase: '',
    selectedShape: '',
    selectedColors: [],
    selectedElements: [],
    title: '',
    description: '',
    customImage: '',
    previewImage: '',
    defaultTitle: '自定义设计',
    selectedShapeName: '',
    selectedColorItems: [],
    selectedElementItems: [],
    colorOptionsDisplay: [],
    elementOptionsDisplay: [],
    uploading: false,
    submitting: false
  },

  onLoad() { this._updateDerived(); },

  // 选择基础款式
  selectBase(e) {
    const id = e.currentTarget.dataset.id;
    const base = baseStyles.find(b => b.id === id);
    this.setData({
      selectedBase: id,
      customImage: '',
    previewImage: '',
    defaultTitle: '自定义设计',
    selectedShapeName: '',
    selectedColorItems: [],
    selectedElementItems: [],
    colorOptionsDisplay: [],
    elementOptionsDisplay: [],
      previewImage: base ? base.image : ''
    });
  },

  // 选择甲型
  selectShape(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ selectedShape: id });
    this._updateDerived();
  },

  // 切换颜色
  toggleColor(e) {
    const id = e.currentTarget.dataset.id;
    let selectedColors = [...this.data.selectedColors];
    const index = selectedColors.indexOf(id);
    if (index > -1) {
      selectedColors.splice(index, 1);
    } else {
      selectedColors.push(id);
    }
    this.setData({ selectedColors });
    this._updateDerived();
  },

  // 切换配饰
  toggleElement(e) {
    const id = e.currentTarget.dataset.id;
    let selectedElements = [...this.data.selectedElements];
    const index = selectedElements.indexOf(id);
    if (index > -1) {
      selectedElements.splice(index, 1);
    } else {
      selectedElements.push(id);
    }
    this.setData({ selectedElements });
    this._updateDerived();
  },

  // 上传自定义图片
  uploadCustomImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ uploading: true });
        api.upload.image(res.tempFiles[0].tempFilePath)
          .then(result => {
            this.setData({
              customImage: result.url,
              selectedBase: '',
              previewImage: result.url,
              uploading: false
            });
          })
          .catch(err => {
            console.error('Upload failed:', err);
            wx.showToast({ title: '图片上传失败', icon: 'none' });
            this.setData({ uploading: false });
          });
      }
    });
  },

  // 移除自定义图片
  removeCustomImage() {
    this.setData({
      customImage: '',
    previewImage: '',
    defaultTitle: '自定义设计',
    selectedShapeName: '',
    selectedColorItems: [],
    selectedElementItems: [],
    colorOptionsDisplay: [],
    elementOptionsDisplay: [],
      selectedBase: ''
    });
  },

  // 标题输入
  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  // 描述输入
  onDescInput(e) {
    this.setData({ description: e.detail.value });
  },

  // 生成预览标题
  generateTitle() {
    const parts = [];
    if (this.data.selectedBase) {
      const base = baseStyles.find(b => b.id === this.data.selectedBase);
      if (base) parts.push(base.name);
    }
    if (this.data.selectedShape) {
      const shape = nailShapes.find(s => s.id === this.data.selectedShape);
      if (shape) parts.push(shape.name);
    }
    if (this.data.selectedColors.length > 0) {
      const colorNames = this.data.selectedColors
        .map(id => colorOptions.find(c => c.id === id)?.name)
        .filter(Boolean);
      if (colorNames.length > 0) parts.push(colorNames.join('+'));
    }
    return parts.length > 0 ? parts.join(' ') : '自定义设计';
  },

  // 获取预览图片
  getPreviewImage() {
    if (this.data.customImage) return this.data.customImage;
    if (this.data.selectedBase) {
      const base = baseStyles.find(b => b.id === this.data.selectedBase);
      return base ? base.image : '';
    }
    return '';
  },

  // 获取选中的颜色信息
  getSelectedColors() {
    return this.data.selectedColors.map(id => colorOptions.find(c => c.id === id)).filter(Boolean);
  },

  // 获取选中的配饰信息
  getSelectedElements() {
    return this.data.selectedElements.map(id => elementOptions.find(e => e.id === id)).filter(Boolean);
  },

  // 上一步
  prevStep() {
    if (this.data.currentStep > 1) {
      this.setData({ currentStep: this.data.currentStep - 1 });
    }
  },

  // 下一步
  nextStep() {
    const { currentStep, selectedBase, customImage } = this.data;
    
    if (currentStep === 1 && !selectedBase && !customImage) {
      wx.showToast({ title: '请选择基础款式或上传参考图', icon: 'none' });
      return;
    }

    if (currentStep < 5) {
      this.setData({ currentStep: currentStep + 1 });
    }
  },

  // 跳转到指定步骤
  goToStep(e) {
    const step = e.currentTarget.dataset.step;
    this.setData({ currentStep: step });
  },


  // 计算衍生展示数据
  _updateDerived() {
    const { selectedShape, selectedColors, selectedElements } = this.data;
    const shape = nailShapes.find(s => s.id === selectedShape);
    const colorItems = selectedColors.map(id => {
      const c = colorOptions.find(x => x.id === id);
      return c ? { ...c, _selected: true, lightText: ['white','gold','silver'].includes(id) } : null;
    }).filter(Boolean);
    const elementItems = selectedElements.map(id => {
      const e = elementOptions.find(x => x.id === id);
      return e ? { ...e, _selected: true } : null;
    }).filter(Boolean);
    // Also update colorOptions with _selected flag
    const colorOpts = colorOptions.map(c => ({
      ...c, _selected: selectedColors.indexOf(c.id) > -1,
      lightText: ['white','gold','silver'].includes(c.id)
    }));
    const elementOpts = elementOptions.map(e => ({
      ...e, _selected: selectedElements.indexOf(e.id) > -1
    }));
    this.setData({
      selectedShapeName: shape ? shape.name : '',
      selectedColorItems: colorItems,
      selectedElementItems: elementItems,
      colorOptionsDisplay: colorOpts,
      elementOptionsDisplay: elementOpts
    });
  },

  // 提交设计
  async handleSubmit() {
    this.setData({ submitting: true });
    try {
      const imageUrls = [];
      const previewImage = this.getPreviewImage();
      if (previewImage) imageUrls.push(previewImage);

      const fullDescription = `
${this.data.description}

【设计配置】
基础款: ${this.data.selectedBase ? baseStyles.find(b => b.id === this.data.selectedBase)?.name : '无'}
甲型: ${this.data.selectedShape ? nailShapes.find(s => s.id === this.data.selectedShape)?.name : '无'}
颜色: ${this.data.selectedColors.map(id => colorOptions.find(c => c.id === id)?.name).join(', ') || '无'}
配饰: ${this.data.selectedElements.map(id => elementOptions.find(e => e.id === id)?.name).join(', ') || '无'}
      `.trim();

      await api.client.designs.create({
        title: this.data.title.trim() || this.generateTitle(),
        imageUrls,
        description: fullDescription
      });

      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      console.error('Submit failed:', err);
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
});

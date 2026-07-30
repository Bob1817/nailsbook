const api = require('../../../services/api');

Page({
  data: {
    isEdit: false,
    workId: null,
    title: '',
    description: '',
    designIdea: '',
    suitableScene: '',
    recommendationScore: 5,
    recommendationOptions: ['1 · 小众灵感', '2 · 值得尝试', '3 · 人气推荐', '4 · 高度推荐', '5 · 本季精选'],
    tags: '',
    price: '',
    coverUrl: '',
    images: [],
    isVisible: true,
    visibilityScope: 'public',
    accessOptions: [],
    customerNames: [],
    selectedCustomerIndex: -1,
    accessGrants: [],
    uploading: false,
    submitting: false
  },

  async onLoad(options) {
    this._pageActive = true;
    await this.loadAccessOptions();
    if (options.id) {
      this.setData({ isEdit: true, workId: options.id });
      this.loadWork(options.id);
    } else if (options.customerId) {
      this.prefillCustomer(options.customerId);
    }
    wx.setNavigationBarTitle({ title: options.id ? '编辑作品' : '上传作品' });
  },

  onShow() {
    this._pageActive = true;
    if (this._savedWhileHidden) {
      this._savedWhileHidden = false;
      wx.navigateBack();
      return;
    }
    if (this._asyncFinishedWhileHidden) {
      this.setData({ uploading: false, submitting: false });
      this._asyncFinishedWhileHidden = false;
    }
  },
  onHide() { this._pageActive = false; },
  onUnload() {
    this._pageActive = false;
    if (this._navTimer) clearTimeout(this._navTimer);
  },

  prefillCustomer(customerId) {
    const customer = this.data.accessOptions.find(item => String(item.id) === String(customerId));
    if (!customer) {
      wx.showToast({ title: '该客户尚未绑定客户端账号', icon: 'none' });
      return;
    }
    this.setData({
      visibilityScope: 'authorized_clients',
      accessGrants: [makeGrant(customer, customer.orders || [])]
    });
  },

  async loadAccessOptions() {
    try {
      const list = await api.technician.works.accessOptions();
      if (!this._pageActive) return;
      const accessOptions = (list || []).filter(item => item.canAuthorize);
      this.setData({ accessOptions, customerNames: accessOptions.map(item => item.name) });
    } catch (err) {
      console.error('load access options error:', err);
    }
  },

  async loadWork(id) {
    wx.showLoading({ title: '加载中...' });
    try {
      const work = await api.technician.works.detail(id);
      wx.hideLoading();
      if (!this._pageActive) return;
      let images = [];
      try { images = JSON.parse(work.images || '[]'); } catch (e) {}
      this.setData({
        title: work.title || '',
        description: work.description || '',
        designIdea: work.designIdea || '',
        suitableScene: work.suitableScene || '',
        recommendationScore: work.recommendationScore || 5,
        tags: Array.isArray(work.tags) ? work.tags.join(',') : (work.tags || ''),
        price: work.price != null ? String(work.price) : '',
        coverUrl: work.coverUrl || '',
        images,
        isVisible: work.isVisible !== false,
        visibilityScope: work.visibilityScope || 'public'
      });
      if (work.clientAccesses && work.clientAccesses.length) this.applyExistingGrants(work.clientAccesses);
    } catch (err) {
      wx.hideLoading();
      if (!this._pageActive) return;
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  onVisibleChange(e) {
    this.setData({ isVisible: e.detail.value });
  },

  onScopeChange(e) { this.setData({ visibilityScope: e.detail.value ? 'authorized_clients' : 'public' }); },

  onCustomerChange(e) {
    const index = Number(e.detail.value);
    const customer = this.data.accessOptions[index];
    if (!customer) return;
    if (this.data.accessGrants.some(grant => grant.customerId === customer.id)) {
      wx.showToast({ title: '该客户已添加', icon: 'none' });
      return;
    }
    const orders = customer ? (customer.orders || []) : [];
    this.setData({
      selectedCustomerIndex: index,
      accessGrants: this.data.accessGrants.concat([makeGrant(customer, orders)])
    });
  },

  removeGrant(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ accessGrants: this.data.accessGrants.filter((_, i) => i !== index) });
  },
  onGrantOrderChange(e) {
    const index = Number(e.currentTarget.dataset.index);
    const selectedOrderIndex = Number(e.detail.value);
    const grant = this.data.accessGrants[index];
    const selectedOrder = selectedOrderIndex > 0 ? grant.customerOrders[selectedOrderIndex - 1] : null;
    this.setData({
      [`accessGrants[${index}].selectedOrderIndex`]: selectedOrderIndex,
      [`accessGrants[${index}].selectedOrderText`]: selectedOrder ? grant.orderNames[selectedOrderIndex] : '未关联预约'
    });
  },
  onGrantPermissionChange(e) {
    const index = Number(e.currentTarget.dataset.index);
    const field = e.currentTarget.dataset.field;
    this.setData({ [`accessGrants[${index}].${field}`]: e.detail.value });
  },
  onRecommendationChange(e) { this.setData({ recommendationScore: Number(e.detail.value) + 1 }); },

  applyExistingGrants(grants) {
    const accessGrants = grants.map((grant) => {
      const customer = this.data.accessOptions.find(item => item.id === grant.customerId);
      if (!customer) return null;
      const item = makeGrant(customer, customer.orders || []);
      const orderIndex = grant.orderId ? item.customerOrders.findIndex(order => order.id === grant.orderId) + 1 : 0;
      return {
        ...item,
        selectedOrderIndex: orderIndex > 0 ? orderIndex : 0,
        selectedOrderText: orderIndex > 0 ? item.orderNames[orderIndex] : '未关联预约',
        canShare: grant.canShare,
        canFavorite: grant.canFavorite,
        canLike: grant.canLike,
        canComment: grant.canComment
      };
    }).filter(Boolean);
    this.setData({ accessGrants });
  },

  chooseCover() {
    if (this.data.uploading) return;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: async (res) => {
        const filePath = res.tempFiles[0].tempFilePath;
        this.setData({ uploading: true });
        wx.showLoading({ title: '上传中...' });
        try {
          const result = await api.upload.image(filePath, 'technician');
          wx.hideLoading();
          if (!this._pageActive) { this._asyncFinishedWhileHidden = true; return; }
          this.setData({ coverUrl: result.url });
        } catch (err) {
          wx.hideLoading();
          if (!this._pageActive) { this._asyncFinishedWhileHidden = true; return; }
          wx.showToast({ title: '上传失败', icon: 'none' });
        } finally {
          if (this._pageActive) this.setData({ uploading: false });
          else this._asyncFinishedWhileHidden = true;
        }
      }
    });
  },

  addImage() {
    if (this.data.uploading) return;
    const remaining = 9 - this.data.images.length;
    if (remaining <= 0) {
      wx.showToast({ title: '最多9张图片', icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      success: async (res) => {
        this.setData({ uploading: true });
        wx.showLoading({ title: '上传中...' });
        try {
          const urls = [];
          for (const file of res.tempFiles) {
            const result = await api.upload.image(file.tempFilePath, 'technician');
            urls.push(result.url);
          }
          wx.hideLoading();
          if (!this._pageActive) { this._asyncFinishedWhileHidden = true; return; }
          this.setData({ images: [...this.data.images, ...urls] });
        } catch (err) {
          wx.hideLoading();
          if (!this._pageActive) { this._asyncFinishedWhileHidden = true; return; }
          wx.showToast({ title: '上传失败', icon: 'none' });
        } finally {
          if (this._pageActive) this.setData({ uploading: false });
          else this._asyncFinishedWhileHidden = true;
        }
      }
    });
  },

  removeImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images.filter((_, i) => i !== index);
    this.setData({ images });
  },

  validate() {
    if (!this.data.title.trim()) {
      wx.showToast({ title: '请输入作品标题', icon: 'none' });
      return false;
    }
    if (!this.data.coverUrl) {
      wx.showToast({ title: '请上传封面图片', icon: 'none' });
      return false;
    }
    if (this.data.visibilityScope === 'authorized_clients' && !this.data.accessGrants.length) {
      wx.showToast({ title: '请选择授权客户', icon: 'none' });
      return false;
    }
    return true;
  },

  buildGrants() {
    return this.data.accessGrants.map(grant => {
      const order = grant.selectedOrderIndex > 0 ? grant.customerOrders[grant.selectedOrderIndex - 1] : null;
      return {
        customerId: grant.customerId, orderId: order ? order.id : undefined, canView: true,
        canShare: grant.canShare, canFavorite: grant.canFavorite,
        canLike: grant.canLike, canComment: grant.canComment
      };
    });
  },

  async handleSubmit() {
    if (!this.validate() || this.data.submitting) return;

    const { title, description, designIdea, suitableScene, recommendationScore, tags, price, coverUrl, images, isVisible, isEdit, workId } = this.data;
    const desiredVisible = isVisible;
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      designIdea: designIdea.trim() || undefined,
      suitableScene: suitableScene.trim() || undefined,
      recommendationScore,
      tags: tags.trim() || undefined,
      price: price ? Number(price) : undefined,
      coverUrl,
      images: JSON.stringify(images),
      isVisible: !isEdit && this.data.visibilityScope === 'authorized_clients' ? false : isVisible
    };

    this.setData({ submitting: true });
    wx.showLoading({ title: '保存中...' });

    try {
      let saved;
      if (isEdit) {
        saved = await api.technician.works.update(workId, payload);
      } else {
        saved = await api.technician.works.create(payload);
      }
      const savedId = saved.id || workId;
      const grants = this.data.visibilityScope === 'authorized_clients' ? this.buildGrants() : [];
      await api.technician.works.updateAccess(savedId, { visibilityScope: this.data.visibilityScope, grants });
      if (!isEdit && this.data.visibilityScope === 'authorized_clients' && desiredVisible) {
        await api.technician.works.update(savedId, { isVisible: true });
      }
      wx.hideLoading();
      if (!this._pageActive) { this._savedWhileHidden = true; return; }
      wx.showToast({ title: '保存成功', icon: 'success' });
      this._navTimer = setTimeout(() => { if (this._pageActive) wx.navigateBack(); }, 800);
    } catch (err) {
      wx.hideLoading();
      if (!this._pageActive) { this._asyncFinishedWhileHidden = true; return; }
      this.setData({ submitting: false });
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    }
  }
});

function formatDate(value) {
  const date = new Date(value);
  return isNaN(date.getTime()) ? '未排期' : `${date.getMonth() + 1}月${date.getDate()}日`;
}

function makeGrant(customer, orders) {
  const sortedOrders = (orders || []).slice().sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return -1;
    if (a.status !== 'completed' && b.status === 'completed') return 1;
    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
  });
  const preferredIndex = sortedOrders.findIndex(item => item.status === 'completed');
  const orderNames = ['不关联具体预约'].concat(sortedOrders.map(item => {
    const status = item.status === 'completed' ? '已完成' : '未完成';
    return `${formatDate(item.startTime)} · ${item.serviceType || item.orderNo} · ${status}`;
  }));
  return {
    customerId: customer.id,
    customerName: customer.name,
    customerOrders: sortedOrders,
    orderNames,
    selectedOrderIndex: preferredIndex >= 0 ? preferredIndex + 1 : 0,
    selectedOrderText: preferredIndex >= 0 ? orderNames[preferredIndex + 1] : '未关联预约',
    canShare: true,
    canFavorite: true,
    canLike: true,
    canComment: true
  };
}

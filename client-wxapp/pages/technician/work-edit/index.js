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
    standardPrice: '',
    availableServices: [],
    hasInvalidServiceConfig: false,
    selectedServiceIds: [],
    serviceSubtotalFen: 0,
    totalDurationMinutes: 0,
    priceDifferenceType: '',
    priceDifferenceFen: 0,
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
    await Promise.all([this.loadAccessOptions(), this.loadServices()]);
    if (options.id) {
      this.setData({ isEdit: true, workId: options.id });
      this.loadWork(options.id);
    } else if (options.orderId) {
      this.prefillFromOrder(options.orderId);
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

  // 由"完成服务"引导进入：预填该订单所属客户的授权，并预选关联该订单
  prefillFromOrder(orderId) {
    const customer = this.data.accessOptions.find(item =>
      (item.orders || []).some(order => String(order.id) === String(orderId))
    );
    if (!customer) {
      wx.showToast({ title: '该订单客户尚未绑定客户端账号', icon: 'none' });
      return;
    }
    const grant = makeGrant(customer, customer.orders || []);
    const orderIndex = grant.customerOrders.findIndex(order => String(order.id) === String(orderId));
    if (orderIndex >= 0) {
      grant.selectedOrderIndex = orderIndex + 1;
      grant.selectedOrderText = grant.orderNames[orderIndex + 1];
    }
    this.setData({
      visibilityScope: 'authorized_clients',
      accessGrants: [grant]
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

  async loadServices() {
    try {
      const list = await api.technician.services.list();
      if (!this._pageActive) return;
      const availableServices = (list || [])
        .filter(item => item.isActive !== false)
        .map(item => ({
          ...item,
          configurationValid:
            Number.isFinite(Number(item.price)) &&
            Number(item.price) >= 0 &&
            Number.isInteger(Number(item.durationMinutes)) &&
            Number(item.durationMinutes) >= 15
        }));
      this.setData({
        availableServices,
        hasInvalidServiceConfig: availableServices.some(item => !item.configurationValid)
      });
      this.recalculatePricing();
    } catch (err) {
      console.error('load services error:', err);
    }
  },

  async loadWork(id) {
    wx.showLoading({ title: '加载中...' });
    try {
      const work = await api.technician.works.detail(id);
      wx.hideLoading();
      if (!this._pageActive) return;
      let images = [];
      if (Array.isArray(work.imageUrls)) {
        images = work.imageUrls.slice();
      } else {
        try { images = JSON.parse(work.images || '[]'); } catch (e) {}
      }
      this.setData({
        title: work.title || '',
        description: work.description || '',
        designIdea: work.designIdea || '',
        suitableScene: work.suitableScene || '',
        recommendationScore: work.recommendationScore || 5,
        tags: Array.isArray(work.tags) ? work.tags.join(',') : (work.tags || ''),
        price: work.price != null ? String(work.price) : '',
        standardPrice: work.standardPrice != null ? String(work.standardPrice) : '',
        selectedServiceIds: expandServiceIds(work.serviceLines || []),
        coverUrl: work.coverUrl || '',
        images,
        isVisible: work.isVisible !== false,
        visibilityScope: work.visibilityScope || 'public'
      });
      this.recalculatePricing();
      if (work.clientAccesses && work.clientAccesses.length) this.applyExistingGrants(work.clientAccesses);
    } catch (err) {
      wx.hideLoading();
      if (!this._pageActive) return;
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value }, () => {
      if (field === 'standardPrice') this.recalculatePricing();
    });
  },

  incrementService(e) {
    const id = String(e.currentTarget.dataset.id);
    const service = this.data.availableServices.find(item => String(item.id) === id);
    if (!service || !service.configurationValid) {
      wx.showToast({ title: '请先完善该服务的价格和时长', icon: 'none' });
      return;
    }
    const quantity = this.data.selectedServiceIds.filter(item => item === id).length;
    if (quantity >= 20) {
      wx.showToast({ title: '单项服务最多添加20份', icon: 'none' });
      return;
    }
    this.setData({ selectedServiceIds: this.data.selectedServiceIds.concat(id) });
    this.recalculatePricing();
  },

  decrementService(e) {
    const id = String(e.currentTarget.dataset.id);
    const index = this.data.selectedServiceIds.lastIndexOf(id);
    if (index < 0) return;
    const selectedServiceIds = this.data.selectedServiceIds.slice();
    selectedServiceIds.splice(index, 1);
    this.setData({ selectedServiceIds });
    this.recalculatePricing();
  },

  recalculatePricing() {
    const availableServices = this.data.availableServices.map(item => ({
      ...item,
      quantity: this.data.selectedServiceIds.filter(id => id === String(item.id)).length
    }));
    const selected = availableServices.filter(item => item.quantity > 0);
    const serviceSubtotalFen = selected.reduce((sum, item) =>
      sum + Math.round(Number(item.price || 0) * 100) * item.quantity, 0);
    const standardPriceFen = Math.round(Number(this.data.standardPrice || 0) * 100);
    const differenceFen = standardPriceFen > 0 ? standardPriceFen - serviceSubtotalFen : 0;
    this.setData({
      availableServices,
      serviceSubtotalFen,
      totalDurationMinutes: selected.reduce((sum, item) =>
        sum + Number(item.durationMinutes || 0) * item.quantity, 0),
      priceDifferenceType: differenceFen < 0 ? 'discount' : (differenceFen > 0 ? 'surcharge' : ''),
      priceDifferenceFen: Math.abs(differenceFen)
    });
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

  goServiceManagement() {
    wx.navigateTo({ url: '/pages/technician/services/index' });
  },

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
    if (!this.data.selectedServiceIds.length) {
      wx.showToast({ title: '请选择作品所需的基础服务', icon: 'none' });
      return false;
    }
    const invalidSelectedService = this.data.availableServices.find(item =>
      this.data.selectedServiceIds.includes(String(item.id)) && !item.configurationValid
    );
    if (invalidSelectedService) {
      wx.showToast({ title: '请先完善所选服务的价格和时长', icon: 'none' });
      return false;
    }
    const standardPrice = Number(this.data.standardPrice);
    if (!Number.isFinite(standardPrice) || standardPrice <= 0) {
      wx.showToast({ title: '请填写作品综合报价', icon: 'none' });
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

    const { title, description, designIdea, suitableScene, recommendationScore, tags, price, standardPrice, selectedServiceIds, coverUrl, images, isVisible, isEdit, workId } = this.data;
    const desiredVisible = isVisible;
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      designIdea: designIdea.trim() || undefined,
      suitableScene: suitableScene.trim() || undefined,
      recommendationScore,
      tags: tags.trim() || undefined,
      price: price ? Number(price) : undefined,
      standardPrice: Number(standardPrice),
      selectedServiceIds,
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

function expandServiceIds(serviceLines) {
  const ids = [];
  serviceLines.forEach(line => {
    const id = line.serviceId;
    const quantity = Math.max(1, Number(line.quantity) || 1);
    if (!id) return;
    for (let index = 0; index < quantity; index += 1) ids.push(String(id));
  });
  return ids;
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

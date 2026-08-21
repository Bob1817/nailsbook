const api = require('../../../services/api');

const TEMPLATES = [
  { id: 'magazine', name: '高级杂志', subtitle: '柔光留白' },
  { id: 'life', name: '精致生活', subtitle: '自然温柔' },
  { id: 'art', name: '艺术展签', subtitle: '美院气质' },
  { id: 'festival', name: '节日限定', subtitle: '纪念时刻' }
];
const FILTERS = [
  { id: 'original', name: '原片', color: '#e9e5e3', overlay: '' },
  { id: 'warm', name: '暖杏', color: '#e8c0a8', overlay: 'rgba(225,143,104,.12)' },
  { id: 'clear', name: '清透', color: '#c9dce4', overlay: 'rgba(108,166,194,.10)' },
  { id: 'film', name: '胶片', color: '#b5a295', overlay: 'rgba(91,66,52,.14)' },
  { id: 'rose', name: '柔粉', color: '#edc5d3', overlay: 'rgba(224,112,154,.10)' }
];
const MAX_PHOTOS = 6;

Page({
  data: {
    loading: true,
    appointments: [],
    selectedAppointmentIds: [],
    libraryPhotos: [],
    selectedPhotoIds: [],
    selectedPhotos: [],
    photoTransforms: {},
    editingPhotoId: '',
    editingTransform: defaultTransform(),
    localPhotos: [],
    templates: TEMPLATES,
    filters: FILTERS,
    selectedTemplate: 'magazine',
    selectedFilter: 'original',
    filterIntensity: 100,
    posterTitle: '我的美甲时刻',
    posterDate: formatPickerDate(new Date()),
    customShareCopy: '',
    generatedPath: '',
    generating: false,
    shareCopies: buildShareCopies('magazine')
  },

  onLoad(options) {
    this.pendingSource = options.source ? decodeURIComponent(options.source) : '';
    this.loadLibrary();
  },

  async loadLibrary() {
    try {
      const res = await api.client.beautyArchive();
      const appointments = (res.records || [])
        .filter(item => item.orderId)
        .map(normalizeAppointment);
      let localPhotos = this.data.localPhotos;
      let selectedPhotoIds = this.data.selectedPhotoIds;
      if (this.pendingSource) {
        const item = { id: `local-${Date.now()}`, url: this.pendingSource, source: '本地照片', orderId: null };
        localPhotos = [item];
        selectedPhotoIds = [item.id];
        this.pendingSource = '';
      }
      this.setData({ appointments, localPhotos, selectedPhotoIds, loading: false }, () => this.rebuildLibrary());
    } catch (err) {
      console.error('load photo studio library error:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '作品库加载失败', icon: 'none' });
    }
  },

  toggleAppointment(e) {
    const id = Number(e.currentTarget.dataset.id);
    const selected = this.data.selectedAppointmentIds.slice();
    const index = selected.indexOf(id);
    if (index >= 0) selected.splice(index, 1);
    else selected.push(id);
    this.setData({ selectedAppointmentIds: selected, generatedPath: '' }, () => this.rebuildLibrary());
  },

  selectAllAppointments() {
    const allSelected = this.data.selectedAppointmentIds.length === this.data.appointments.length;
    this.setData({ selectedAppointmentIds: allSelected ? [] : this.data.appointments.map(item => item.orderId), generatedPath: '' }, () => this.rebuildLibrary());
  },

  rebuildLibrary() {
    const selectedIds = this.data.selectedAppointmentIds;
    const appointments = this.data.appointments.map(item => ({ ...item, selected: selectedIds.includes(item.orderId) }));
    const appointmentPhotos = appointments
      .filter(item => selectedIds.includes(item.orderId))
      .reduce((photos, item) => photos.concat(item.photos), []);
    const rawPhotos = appointmentPhotos.concat(this.data.localPhotos);
    const availableIds = rawPhotos.map(item => item.id);
    const selectedPhotoIds = this.data.selectedPhotoIds.filter(id => availableIds.includes(id));
    const libraryPhotos = rawPhotos.map(item => {
      const selectedIndex = selectedPhotoIds.indexOf(item.id);
      return { ...item, selected: selectedIndex >= 0, selectionIndex: selectedIndex + 1 };
    });
    const selectedPhotos = selectedPhotoIds.map(id => libraryPhotos.find(item => item.id === id)).filter(Boolean).map(item => {
      const transform = this.data.photoTransforms[item.id] || defaultTransform();
      return { ...item, _previewStyle: `transform:translate(${transform.offsetX}%,${transform.offsetY}%) scale(${transform.scale / 100})` };
    });
    const editingPhotoId = selectedPhotos.some(item => item.id === this.data.editingPhotoId) ? this.data.editingPhotoId : '';
    this.setData({ appointments, libraryPhotos, selectedPhotoIds, selectedPhotos });
    if (!editingPhotoId && this.data.editingPhotoId) this.setData({ editingPhotoId: '', editingTransform: defaultTransform() });
  },

  togglePhoto(e) {
    const id = e.currentTarget.dataset.id;
    const selected = this.data.selectedPhotoIds.slice();
    const index = selected.indexOf(id);
    if (index >= 0) selected.splice(index, 1);
    else if (selected.length >= MAX_PHOTOS) {
      wx.showToast({ title: `最多选择${MAX_PHOTOS}张照片`, icon: 'none' });
      return;
    } else selected.push(id);
    this.setData({ selectedPhotoIds: selected, generatedPath: '' }, () => this.rebuildLibrary());
  },

  choosePhoto() {
    const remaining = MAX_PHOTOS - this.data.selectedPhotoIds.length;
    if (remaining <= 0) {
      wx.showToast({ title: `最多选择${MAX_PHOTOS}张照片`, icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: res => {
        const stamp = Date.now();
        const added = res.tempFiles.map((file, index) => ({
          id: `local-${stamp}-${index}`,
          url: file.tempFilePath,
          source: '本地照片',
          orderId: null
        }));
        this.setData({
          localPhotos: this.data.localPhotos.concat(added),
          selectedPhotoIds: this.data.selectedPhotoIds.concat(added.map(item => item.id)),
          generatedPath: ''
        }, () => this.rebuildLibrary());
      }
    });
  },

  previewPhoto(e) {
    const current = e.currentTarget.dataset.url;
    wx.previewImage({ current, urls: this.data.libraryPhotos.map(item => item.url) });
  },

  selectTemplate(e) {
    const selectedTemplate = e.currentTarget.dataset.id;
    this.setData({ selectedTemplate, generatedPath: '', shareCopies: buildShareCopies(selectedTemplate) });
  },

  selectFilter(e) {
    this.setData({ selectedFilter: e.currentTarget.dataset.id, generatedPath: '' });
  },

  changeFilterIntensity(e) {
    this.setData({ filterIntensity: Number(e.detail.value), generatedPath: '' });
  },

  changePosterTitle(e) {
    this.setData({ posterTitle: String(e.detail.value || '').slice(0, 16), generatedPath: '' });
  },

  changePosterDate(e) {
    this.setData({ posterDate: e.detail.value, generatedPath: '' });
  },

  changeShareCopy(e) {
    this.setData({ customShareCopy: String(e.detail.value || '').slice(0, 120) });
  },

  movePhoto(e) {
    const id = e.currentTarget.dataset.id;
    const direction = Number(e.currentTarget.dataset.direction);
    const selected = this.data.selectedPhotoIds.slice();
    const index = selected.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= selected.length) return;
    [selected[index], selected[target]] = [selected[target], selected[index]];
    this.setData({ selectedPhotoIds: selected, generatedPath: '' }, () => this.rebuildLibrary());
  },

  editPhotoCrop(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      editingPhotoId: id,
      editingTransform: { ...(this.data.photoTransforms[id] || defaultTransform()) }
    });
  },

  changePhotoTransform(e) {
    const field = e.currentTarget.dataset.field;
    const editingTransform = { ...this.data.editingTransform, [field]: Number(e.detail.value) };
    const photoTransforms = { ...this.data.photoTransforms, [this.data.editingPhotoId]: editingTransform };
    this.setData({ editingTransform, photoTransforms, generatedPath: '' }, () => this.rebuildLibrary());
  },

  resetPhotoTransform() {
    if (!this.data.editingPhotoId) return;
    const photoTransforms = { ...this.data.photoTransforms, [this.data.editingPhotoId]: defaultTransform() };
    this.setData({ photoTransforms, editingTransform: defaultTransform(), generatedPath: '' }, () => this.rebuildLibrary());
  },

  finishPhotoTransform() {
    this.setData({ editingPhotoId: '' });
  },

  continueEditing() {
    this.setData({ generatedPath: '' });
    wx.pageScrollTo({ selector: '.selected-order', duration: 240 });
  },

  generatePhoto() {
    if (!this.data.selectedPhotos.length || this.data.generating) {
      if (!this.data.selectedPhotos.length) wx.showToast({ title: '请先选择作品照片', icon: 'none' });
      return;
    }
    this.setData({ generating: true });
    Promise.all(this.data.selectedPhotos.map(item => resolveImageInfo(item.url)))
      .then(infos => this.drawPoster(infos))
      .catch(() => {
        this.setData({ generating: false });
        wx.showModal({
          title: '有照片读取失败',
          content: '网络图片可能暂时不可用，请检查网络后重试，或取消选择该照片并从相册重新添加。',
          showCancel: false,
          confirmText: '知道了'
        });
      });
  },

  drawPoster(infos) {
    const ctx = wx.createCanvasContext('posterCanvas', this);
    const theme = this.data.selectedTemplate;
    const palette = theme === 'art'
      ? { bg: '#eee9df', ink: '#282722', accent: '#9b3328' }
      : theme === 'festival'
        ? { bg: '#5b2035', ink: '#ffffff', accent: '#f4c4d4' }
        : theme === 'life'
          ? { bg: '#fff4f0', ink: '#533a42', accent: '#d8869d' }
          : { bg: '#f7f4f2', ink: '#231f20', accent: '#a56a7f' };
    const filter = FILTERS.find(item => item.id === this.data.selectedFilter) || FILTERS[0];

    ctx.setFillStyle(palette.bg);
    ctx.fillRect(0, 0, 600, 800);
    const transforms = this.data.selectedPhotos.map(item => this.data.photoTransforms[item.id] || defaultTransform());
    drawPhotoGrid(ctx, infos, adjustOverlay(filter.overlay, this.data.filterIntensity), transforms);
    ctx.setFillStyle(palette.accent);
    ctx.fillRect(40, 635, 58, 4);
    ctx.setFillStyle(palette.ink);
    ctx.setFontSize(18);
    ctx.fillText('LUNANAILS · MY NAIL MOMENTS', 40, 680);
    ctx.setFontSize(34);
    ctx.fillText(this.data.posterTitle || (theme === 'festival' ? '为闪耀时刻，留下一点浪漫' : '我的美甲时刻'), 40, 728);
    ctx.setFontSize(18);
    ctx.setGlobalAlpha(.66);
    ctx.fillText(`${String(this.data.posterDate || '').replace(/-/g, '.')}  ·  ${infos.length} MOMENTS`, 40, 764);
    ctx.setGlobalAlpha(1);
    ctx.draw(false, () => {
      setTimeout(() => {
        wx.canvasToTempFilePath({
          canvasId: 'posterCanvas', width: 600, height: 800, destWidth: 1200, destHeight: 1600,
          success: res => {
            this.setData({ generatedPath: res.tempFilePath, generating: false });
            wx.showToast({ title: '美照已生成', icon: 'success' });
          },
          fail: () => { this.setData({ generating: false }); wx.showToast({ title: '生成失败，请重试', icon: 'none' }); }
        }, this);
      }, 120);
    });
  },

  saveForMoments() {
    if (!this.data.generatedPath) return;
    wx.getFileSystemManager().access({
      path: this.data.generatedPath,
      success: () => this.saveGeneratedPhoto(true),
      fail: () => {
        this.setData({ generatedPath: '' });
        wx.showToast({ title: '成片已失效，请重新生成', icon: 'none' });
      }
    });
  },
  saveGeneratedPhoto(showGuide) {
    wx.saveImageToPhotosAlbum({
      filePath: this.data.generatedPath,
      success: () => wx.showModal({
        title: '分享图已保存',
        content: showGuide ? '打开微信朋友圈，从相册选择这张图片即可发布。朋友圈文案也可以在本页一键复制。' : '图片已保存到相册。',
        showCancel: false,
        confirmText: '知道了'
      }),
      fail: err => {
        if (err.errMsg && err.errMsg.indexOf('auth deny') >= 0) {
          wx.showModal({ title: '需要相册权限', content: '请在设置中允许保存到相册。', confirmText: '去设置', success: res => { if (res.confirm) wx.openSetting(); } });
        } else wx.showToast({ title: '保存失败', icon: 'none' });
      }
    });
  },

  copyShareText(e) {
    const content = this.data.customShareCopy || this.data.shareCopies[e.currentTarget.dataset.type];
    if (content) wx.setClipboardData({ data: content, success: () => wx.showToast({ title: '文案已复制', icon: 'success' }) });
  },

  onShareAppMessage() {
    return { title: '我的美甲时刻 · LunaNails', path: '/pages/client/home/index', imageUrl: this.data.generatedPath || (this.data.selectedPhotos[0] || {}).url };
  }
});

function normalizeAppointment(item) {
  const clientPhotos = item.clientPhotos || [];
  const date = new Date(item.serviceDate);
  return {
    orderId: item.orderId,
    title: item.title || '私人美甲服务',
    technicianName: item.technicianName || '美甲师',
    dateText: isNaN(date.getTime()) ? '' : `${date.getMonth() + 1}月${date.getDate()}日`,
    photoCount: (item.imageUrls || []).length,
    coverUrl: item.coverUrl || '',
    photos: (item.imageUrls || []).map((url, index) => ({
      id: `order-${item.orderId}-${index}`,
      url,
      source: clientPhotos.includes(url) ? '我的照片' : '美甲师作品',
      orderId: item.orderId
    }))
  };
}

function resolveImageInfo(src) {
  return getImageInfo(src).catch(() => {
    if (!/^https?:\/\//.test(src)) return Promise.reject(new Error('local image unavailable'));
    return downloadImage(src).then(path => getImageInfo(path));
  });
}

function getImageInfo(src) {
  return new Promise((resolve, reject) => wx.getImageInfo({ src, success: resolve, fail: reject }));
}

function downloadImage(url) {
  return new Promise((resolve, reject) => wx.downloadFile({
    url,
    success: res => res.statusCode >= 200 && res.statusCode < 300 ? resolve(res.tempFilePath) : reject(res),
    fail: reject
  }));
}

function drawPhotoGrid(ctx, infos, overlay, transforms) {
  const gap = 8;
  const count = infos.length;
  const columns = count === 1 ? 1 : count === 2 ? 2 : count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / columns);
  const cellWidth = (520 - gap * (columns - 1)) / columns;
  const cellHeight = (560 - gap * (rows - 1)) / rows;
  infos.forEach((info, index) => {
    const x = 40 + (index % columns) * (cellWidth + gap);
    const y = 48 + Math.floor(index / columns) * (cellHeight + gap);
    const frame = coverRect(info.width, info.height, cellWidth, cellHeight);
    const transform = transforms[index] || defaultTransform();
    const scale = transform.scale / 100;
    const width = frame.width * scale;
    const height = frame.height * scale;
    const drawX = x + frame.x - (width - frame.width) / 2 + cellWidth * transform.offsetX / 100;
    const drawY = y + frame.y - (height - frame.height) / 2 + cellHeight * transform.offsetY / 100;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cellWidth, cellHeight);
    ctx.clip();
    ctx.drawImage(info.path, drawX, drawY, width, height);
    if (overlay) { ctx.setFillStyle(overlay); ctx.fillRect(x, y, cellWidth, cellHeight); }
    ctx.restore();
  });
}

function defaultTransform() { return { scale: 100, offsetX: 0, offsetY: 0 }; }

function adjustOverlay(overlay, intensity) {
  if (!overlay) return '';
  return overlay.replace(/rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)/, (value, red, green, blue, alpha) => {
    return `rgba(${red},${green},${blue},${Number(alpha) * Number(intensity || 0) / 100})`;
  });
}

function coverRect(sourceWidth, sourceHeight, boxWidth, boxHeight) {
  const scale = Math.max(boxWidth / sourceWidth, boxHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return { x: (boxWidth - width) / 2, y: (boxHeight - height) / 2, width, height };
}

function formatDate(date) { return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`; }
function formatPickerDate(date) { return formatDate(date).replace(/\./g, '-'); }

function buildShareCopies(template) {
  const moods = {
    magazine: { title: '把高级感藏进指尖', mood: '克制的色彩和细腻的光泽，让日常也有了画报感。' },
    life: { title: '今天的精致，从指尖开始', mood: '温柔、自然，又带一点刚刚好的闪耀。' },
    art: { title: '可以戴在指尖上的小型艺术展', mood: '颜色、线条和留白，记录属于自己的审美表达。' },
    festival: { title: '为重要时刻留下一点浪漫', mood: '仪式感不必盛大，指尖的细节就足够让今天特别。' }
  };
  const copy = moods[template] || moods.magazine;
  return {
    moments: `${copy.title}\n${copy.mood}\n\n我的美甲时刻 · LunaNails`,
    xiaohongshu: `${copy.title}｜近期美甲分享\n\n${copy.mood}\n这次选择了更耐看的低饱和表达，日常通勤和约会都很适合。\n\n#美甲分享 #高级感美甲 #私人美甲 #LunaNails`
  };
}

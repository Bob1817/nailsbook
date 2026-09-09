const api = require('../../../services/api');

Page({
  data: { works: [], selected: [], candidates: [], loading: true, loadFailed: false, saving: false, choosing: false, directReplace: false, replaceIndex: -1, targetId: 0, removeWorkId: 0 },
  onLoad(options) { this.setData({ targetId: Number(options && options.workId) || 0, removeWorkId: Number(options && options.removeWorkId) || 0 }); },
  onShow() { this.load(); },
  async load() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const [all, current] = await Promise.all([api.technician.works.list(), api.technician.works.heroRecommendations()]);
      const works = (Array.isArray(all) ? all : (all.list || all.data || [])).filter(w => w.isVisible && w.visibilityScope === 'public' && w.publicationStatus === 'approved' && !w.archivedAt && w.coverUrl);
      this.setData({ works, selected: current.works || [] });
      if (this.data.removeWorkId) {
        this.confirmRemoveTarget();
        return;
      }
      const target = works.find(w => Number(w.id) === this.data.targetId);
      if (target) {
        const selectedIds = this.data.selected.map(w => Number(w.id));
        if (selectedIds.includes(Number(target.id))) {
          this.setData({ targetId: 0 });
          wx.showToast({ title: '该作品已在首页推荐中', icon: 'none' });
        } else if (this.data.selected.length < 3) {
          await this.save([...selectedIds, Number(target.id)]);
        } else {
          this.setData({ choosing: true, directReplace: true, candidates: this.data.selected, replaceIndex: -1 });
        }
      }
    } catch (error) { this.setData({ loadFailed: true }); }
    finally { this.setData({ loading: false }); }
  },
  confirmRemoveTarget() {
    const id = Number(this.data.removeWorkId);
    const work = this.data.selected.find(item => Number(item.id) === id);
    if (!work) {
      this.setData({ removeWorkId: 0 });
      wx.showToast({ title: '该作品未设置客户首页推荐', icon: 'none' });
      return;
    }
    wx.showModal({ title: '取消客户首页推荐', content: `取消后，“${work.title || '未命名作品'}”不再参与客户首页展示。`, confirmText: '确认取消', success: res => {
      if (res.confirm) this.save(this.data.selected.filter(item => Number(item.id) !== id).map(item => Number(item.id)));
      else this.setData({ removeWorkId: 0 });
    } });
  },
  choose(e) {
    if (this.data.saving) return;
    const replaceIndex = e.currentTarget.dataset.index == null ? -1 : Number(e.currentTarget.dataset.index);
    const selectedIds = this.data.selected.map(w => Number(w.id));
    const target = this.data.works.find(w => Number(w.id) === this.data.targetId && !selectedIds.includes(Number(w.id)));
    this.setData({ choosing: true, directReplace: false, replaceIndex, candidates: target ? [target] : this.data.works.filter(w => !selectedIds.includes(Number(w.id))) });
  },
  closeChooser() { if (!this.data.saving) this.setData({ choosing: false, directReplace: false, targetId: 0 }); },
  async selectWork(e) {
    if (this.data.saving) return;
    const id = Number(e.currentTarget.dataset.id);
    const work = this.data.candidates.find(w => Number(w.id) === id);
    if (!work) return;
    if (this.data.directReplace) {
      const target = this.data.works.find(w => Number(w.id) === Number(this.data.targetId));
      const replaceIndex = this.data.selected.findIndex(w => Number(w.id) === id);
      if (!target || replaceIndex < 0) return;
      wx.showModal({ title: '替换首页推荐', content: `将“${work.title || '未命名作品'}”替换为“${target.title || '未命名作品'}”？`, success: async res => {
        if (!res.confirm || this.data.saving) return;
        const ids = this.data.selected.map(w => Number(w.id));
        ids[replaceIndex] = Number(target.id);
        await this.save(ids);
      } });
      return;
    }
    const old = this.data.selected[this.data.replaceIndex];
    wx.showModal({ title: old ? '替换首页推荐' : '推荐到客户首页', content: old ? `将“${old.title || '未命名作品'}”替换为“${work.title || '未命名作品'}”？` : `推荐“${work.title || '未命名作品'}”到已绑定客户的首页？`, success: async res => {
      if (!res.confirm || this.data.saving) return;
      const ids = this.data.selected.map(w => Number(w.id));
      if (old) ids[this.data.replaceIndex] = id; else ids.push(id);
      await this.save(ids);
    } });
  },
  remove(e) {
    if (this.data.saving) return;
    const id = Number(e.currentTarget.dataset.id);
    wx.showModal({ title: '取消首页推荐', content: '取消后，该作品不再参与客户首页轮播。个人主页精选保持原有设置。', success: res => {
      if (res.confirm) this.save(this.data.selected.filter(w => Number(w.id) !== id).map(w => Number(w.id)));
    } });
  },
  move(e) {
    if (this.data.saving) return;
    const index = Number(e.currentTarget.dataset.index), to = index + Number(e.currentTarget.dataset.direction);
    const ids = this.data.selected.map(w => Number(w.id));
    if (to < 0 || to >= ids.length) return;
    [ids[index], ids[to]] = [ids[to], ids[index]];
    this.save(ids);
  },
  async save(ids) {
    if (this.data.saving) return;
    this.setData({ saving: true });
    try {
      const result = await api.technician.works.saveHeroRecommendations(ids, this.data.selected.map(w => Number(w.id)));
      this.setData({ selected: result.works, choosing: false, directReplace: false, targetId: 0, removeWorkId: 0 });
      wx.showToast({ title: '首页推荐已更新', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: error.message || '保存失败，原推荐未改变', icon: 'none' });
      // Reload authoritative slots after a concurrent edit or an uncertain response.
      try { const result = await api.technician.works.heroRecommendations(); this.setData({ selected: result.works, choosing: false }); } catch (_) {}
    } finally { this.setData({ saving: false }); }
  },
  goWorks() { wx.navigateTo({ url: '/pages/technician/works/index' }); },
  noop() {}
});

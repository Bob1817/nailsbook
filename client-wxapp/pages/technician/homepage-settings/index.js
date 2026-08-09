const api = require('../../../services/api');

Page({
  data: { name: '', avatarUrl: '', bio: '', city: '', serviceArea: '', saving: false, works: [], worksLoading: true },
  async onLoad() {
    const user = wx.getStorageSync('technician_userInfo') || wx.getStorageSync('userInfo') || {};
    this.setData({ name:user.name || '', avatarUrl:user.avatarUrl || '', bio:user.bio || '', city:user.city || '', serviceArea:user.serviceArea || '' });
    try {
      const res = await api.technician.works.list();
      const works = (res.list || res.data || res || []).filter((item) => item.isVisible && (item.visibilityScope || 'public') === 'public').map((item) => ({
        id: item.id,
        title: item.title || '未命名作品',
        coverUrl: item.coverUrl || (item.imageUrls && item.imageUrls[0]) || '',
        selected: !!item.isFeatured,
      }));
      this.setData({ works });
    } catch (err) {
      wx.showToast({ title: err.message || '作品加载失败', icon: 'none' });
    } finally { this.setData({ worksLoading: false }); }
  },
  onInput(e) { this.setData({ [e.currentTarget.dataset.field]: e.detail.value }); },
  onCityChange(e) { const v=e.detail.value; this.setData({ city:v[0]===v[1]?v[1]:v[0]+' '+v[1] }); },
  onServiceAreaChange(e) { const v=e.detail.value; this.setData({ serviceArea:v[0]===v[1]?v[1]+' '+v[2]:v.join(' ') }); },
  chooseAvatar() {
    wx.chooseMedia({ count:1, mediaType:['image'], success:async(res) => {
      wx.showLoading({ title:'上传中' });
      try { const uploaded=await api.upload.image(res.tempFiles[0].tempFilePath,'technician'); this.setData({ avatarUrl:uploaded.url }); }
      catch (err) { wx.showToast({ title:err.message || '上传失败', icon:'none' }); }
      finally { wx.hideLoading(); }
    }});
  },
  async toggleHomepageWork(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.works.find((work) => String(work.id) === String(id));
    if (!item) return;
    const selectedCount = this.data.works.filter((work) => work.selected).length;
    if (!item.selected && selectedCount >= 6) return wx.showToast({ title:'主页最多精选 6 个作品', icon:'none' });
    try {
      await api.technician.works.toggleFeatured(id);
      this.setData({ works: this.data.works.map((work) => String(work.id) === String(id) ? { ...work, selected: !work.selected } : work) });
    } catch (err) { wx.showToast({ title:err.message || '设置失败', icon:'none' }); }
  },
  goWorks() { wx.navigateTo({ url:'/pages/technician/works/index' }); },
  async save() {
    if (this.data.saving) return;
    if (!this.data.name.trim()) return wx.showToast({ title:'请输入主页名称', icon:'none' });
    this.setData({ saving:true });
    try {
      const payload={ name:this.data.name.trim(), avatarUrl:this.data.avatarUrl, bio:this.data.bio.trim(), city:this.data.city, serviceArea:this.data.serviceArea };
      await api.technician.auth.updateProfile(payload);
      const user=wx.getStorageSync('technician_userInfo') || wx.getStorageSync('userInfo') || {};
      Object.assign(user,payload); wx.setStorageSync('technician_userInfo',user); wx.setStorageSync('userInfo',user);
      wx.showToast({ title:'主页已更新', icon:'success' });
    } catch (err) { wx.showToast({ title:err.message || '保存失败', icon:'none' }); }
    finally { this.setData({ saving:false }); }
  }
});

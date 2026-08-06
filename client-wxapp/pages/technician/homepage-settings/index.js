const api = require('../../../services/api');

Page({
  data: { name: '', avatarUrl: '', bio: '', city: '', serviceArea: '', saving: false },
  onLoad() {
    const user = wx.getStorageSync('technician_userInfo') || wx.getStorageSync('userInfo') || {};
    this.setData({ name:user.name || '', avatarUrl:user.avatarUrl || '', bio:user.bio || '', city:user.city || '', serviceArea:user.serviceArea || '' });
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

const api = require('../../../services/api');
const { syncSessionAvatar } = require('../../../utils/avatar');

Page({
  data: {
    name: '',
    phone: '',
    avatarUrl: '',
    bio: '',
    socialMedia: {},
    wechat: '',
    wechatQrCodeUrl: '',
    protectWechat: false,
    qrUploading: false,
    uploading: false,
    saving: false,

    // 城市：显示文本 + picker codes（供回显）
    cityDisplay: '',
    cityRegion: [],

    // 服务区域：显示文本 + picker codes（供回显）
    // 初始值来自注册/引导时填写的 userInfo.serviceArea
    serviceAreaDisplay: '',
    serviceAreaRegion: []
  },

  onLoad() {
    this._pageActive = true;
    const userInfo = wx.getStorageSync('userInfo') || wx.getStorageSync('technician_userInfo') || {};
    const socialMedia = (userInfo.socialMedia && typeof userInfo.socialMedia === 'object') ? userInfo.socialMedia : {};
    this.setData({
      name: userInfo.name || '',
      phone: userInfo.phone || '',
      avatarUrl: userInfo.avatarUrl || '',
      bio: userInfo.bio || '',
      socialMedia,
      wechat: socialMedia.wechat || userInfo.wechat || '',
      wechatQrCodeUrl: socialMedia.wechatQrCodeUrl || userInfo.wechatQrCodeUrl || '',
      protectWechat: socialMedia.protectWechat !== undefined ? !!socialMedia.protectWechat : !!userInfo.protectWechat,
      cityDisplay: userInfo.city || '',
      cityRegion: userInfo.cityRegion || [],
      serviceAreaDisplay: userInfo.serviceArea || '',
      serviceAreaRegion: userInfo.serviceAreaRegion || []
    });
  },

  onShow() {
    this._pageActive = true;
    if (this._uploadFinishedWhileHidden || this._saveFinishedWhileHidden) {
      this.setData({ uploading: false, saving: false });
      this._uploadFinishedWhileHidden = false;
      this._saveFinishedWhileHidden = false;
    }
  },
  onHide() { this._pageActive = false; },
  onUnload() {
    this._pageActive = false;
    if (this._navTimer) clearTimeout(this._navTimer);
  },

  onNameInput(e) { this.setData({ name: e.detail.value }); },
  onBioInput(e)  { this.setData({ bio: e.detail.value }); },
  onWechatInput(e) { this.setData({ wechat: e.detail.value }); },
  onProtectWechatChange(e) { this.setData({ protectWechat: e.detail.value }); },

  chooseWechatQrCode() {
    if (this.data.qrUploading) return;
    const onSelected = async (res) => {
      const file = res && res.tempFiles && res.tempFiles[0];
      const filePath = file && (file.tempFilePath || file.path);
      if (!filePath) return;
      this.setData({ qrUploading: true });
      try {
        const uploadRes = await api.upload.image(filePath, 'technician');
        if (this._pageActive) this.setData({ wechatQrCodeUrl: uploadRes.url });
      } catch (err) {
        if (this._pageActive) wx.showToast({ title: err.message || '微信二维码上传失败', icon: 'none' });
      } finally {
        if (this._pageActive) this.setData({ qrUploading: false });
      }
    };
    const options = { count: 1, mediaType: ['image'], sourceType: ['album'], sizeType: ['compressed'], success: onSelected };
    if (typeof wx.chooseMedia === 'function') wx.chooseMedia(options);
    else wx.chooseImage({ count: 1, sourceType: ['album'], sizeType: ['compressed'], success: res => onSelected({ tempFiles: (res.tempFilePaths || []).map(tempFilePath => ({ tempFilePath })) }) });
  },

  removeWechatQrCode() { this.setData({ wechatQrCodeUrl: '' }); },

  // 城市：选省 + 市，拼接显示文本（直辖市去重省名）
  onCityChange(e) {
    const val = e.detail.value; // ['广东省','深圳市','南山区']
    const display = val[0] === val[1] ? val[1] : `${val[0]} ${val[1]}`;
    this.setData({ cityDisplay: display, cityRegion: val });
  },

  // 服务区域：选到区县级，拼接显示文本
  onServiceAreaChange(e) {
    const val = e.detail.value; // ['广东省','深圳市','南山区']
    // 直辖市只显示 市+区，否则显示 省+市+区
    const display = val[0] === val[1]
      ? `${val[1]} ${val[2]}`
      : `${val[0]} ${val[1]} ${val[2]}`;
    this.setData({ serviceAreaDisplay: display, serviceAreaRegion: val });
  },

  chooseAvatar() {
    if (this.data.uploading) return;
    const onSelected = async (res) => {
      const file = res && res.tempFiles && res.tempFiles[0];
      const filePath = file && (file.tempFilePath || file.path);
      if (!filePath) return wx.showToast({ title:'未能读取所选图片', icon:'none' });
      this.setData({ uploading:true });
      try {
        const uploadRes = await api.upload.image(filePath, 'technician');
        if (!this._pageActive) { this._uploadFinishedWhileHidden = true; return; }
        this.setData({ avatarUrl:uploadRes.url });
      } catch (err) {
        if (!this._pageActive) { this._uploadFinishedWhileHidden = true; return; }
        wx.showToast({ title:err.message || '头像上传失败', icon:'none' });
      } finally {
        if (this._pageActive) this.setData({ uploading:false });
        else this._uploadFinishedWhileHidden = true;
      }
    };
    const onChooseFail = (err) => {
      if (!String(err && err.errMsg || '').includes('cancel')) {
        wx.showToast({ title:'无法打开图片选择器', icon:'none' });
      }
    };
    if (typeof wx.chooseMedia === 'function') {
      wx.chooseMedia({ count:1, mediaType:['image'], sourceType:['album','camera'], sizeType:['compressed'], success:onSelected, fail:onChooseFail });
      return;
    }
    wx.chooseImage({ count:1, sourceType:['album','camera'], sizeType:['compressed'], success:(res) => onSelected({ tempFiles:(res.tempFilePaths || []).map((path) => ({ tempFilePath:path })) }), fail:onChooseFail });
  },

  async saveProfile() {
    if (this.data.saving) return;
    const { name, avatarUrl, cityDisplay, cityRegion, serviceAreaDisplay, serviceAreaRegion, bio, wechat, wechatQrCodeUrl, protectWechat, socialMedia } = this.data;
    if (!name.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });

    try {
      const updatedSocialMedia = {
        ...socialMedia,
        wechat: wechat.trim(),
        wechatQrCodeUrl,
        protectWechat: !!protectWechat
      };
      await api.technician.auth.updateProfile({
        name, avatarUrl,
        city: cityDisplay,
        serviceArea: serviceAreaDisplay,
        bio,
        socialMedia: updatedSocialMedia
      });
      wx.hideLoading();
      if (!this._pageActive) return;

      const userInfo = wx.getStorageSync('userInfo') || {};
      Object.assign(userInfo, {
        name, avatarUrl,
        city: cityDisplay, cityRegion,
        serviceArea: serviceAreaDisplay, serviceAreaRegion,
        bio,
        socialMedia: updatedSocialMedia,
        wechat: wechat.trim(),
        wechatQrCodeUrl,
        protectWechat: !!protectWechat
      });
      wx.setStorageSync('userInfo', userInfo);
      wx.setStorageSync('technician_userInfo', userInfo);
      syncSessionAvatar('technician', avatarUrl);

      wx.showToast({ title: '保存成功', icon: 'success' });
      this._navTimer = setTimeout(() => {
        if (this._pageActive) wx.navigateBack();
      }, 1200);
    } catch (err) {
      wx.hideLoading();
      if (!this._pageActive) return;
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      if (this._pageActive) this.setData({ saving: false });
      else this._saveFinishedWhileHidden = true;
    }
  }
});

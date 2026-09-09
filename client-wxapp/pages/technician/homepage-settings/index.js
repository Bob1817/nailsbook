const api = require('../../../services/api');
const { syncSessionAvatar } = require('../../../utils/avatar');
const SPECIALTY_OPTIONS = ['韩系温柔风', '轻奢法式', '简约日式', '高级手绘', '氛围感晕染', '新中式', '婚礼美甲', '极简风', '甜酷风', '问题甲护理'];

Page({
  data: {
    technicianId:'', name:'', avatarUrl:'', bio:'', city:'', serviceArea:'', saving:false,
    heroImageUrl:'', tagline:'', experienceYears:1, specialties:[], selectedSpecialtyMap:{}, specialtyOptions:SPECIALTY_OPTIONS, certificationTitle:'',
    artistIntroduction:'', aestheticPhilosophy:'', publicationStatus:'draft', environmentPhotos:[], faqs:[],
    shareTitle:'', shareDescription:'', shareCoverUrl:'', transportationNotes:'', hygieneStandards:'',
    materialStandards:'', allergyNotice:'', latePolicy:'', cancellationPolicy:'', aftercarePolicy:'',
    featuredReviewIds:[], reviews:[], works:[], worksLoading:true, heroUploading:false
  },
  async onLoad(options) {
    this._targetSection=(options && options.section) || 'profile';
    const user = wx.getStorageSync('technician_userInfo') || wx.getStorageSync('userInfo') || {};
    this.setData({ technicianId:user.id || '', name:user.name || '', avatarUrl:user.avatarUrl || '', bio:user.bio || '', city:user.city || '', serviceArea:user.serviceArea || '' });
    try {
      const results = await Promise.all([
        api.technician.works.list(),
        api.technician.brandProfile.get().catch(() => ({})),
        user.id ? api.public.brands.reviews(user.id,{page:1,pageSize:20}).catch(() => ({items:[]})) : Promise.resolve({items:[]})
      ]);
      const res = results[0];
      const brand = results[1] || {};
      const works = (res.list || res.data || res || []).filter((item) => item.isVisible && (item.visibilityScope || 'public') === 'public').map((item) => ({
        id: item.id,
        title: item.title || '未命名作品',
        coverUrl: item.coverUrl || (item.imageUrls && item.imageUrls[0]) || '',
        selected: !!item.isFeatured,
      }));
      const featuredReviewIds = Array.isArray(brand.featuredReviewIds) ? brand.featuredReviewIds.map(String) : [];
      const styleTags = (user.styleTags || brand.specialties || []).slice(0, 5);
      this.setData({
        works,
        heroImageUrl:brand.heroImageUrl || brand.shareCoverUrl || '', tagline:brand.tagline || '',
        experienceYears:Math.min(30, Math.max(1, Number(brand.experienceYears) || 1)),
        specialties:styleTags,
        selectedSpecialtyMap:styleTags.reduce((map,item)=>{map[item]=true;return map;},{}),
        certificationTitle:brand.certificationTitle || '',
        artistIntroduction:brand.artistIntroduction || user.bio || '', aestheticPhilosophy:brand.aestheticPhilosophy || '',
        publicationStatus:brand.publicationStatus || 'draft', environmentPhotos:brand.environmentPhotos || [], faqs:brand.faqs || [],
        shareTitle:brand.shareTitle || '', shareDescription:brand.shareDescription || '', shareCoverUrl:brand.shareCoverUrl || '',
        transportationNotes:brand.transportationNotes || '', hygieneStandards:brand.hygieneStandards || '', materialStandards:brand.materialStandards || '',
        allergyNotice:brand.allergyNotice || '', latePolicy:brand.latePolicy || '', cancellationPolicy:brand.cancellationPolicy || '', aftercarePolicy:brand.aftercarePolicy || '',
        featuredReviewIds,
        reviews:(results[2].items || []).map((review) => ({ ...review, selected:featuredReviewIds.indexOf(String(review.id)) !== -1 }))
      });
    } catch (err) {
      wx.showToast({ title: err.message || '作品加载失败', icon: 'none' });
    } finally {
      this.setData({ worksLoading: false });
      const topMap={hero:0,profile:330,styles:650,introduction:900,service:1460,works:1850,reviews:2300};
      setTimeout(()=>wx.pageScrollTo({scrollTop:topMap[this._targetSection] || 0,duration:280}),180);
    }
  },
  onInput(e) { this.setData({ [e.currentTarget.dataset.field]: e.detail.value }); },
  onCityChange(e) { const v=e.detail.value; this.setData({ city:v[0]===v[1]?v[1]:v[0]+' '+v[1] }); },
  onServiceAreaChange(e) { const v=e.detail.value; this.setData({ serviceArea:v[0]===v[1]?v[1]+' '+v[2]:v.join(' ') }); },
  onExperienceChange(e) { this.setData({ experienceYears:Number(e.detail.value) || 1 }); },
  toggleSpecialty(e) {
    const value=e.currentTarget.dataset.value;
    const selected=this.data.specialties.slice();
    const index=selected.indexOf(value);
    if(index >= 0) selected.splice(index,1);
    else if(selected.length < 5) selected.push(value);
    else return wx.showToast({title:'最多展示 5 项擅长风格',icon:'none'});
    this.setData({ specialties:selected, selectedSpecialtyMap:selected.reduce((map,item)=>{map[item]=true;return map;},{}) });
  },
  chooseAvatar() {
    wx.chooseMedia({ count:1, mediaType:['image'], success:async(res) => {
      wx.showLoading({ title:'上传中' });
      try { const uploaded=await api.upload.image(res.tempFiles[0].tempFilePath,'technician'); this.setData({ avatarUrl:uploaded.url }); }
      catch (err) { wx.showToast({ title:err.message || '上传失败', icon:'none' }); }
      finally { wx.hideLoading(); }
    }});
  },
  chooseHero() {
    if (this.data.heroUploading) return;
    const onSelected = async (res) => {
      const filePath = res && res.tempFiles && res.tempFiles[0] && (res.tempFiles[0].tempFilePath || res.tempFiles[0].path);
      if (!filePath) return wx.showToast({ title:'未能读取所选图片', icon:'none' });
      this.setData({ heroUploading:true });
      wx.showLoading({ title:'上传中...' });
      try {
        const uploaded = await api.upload.image(filePath, 'technician');
        this.setData({ heroImageUrl:uploaded.url, shareCoverUrl:uploaded.url });
      } catch (err) {
        wx.showToast({ title:err.message || '背景图上传失败', icon:'none' });
      } finally {
        wx.hideLoading();
        this.setData({ heroUploading:false });
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
  toggleReview(e) {
    const id=String(e.currentTarget.dataset.id);
    let ids=this.data.featuredReviewIds.slice();
    const index=ids.indexOf(id);
    if(index >= 0) ids.splice(index,1); else if(ids.length < 3) ids.push(id); else return wx.showToast({title:'最多展示3条评论',icon:'none'});
    this.setData({ featuredReviewIds:ids, reviews:this.data.reviews.map((item)=>({ ...item, selected:ids.indexOf(String(item.id))!==-1 })) });
  },
  openSection(e) { const url=e.currentTarget.dataset.url; if(url) wx.navigateTo({url}); },
  togglePublication() { this.setData({ publicationStatus:this.data.publicationStatus === 'published' ? 'draft' : 'published' }); },
  preview() { if(this.data.technicianId) wx.navigateTo({url:'/pages/client/artist-home/index?id='+this.data.technicianId+'&preview=1&owner=1'}); },
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
  goHeroRecommendations() { wx.navigateTo({ url:'/pages/technician/hero-recommendations/index' }); },
  goWorks() { wx.navigateTo({ url:'/pages/technician/works/index' }); },
  async save() {
    if (this.data.saving || this.data.heroUploading) return;
    if (!this.data.name.trim()) return wx.showToast({ title:'请输入主页名称', icon:'none' });
    this.setData({ saving:true });
    try {
      const payload={ name:this.data.name.trim(), avatarUrl:this.data.avatarUrl, bio:(this.data.artistIntroduction || this.data.bio).trim(), city:this.data.city, serviceArea:this.data.serviceArea, styleTags:this.data.specialties.slice(0,5) };
      const brandPayload={
        brandName:payload.name, tagline:this.data.tagline.trim(), heroImageUrl:this.data.heroImageUrl,
        experienceYears:Number(this.data.experienceYears) || 1,
        specialties:this.data.specialties.slice(0,5),
        certificationTitle:this.data.certificationTitle.trim(), featuredReviewIds:this.data.featuredReviewIds.map(Number).filter(Boolean),
        city:this.data.city, publicServiceArea:this.data.serviceArea, artistIntroduction:(this.data.artistIntroduction || this.data.bio).trim(),
        aestheticPhilosophy:this.data.aestheticPhilosophy.trim(), transportationNotes:this.data.transportationNotes,
        hygieneStandards:this.data.hygieneStandards, materialStandards:this.data.materialStandards, allergyNotice:this.data.allergyNotice,
        latePolicy:this.data.latePolicy, cancellationPolicy:this.data.cancellationPolicy, aftercarePolicy:this.data.aftercarePolicy,
        shareTitle:this.data.shareTitle || payload.name, shareDescription:this.data.shareDescription || this.data.tagline,
        shareCoverUrl:this.data.shareCoverUrl || this.data.heroImageUrl, publicationStatus:this.data.publicationStatus,
        environmentPhotos:this.data.environmentPhotos, faqs:this.data.faqs
      };
      await Promise.all([api.technician.auth.updateProfile(payload),api.technician.brandProfile.update(brandPayload)]);
      const user=wx.getStorageSync('technician_userInfo') || wx.getStorageSync('userInfo') || {};
      Object.assign(user,payload); wx.setStorageSync('technician_userInfo',user); wx.setStorageSync('userInfo',user);
      syncSessionAvatar('technician', payload.avatarUrl);
      wx.showToast({ title:'主页已更新', icon:'success' });
    } catch (err) { wx.showToast({ title:err.message || '保存失败', icon:'none' }); }
    finally { this.setData({ saving:false }); }
  }
});

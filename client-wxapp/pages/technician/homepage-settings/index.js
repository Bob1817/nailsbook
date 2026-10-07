const api = require('../../../services/api');
const { syncSessionAvatar } = require('../../../utils/avatar');
const SPECIALTY_OPTIONS = ['韩系温柔风', '轻奢法式', '简约日式', '高级手绘', '氛围感晕染', '新中式', '婚礼美甲', '极简风', '甜酷风', '问题甲护理'];
const RULE_TEMPLATE = Object.freeze({
  hygieneStandards:'每位顾客服务前后都会清洁操作台面；可重复使用的工具按流程完成清洁与消毒，直接接触皮肤的一次性耗材原则上单客使用。',
  materialStandards:'使用正规渠道采购的美甲产品与耗材。服务开始前会沟通所用产品和操作步骤，如有特殊需求可提前说明。',
  allergyNotice:'如有皮肤敏感、过敏史、甲面损伤或其他需要注意的情况，请在预约前主动告知；服务过程中如有不适，请立即提出并暂停操作。',
  latePolicy:'如可能迟到，请尽早联系说明。迟到 15 分钟以内将根据当天排期尽量保留服务；超过 15 分钟可能需要缩短项目、调整款式或另行改期。',
  cancellationPolicy:'如需取消或改期，请尽量提前 24 小时联系。临时变更将根据当天排期协商处理，已产生的定制材料或其他实际费用另行沟通。',
  aftercarePolicy:'服务完成后请按护理建议使用双手并避免长时间接触刺激性物质。如在约定保障期内出现非人为开裂或脱落，请及时联系并提供照片，确认情况后安排补修。'
});

Page({
  data: {
    technicianId:'', name:'', avatarUrl:'', bio:'', city:'', serviceArea:'', saving:false,
    heroImageUrl:'', tagline:'', experienceYears:1, specialties:[], selectedSpecialtyMap:{}, specialtyOptions:SPECIALTY_OPTIONS, certificationTitle:'',
    artistIntroduction:'', aestheticPhilosophy:'', publicationStatus:'draft', faqs:[],
    exclusiveServiceNote:'', privacyNote:'', serviceProcess:[], timeline:[],
    shops:[], featuredShopKey:'', featuredShopName:'',
    shareTitle:'', shareDescription:'', shareCoverUrl:'', transportationNotes:'', hygieneStandards:'',
    materialStandards:'', allergyNotice:'', latePolicy:'', cancellationPolicy:'', aftercarePolicy:'',
    featuredReviewIds:[], reviews:[], services:[], featuredServiceIds:[], works:[], worksLoading:true, heroUploading:false
  },
  async onLoad(options) {
    this._targetSection=(options && options.section) || 'profile';
    const user = wx.getStorageSync('technician_userInfo') || wx.getStorageSync('userInfo') || {};
    this.setData({ technicianId:user.id || '', name:user.name || '', avatarUrl:user.avatarUrl || '', bio:user.bio || '', city:user.city || '', serviceArea:user.serviceArea || '' });
    try {
      const results = await Promise.all([
        api.technician.works.list(),
        api.technician.brandProfile.get().catch(() => ({})),
        user.id ? api.public.brands.reviews(user.id,{page:1,pageSize:20}).catch(() => ({items:[]})) : Promise.resolve({items:[]}),
        api.technician.auth.getUserInfo().catch(() => user),
        api.technician.services.list().catch(() => [])
      ]);
      const res = results[0];
      const brand = results[1] || {};
      const profile = results[3] || user || {};
      const serviceItems = (Array.isArray(results[4]) ? results[4] : ((results[4] && results[4].data) || []))
        .filter((item) => item.isBookable !== false && !item.archivedAt)
        .map((item) => {
          const priceText = formatServicePrice(item);
          const durationText = item.durationMinutes ? `${item.durationMinutes} 分钟` : '';
          return {
            id: String(item.publicId || item.id),
            name: item.name || '未命名服务',
            metaText: [priceText, durationText].filter(Boolean).join(' · ')
          };
        });
      const featuredServiceIds = Array.isArray(brand.featuredServiceIds)
        ? brand.featuredServiceIds.map(String)
        : [];
      const services = serviceItems.map((item) => ({
        ...item,
        selected: featuredServiceIds.indexOf(item.id) !== -1
      }));
      const shops = (profile.shopAddresses || []).map((shop) => ({
        key: `${shop.name || ''}||${shop.detailAddress || ''}`,
        name: shop.name || '未命名店铺',
        address: shop.detailAddress || '',
        enabled: shop.enabled !== false,
        photoCount: Array.isArray(shop.photos) ? shop.photos.filter(Boolean).length : 0
      }));
      const featuredShopKey = brand.featuredShopKey || '';
      const featuredShopName = (shops.find((s) => s.key === featuredShopKey) || {}).name || '';
      const works = (res.list || res.data || res || []).filter((item) => item.isVisible && (item.visibilityScope || 'public') === 'public').map((item) => ({
        id: item.id,
        title: item.title || '未命名作品',
        coverUrl: item.coverUrl || (item.imageUrls && item.imageUrls[0]) || '',
        selected: !!item.isFeatured,
      }));
      const featuredReviewIds = Array.isArray(brand.featuredReviewIds) ? brand.featuredReviewIds.map(String) : [];
      const styleTags = (user.styleTags || brand.specialties || []).slice(0, 5);
      const ruleValues = {};
      Object.keys(RULE_TEMPLATE).forEach((field) => {
        ruleValues[field] = brand[field] || (!brand.id ? RULE_TEMPLATE[field] : '');
      });
      this.setData({
        works,
        heroImageUrl:brand.heroImageUrl || brand.shareCoverUrl || '', tagline:brand.tagline || '',
        experienceYears:Number(brand.experienceYears) > 0 ? Math.min(30, Number(brand.experienceYears)) : 0,
        specialties:styleTags,
        selectedSpecialtyMap:styleTags.reduce((map,item)=>{map[item]=true;return map;},{}),
        certificationTitle:brand.certificationTitle || '',
        artistIntroduction:brand.artistIntroduction || user.bio || '', aestheticPhilosophy:brand.aestheticPhilosophy || '',
        publicationStatus:brand.publicationStatus || 'draft', faqs:brand.faqs || [],
        exclusiveServiceNote:brand.exclusiveServiceNote || '', privacyNote:brand.privacyNote || '',
        serviceProcess:Array.isArray(brand.serviceProcess) ? brand.serviceProcess : [],
        timeline:Array.isArray(brand.timeline) ? brand.timeline : [],
        shops,
        featuredShopKey,
        featuredShopName,
        shareTitle:brand.shareTitle || '', shareDescription:brand.shareDescription || '', shareCoverUrl:brand.shareCoverUrl || '',
        transportationNotes:brand.transportationNotes || '',
        ...ruleValues,
        featuredReviewIds,
        services,
        featuredServiceIds,
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
  applyRuleTemplate() {
    const updates={};
    Object.keys(RULE_TEMPLATE).forEach((field) => {
      if (!String(this.data[field] || '').trim()) updates[field]=RULE_TEMPLATE[field];
    });
    if (!Object.keys(updates).length) return wx.showToast({ title:'当前规则内容已完整', icon:'none' });
    this.setData(updates);
    wx.showToast({ title:'已补全空白规则', icon:'success' });
  },
  onFeaturedShopChange(e) {
    const idx = Number(e.detail.value);
    const shop = this.data.shops[idx];
    this.setData({
      featuredShopKey: shop ? shop.key : '',
      featuredShopName: shop ? shop.name : ''
    });
  },
  onStoryListInput(e) {
    const { list, index, field } = e.currentTarget.dataset;
    const key = list === 'process' ? 'serviceProcess' : 'timeline';
    const items = (this.data[key] || []).map((item, i) => {
      if (i !== Number(index)) return item;
      return { ...item, [field]: e.detail.value };
    });
    this.setData({ [key]: items });
  },
  addStoryItem(e) {
    const list = e.currentTarget.dataset.list;
    const key = list === 'process' ? 'serviceProcess' : 'timeline';
    const items = (this.data[key] || []).slice();
    if (list === 'process') {
      if (items.length >= 6) return wx.showToast({ title: '最多 6 步流程', icon: 'none' });
      items.push({ step: items.length + 1, title: '', description: '' });
    } else {
      if (items.length >= 10) return wx.showToast({ title: '最多 10 条历程', icon: 'none' });
      items.push({ year: '', description: '' });
    }
    this.setData({ [key]: items });
  },
  removeStoryItem(e) {
    const { list, index } = e.currentTarget.dataset;
    const key = list === 'process' ? 'serviceProcess' : 'timeline';
    const items = (this.data[key] || []).filter((_, i) => i !== Number(index))
      .map((item, i) => list === 'process' ? { ...item, step: i + 1 } : item);
    this.setData({ [key]: items });
  },
  onCityChange(e) { const v=e.detail.value; this.setData({ city:v[0]===v[1]?v[1]:v[0]+' '+v[1] }); },
  onServiceAreaChange(e) { const v=e.detail.value; this.setData({ serviceArea:v[0]===v[1]?v[1]+' '+v[2]:v.join(' ') }); },
  onExperienceChange(e) { this.setData({ experienceYears:Number(e.detail.value) || 1 }); },
  enableExperience() { this.setData({ experienceYears:1 }); },
  clearExperience() { this.setData({ experienceYears:0 }); },
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
  toggleHomepageService(e) {
    const id=String(e.currentTarget.dataset.id);
    const ids=this.data.featuredServiceIds.slice();
    const index=ids.indexOf(id);
    if(index >= 0) ids.splice(index,1);
    else if(ids.length < 6) ids.push(id);
    else return wx.showToast({title:'主页最多展示 6 项服务',icon:'none'});
    this.setData({
      featuredServiceIds:ids,
      services:this.data.services.map((item)=>({ ...item, selected:ids.indexOf(item.id)!==-1 }))
    });
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
    this.setData({ saving:true });
    try {
      const profilePayload={};
      if (this.data.avatarUrl) profilePayload.avatarUrl=this.data.avatarUrl;
      const brandPayload={
        brandName:this.data.name.trim() || undefined, tagline:this.data.tagline.trim(), heroImageUrl:this.data.heroImageUrl || undefined,
        experienceYears:Number(this.data.experienceYears) || undefined,
        specialties:this.data.specialties.slice(0,5),
        certificationTitle:this.data.certificationTitle.trim(), featuredReviewIds:this.data.featuredReviewIds.map(Number).filter(Boolean),
        featuredServiceIds:this.data.featuredServiceIds,
        city:this.data.city, publicServiceArea:this.data.serviceArea, artistIntroduction:this.data.artistIntroduction.trim(),
        aestheticPhilosophy:this.data.aestheticPhilosophy.trim(), transportationNotes:this.data.transportationNotes,
        hygieneStandards:this.data.hygieneStandards, materialStandards:this.data.materialStandards, allergyNotice:this.data.allergyNotice,
        latePolicy:this.data.latePolicy, cancellationPolicy:this.data.cancellationPolicy, aftercarePolicy:this.data.aftercarePolicy,
        exclusiveServiceNote:this.data.exclusiveServiceNote, privacyNote:this.data.privacyNote,
        serviceProcess:this.data.serviceProcess.filter((item)=>String(item.title || '').trim() || String(item.description || '').trim()),
        timeline:this.data.timeline.filter((item)=>String(item.year || '').trim() || String(item.description || '').trim()),
        featuredShopKey:this.data.featuredShopKey,
        shareTitle:this.data.shareTitle || this.data.name.trim(), shareDescription:this.data.shareDescription || this.data.tagline,
        shareCoverUrl:this.data.shareCoverUrl || this.data.heroImageUrl || undefined, publicationStatus:this.data.publicationStatus,
        faqs:this.data.faqs
      };
      const updates=[api.technician.brandProfile.update(brandPayload)];
      if (Object.keys(profilePayload).length) updates.push(api.technician.auth.updateProfile(profilePayload));
      await Promise.all(updates);
      if (profilePayload.avatarUrl) {
        const user=wx.getStorageSync('technician_userInfo') || wx.getStorageSync('userInfo') || {};
        user.avatarUrl=profilePayload.avatarUrl;
        wx.setStorageSync('technician_userInfo',user); wx.setStorageSync('userInfo',user);
        syncSessionAvatar('technician', profilePayload.avatarUrl);
      }
      wx.showToast({ title:'主页已更新', icon:'success' });
    } catch (err) { wx.showToast({ title:err.message || '保存失败', icon:'none' }); }
    finally { this.setData({ saving:false }); }
  }
});

function formatServicePrice(service) {
  const min = service.priceMinFen != null ? Number(service.priceMinFen) / 100 : Number(service.price || 0);
  const max = service.priceMaxFen != null ? Number(service.priceMaxFen) / 100 : 0;
  if (service.priceType === 'range' && max > min) return `¥${min}–${max}`;
  return min > 0 ? `¥${min}起` : '到店沟通';
}

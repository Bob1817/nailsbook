const api=require('../../../services/api');
const {attributionFrom,getVisitorId}=require('../../../utils/conversion-tracking');
function id(){return `inquiry_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,10)}`;}
Page({
  data:{techName:'',workTitle:'',nickname:'',contact:'',requirement:'',budget:'',expectedDate:'',privacyAgreed:false,submitting:false,success:false},
  onLoad(options){this.techId=Number(options.techId);this.workId=Number(options.workId)||undefined;this.attribution=attributionFrom(options,'inquiry_form');this.submissionKey=id();this.setData({techName:options.techName||'美甲师',workTitle:options.workTitle||''});},
  input(e){this.setData({[e.currentTarget.dataset.field]:e.detail.value});},
  dateChange(e){this.setData({expectedDate:e.detail.value});},
  privacyChange(e){this.setData({privacyAgreed:e.detail.value.length>0});},
  async submit(){const d=this.data;if(d.submitting)return;if(!d.nickname.trim()||!d.contact.trim()||!d.requirement.trim())return wx.showToast({title:'请填写昵称、联系方式和需求',icon:'none'});if(!d.privacyAgreed)return wx.showToast({title:'请先同意隐私说明',icon:'none'});this.setData({submitting:true});try{await api.public.inquiries.submit({submissionKey:this.submissionKey,technicianId:this.techId,workId:this.workId,nickname:d.nickname.trim(),contact:d.contact.trim(),requirement:d.requirement.trim(),budget:d.budget.trim()||undefined,expectedDate:d.expectedDate||undefined,privacyAgreed:true,visitorId:getVisitorId(),...this.attribution});this.setData({submitting:false,success:true});}catch(e){this.setData({submitting:false});wx.showToast({title:(e&&e.message)||'提交失败，请稍后重试',icon:'none'});}},
  back(){wx.navigateBack();}
});

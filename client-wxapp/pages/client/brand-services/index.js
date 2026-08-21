const api = require('../../../services/api');
const { attributionFrom, trackConversion } = require('../../../utils/conversion-tracking');
function params(options) { return { ...attributionFrom(options,'brand_services'), imageSize: 'thumbnail' }; }
function priceText(price) { if (!price) return '请咨询'; return price.type === 'range' ? `¥${price.min}-¥${price.max}` : price.min == null ? '请咨询' : `¥${price.min}`; }
Page({
  data:{artistId:'',items:[],page:1,hasMore:true,loading:true,loadingMore:false,error:false},
  onLoad(options){this.options=options;this.query=params(options);this.setData({artistId:options.id||options.techId||''});trackConversion({technicianId:Number(options.id||options.techId),eventType:'price_view',...this.query,touchpoint:'brand_services'});this.load(true);},
  async load(reset){reset=reset===true||!!(reset&&reset.currentTarget);if(!this.data.artistId)return this.setData({loading:false,error:true});const page=reset?1:this.data.page;if(!reset&&!this.data.hasMore)return;this.setData(reset?{loading:true,error:false}:{loadingMore:true});try{const res=await api.public.brands.services(this.data.artistId,{...this.query,page,pageSize:20});const items=(res.items||[]).map(item=>({...item,priceText:priceText(item.price)}));this.setData({items:reset?items:this.data.items.concat(items),page:page+1,hasMore:res.pagination&&res.pagination.hasMore,loading:false,loadingMore:false,error:false});}catch(err){this.setData({loading:false,loadingMore:false,error:true});}},
  onReachBottom(){this.load(false);},
  book(e){trackConversion({technicianId:Number(this.data.artistId),eventType:'booking_click',...this.query,touchpoint:'brand_services'});const q={techId:this.data.artistId,serviceId:e.currentTarget.dataset.id,...this.query};wx.navigateTo({url:'/pages/client/create-order/index?'+Object.keys(q).filter(k=>q[k]).map(k=>`${k}=${encodeURIComponent(q[k])}`).join('&')});}
});

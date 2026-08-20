const api = require('../../../services/api');
const TABS = [{value:'all',label:'全部'},{value:'pending',label:'待支付'},{value:'completed',label:'已完成'},{value:'cancelled',label:'已取消'}];
const money = value => Number(value || 0).toFixed(2);
function decorate(item) {
  const booking = item.booking || {};
  return {
    ...item,
    _title: booking.customTitle || '美甲服务订单',
    _customer: booking.customer?.name || '客户',
    _total: money(item.totalAmount),
    _paid: money(item.paidAmount),
    _remaining: money(Math.max(0, Number(item.totalAmount)-Number(item.paidAmount))),
    _statusText: item.status === 'completed' ? '已完成' : item.status === 'cancelled' ? '已取消' : item.currentPayStage === 'deposit' ? '待客户支付定金' : '待客户支付尾款',
    _created: item.createdAt ? String(item.createdAt).slice(0,16).replace('T',' ') : ''
  };
}
Page({
  data:{tabs:TABS,active:'all',all:[],list:[],loading:true},
  onShow(){this.load();},
  async load(){
    this.setData({loading:true});
    try { const rows=await api.technician.orders.tradeList({}); const all=(Array.isArray(rows)?rows:rows.data||[]).map(decorate); this.setData({all,loading:false}); this.apply(this.data.active); }
    catch(error){this.setData({loading:false});wx.showToast({title:error.message||'订单加载失败',icon:'none'});}
  },
  switchTab(e){const active=e.currentTarget.dataset.value;this.setData({active});this.apply(active);},
  apply(active){this.setData({list:active==='all'?this.data.all:this.data.all.filter(item=>item.status===active)});},
  openOrder(e){wx.navigateTo({url:`/pages/technician/order-detail/index?id=${e.currentTarget.dataset.id}`});}
});

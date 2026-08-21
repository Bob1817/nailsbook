Page({data:{id:''},onLoad(o){this.setData({id:o.id||''});},orders(){wx.reLaunch({url:'/pages/client/orders/index'});},home(){wx.reLaunch({url:'/pages/client/home/index'});}});

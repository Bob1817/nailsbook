const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let choice, opened, modal, stored, back=0, saves=[];
const wx={ chooseLocation:opts=>{choice=opts;}, openLocation:opts=>{opened=opts;}, showToast(){}, showModal:opts=>{modal=opts;}, openSetting(){}, setClipboardData(){},
  setStorageSync:(key,value)=>{stored={key,value};}, navigateBack:()=>back++, showLoading(){}, hideLoading(){} };
const locationModule={ exports:{} };
vm.runInNewContext(read('pages/client/utils/location.js'),{module:locationModule,wx});
const location=locationModule.exports;
function page(file,api) {
  let config;
  const absolute=path.join(root,file);
  vm.runInNewContext(read(file),{ Page:p=>{config=p;}, require:name=>name.includes('services/api') ? api : name.endsWith('/location') ? location : createRequire(absolute)(name), wx,
    setTimeout:callback=>{callback();return 1;}, clearTimeout(){}, console });
  return {...config,data:JSON.parse(JSON.stringify(config.data)),setData(v,callback){Object.assign(this.data,v);if(callback)callback();}};
}
(async()=>{
  assert.equal(location.coordinates({latitude:'',longitude:''}),null);
  assert.equal(read('pages/client/utils/location.js'),read('pages/technician/utils/location.js'),'两端地图行为一致，并各自保留在分包内');
  assert.equal(location.coordinates({latitude:91,longitude:120}),null);
  assert.equal(location.coordinates({latitude:30,longitude:'bad'}),null);
  assert.equal(location.detailForRegion('浙江省杭州市西湖区测试路1号',['浙江省','杭州市','西湖区']),'测试路1号');
  const shops=[{name:'A',detailAddress:'测试路1号',latitude:30,longitude:120},{name:'B',detailAddress:'测试路2号',latitude:31,longitude:121}];
  assert.equal(location.matchingShop(shops,'测试路2号').name,'B');
  assert.equal(location.matchingShop(shops,'未知地址'),null,'不能把未知地址导航到第一家店');
  assert.equal(location.matchingShop([{...shops[0],detailAddress:''}],'未知地址'),null,'空地址不能匹配任意预约');
  assert.equal(location.matchingShop([shops[0],{...shops[0],name:'同地址另一家店'}],'测试路1号'),null,'有歧义时不猜测店铺');
  location.openLocation({...shops[1],address:'测试路2号'});
  assert.equal(opened.latitude,31);assert.equal(opened.longitude,121);
  opened.fail({errMsg:'openLocation:fail unavailable'});assert.equal(modal.confirmText,'复制地址','地图失败时保留可用的地址操作');
  opened=null;location.openLocation({address:'未标注的店铺'});
  assert.equal(opened,null);assert.equal(modal.confirmText,'复制地址');
  let selected=0;
  location.selectLocation({latitude:30,longitude:120},()=>selected++);
  assert.equal(choice.latitude,30,'重新选点从已保存位置打开');
  choice.fail({errMsg:'chooseLocation:fail cancel'});assert.equal(selected,0);
  choice.fail({errMsg:'chooseLocation:fail auth deny'});assert.equal(modal.confirmText,'去设置');
  const api={client:{addresses:{update:async(id,payload)=>{saves.push({id,payload});return{id,...payload};},create:async payload=>({id:3,...payload})}}};
  const editor=page('pages/client/address-edit/index.js',api);
  editor.onLoad({select:'1'});Object.assign(editor.data,{province:'浙江省',city:'杭州市',district:'西湖区',latitude:30,longitude:120,contactName:'客户',contactPhone:'13800000000',isEdit:true,addressId:8});
  editor.chooseMapLocation();editor.onHide();choice.success({latitude:30.1,longitude:120.1,name:'小区',address:'浙江省杭州市西湖区测试路1号'});choice.complete();editor.onShow();
  assert.equal(editor.data.detailAddress,'测试路1号');assert.equal(editor.data.latitude,30.1);
  await editor.handleSubmit();assert.equal(saves[0].id,8);assert.equal(stored.value.latitude,30.1,'预约编辑保存后回传同一地址记录');
  editor.onInput({currentTarget:{dataset:{field:'doorInfo'}},detail:{value:'2栋301'}});assert.equal(editor.data.latitude,30.1,'门牌号不会改变地图坐标');
  editor.onRegionChange({detail:{value:['浙江省','杭州市','滨江区']}});assert.equal(editor.data.latitude,null,'地理地址变更必须重新选点');
  assert.equal(editor.validate(),false,'无地图坐标不能保存为上门地址');
  const list=page('pages/client/addresses/index.js',{});list.onLoad({mode:'select'});
  list.data.addresses=[{id:1,latitude:30,longitude:120},{id:2,latitude:31,longitude:121}];stored=null;back=0;
  list.selectAddress({currentTarget:{dataset:{id:'2'}}});assert.equal(stored,null,'点选地址不立即提交');
  assert.equal(list.data.selectedAddressId,2);list.confirmAddress();assert.equal(stored.value.id,2);assert.equal(back,1);
  assert(read('pages/client/profile/index.wxml').includes('bindtap="navigateToAddresses"'));
  assert(read('pages/client/profile/index.js').includes("url:'/pages/client/addresses/index'"));
  assert(read('pages/client/create-order/index.js').includes("this.data.serviceType !== '上门美甲' || !this.isClientLoggedIn()"),'到店预约不调用客户地址');
  console.log('地址入口、地图坐标与取消/权限、地址更新回传、多地址显式确认及防串店导航检查通过');
})().catch(error=>{console.error(error);process.exitCode=1;});

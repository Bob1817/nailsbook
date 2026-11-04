const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=JSON.parse(read('app.json'));
const routes=[...app.pages,...app.subPackages.flatMap(pkg=>pkg.pages.map(page=>pkg.root+'/'+page))];
for(const route of ['pages/client/addresses/index','pages/client/address-edit/index']) assert(routes.includes(route),`${route}必须注册，保证实际可进入`);
function component(name,wx={}){
  let definition;
  vm.runInNewContext(read(`components/${name}/index.js`),{Component:c=>{definition=c;},wx});
  const data={...definition.data};
  Object.entries(definition.properties||{}).forEach(([key,value])=>{data[key]=value.value;});
  const events=[];
  return {definition,context:{...definition.methods,data,events,setData(values){Object.assign(this.data,values);},triggerEvent(name,detail){events.push({name,detail});}}};
}
let keyboard,removed,measured=0;
const wx={nextTick:fn=>fn(),onKeyboardHeightChange:fn=>{keyboard=fn;},offKeyboardHeightChange:fn=>{removed=fn;}};
const footer=component('bottom-action-bar',wx);
footer.context.createSelectorQuery=()=>({select:()=>({boundingClientRect:callback=>{measured++;callback({height:124});return{exec(){}};}})});
footer.definition.lifetimes.ready.call(footer.context);
assert.equal(footer.context.data.height,124,'占位使用实际测量高度，不用每页估算');
keyboard({height:280});assert.equal(footer.context.data.keyboardVisible,true);
const count=measured;footer.context.measure();assert.equal(measured,count,'键盘展开时保留已测量占位');
keyboard({height:0});assert.equal(footer.context.data.keyboardVisible,false);assert(measured>count);
footer.context.onPrimary();assert.equal(footer.context.events.length,1);
footer.context.data.loading=true;footer.context.onPrimary();footer.context.onSecondary();assert.equal(footer.context.events.length,1,'加载时两个操作都不可重复触发');
footer.definition.lifetimes.detached.call(footer.context);assert.equal(removed,keyboard,'离开页面释放键盘监听');
const inline=component('bottom-action-bar',wx);inline.context.data.fixed=false;inline.context._mounted=true;inline.context.measure();assert.equal(inline.context.data.height,0,'弹层内联模式不增加页面占位');
const address=component('address-card');address.context.data.address={id:8,isDefault:true};address.context.onDefault();assert.equal(address.context.events.length,0);
address.context.onSelect();assert.equal(address.context.events[0].detail.address.id,8);
address.context.data.disabled=true;address.context.onEdit();address.context.onRemove();assert.equal(address.context.events.length,1);
const location=component('location-field');location.context.data.loading=true;location.context.onChoose();assert.equal(location.context.events.length,0);location.context.data.loading=false;location.context.onChoose();assert.equal(location.context.events[0].name,'choose');
const field=component('form-field');field.context.onInput({detail:{value:'长地址测试'}});assert.equal(field.context.events[0].detail.value,'长地址测试');
field.context.data.disabled=true;field.context.onAction();assert.equal(field.context.events.length,1,'字段禁用时尾部操作同步禁用');
assert(read('components/form-field/index.wxml').includes('slot name="control"'),'原生选择器接入同一字段容器');
assert(read('components/action-button/index.wxml').includes('catchtap="onTap"'),'内部原生 tap 不重复冒泡到业务处理');
assert(read('components/action-button/index.wxss').includes('.action-button.is-compact'));
const loading=component('state-card');const observer=loading.definition.observers['type, icon, title, description, actionText'];observer.call(loading.context,'loading','','','','');assert.equal(loading.context.data.displayActionText,'');assert.equal(loading.context.data.resolvedIcon,'');
for(const page of ['pages/client/addresses','pages/client/address-edit','pages/technician/service-forms','pages/technician/shop-management']){
  const markup=read(`${page}/index.wxml`),config=JSON.parse(read(`${page}/index.json`));
  assert(markup.includes('<bottom-action-bar') && config.usingComponents['bottom-action-bar'],`${page}统一底部操作`);
  assert(!markup.includes('<input'),`${page}不再逐页手写输入框`);
  if(page.includes('addresses')) assert(markup.includes('<state-card') && markup.includes('<address-card'));
  else assert(markup.includes('<form-field') && markup.includes('<location-field'),`${page}复用字段与地图结构`);
}
for(const page of ['pages/client/create-order','pages/client/quote-booking']){
  assert(read(`${page}/index.wxml`).includes('<address-card'),`${page}复用同一地址摘要`);
  assert(JSON.parse(read(`${page}/index.json`)).usingComponents['address-card']);
}
const layoutCss=read('components/address-card/index.wxss');assert(layoutCss.includes('overflow-wrap:anywhere')&&layoutCss.includes('flex-wrap:wrap'),'长地址、长姓名和窄屏允许自然换行');
const footerCss=read('components/bottom-action-bar/index.wxss');assert(footerCss.includes('safe-area-inset-bottom')&&footerCss.includes('is-keyboard-visible'));
console.log('Airbnb 地址设计系统：6 页组件接入、事件隔离、动态底栏、键盘清理和长内容契约通过');

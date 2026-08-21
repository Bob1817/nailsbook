const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const homeJs=read('pages/client/artist-home/index.js');const homeWxml=read('pages/client/artist-home/index.wxml');const homeCss=read('pages/client/artist-home/index.wxss');const app=read('app.json');
['api.public.brands.profile','api.public.brands.services','api.public.brands.works','api.public.brands.reviews','api.public.brands.availability','consultArtist','bookArtist','campaign','content'].forEach(token=>{if(!homeJs.includes(token))throw new Error(`public home missing ${token}`);});
['服务与价格','精选作品','真实评价','常见问题','先咨询','立即预约','lazy-load'].forEach(token=>{if(!homeWxml.includes(token))throw new Error(`public home missing ${token}`);});
if(!homeCss.includes('env(safe-area-inset-bottom)'))throw new Error('fixed CTA must respect safe area');
if(!app.includes('pages/client/brand-services/index')||!app.includes('pages/client/brand-works/index'))throw new Error('public detail pages not registered');
['pages/client/brand-services/index.wxml','pages/client/brand-works/index.wxml'].forEach(file=>{const text=read(file);if(!text.includes('重新加载')||!text.includes('暂无'))throw new Error(`${file} missing error/empty state`);});
console.log('Public brand experience checks passed.');

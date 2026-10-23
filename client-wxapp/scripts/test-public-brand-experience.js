const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const homeJs=read('pages/client/artist-home/index.js');const homeWxml=read('pages/client/artist-home/index.wxml');const homeCss=read('pages/client/artist-home/index.wxss');
['api.public.brands.profile','api.public.brands.works','api.public.brands.comments','bookArtist'].forEach(token=>{if(!homeJs.includes(token))throw new Error(`public home missing ${token}`);});
['简介','履历','店铺','精选作品','精选评论','发起预约','lazy-load'].forEach(token=>{if(!homeWxml.includes(token))throw new Error(`public home missing ${token}`);});
if(!homeCss.includes('env(safe-area-inset-bottom)'))throw new Error('fixed CTA must respect safe area');
console.log('Public brand experience checks passed.');

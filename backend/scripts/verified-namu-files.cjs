'use strict';
// Verified file names visible in NamuWiki team roster/file indexes (2026/2025).
// Rejects generic og:image and any image whose alt text doesn't match the file.
const axios=require('axios');
const FILES={
 'T1:Doran':['T1_Doran_2025_Split_2.jpg','2025_T1_Doran.jpg'],
 'T1:Faker':['T1_Faker_2026_Split_1.webp','T1_Faker_2025_Split_2.jpg','2025_T1_Faker.jpg'],
 'T1:Keria':['T1_Keria_2025_Split_2.jpg','2025_T1_Keria.jpg'],
 'T1:Oner':['T1_Oner_2025_Split_2.jpg','2025_T1_Oner.jpg'],
 'T1:Peyz':['T1_Peyz_2026_LCKCup.webp','T1_Peyz_2025.jpg'],
 'TLAW:CoreJJ':['TL_CoreJJ_2026_Split_1.webp'],
 'TLAW:Josedeodo':['TL_Josedeodo_2026_Split_1.webp'],
 'TLAW:Morgan':['TL_Morgan_2026_Split_1.webp'],
 'TLAW:Quid':['TL_Quid_2026_Split_1.webp'],
 'TLAW:Yeon':['TL_Yeon_2026_Split_1.webp']
};
const HOSTS=new Set(['i.namu.wiki','file.namu.moe','d.namu.moe','www.namu.moe','namu.moe']);
const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9\p{L}\p{N}]/gu,'');
const decode=s=>String(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"')
  .replace(/&#39;|&apos;/g,"'");
function attrs(tag){
 const out={};
 for(const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))
  out[m[1].toLowerCase()]=decode(m[2]??m[3]);
 return out;
}
async function findNamuFilePhoto(name,team){
 const filenames=FILES[team+':'+name];
 if(!filenames)return {error:'NO_VERIFIED_NAMU_FILE'};
 let error='NAMU_FILE_NOT_RETRIEVABLE';
 for(const filename of filenames){
  for(const base of ['https://www.namu.moe/w/','https://d.namu.moe/w/']){
   const page=base+encodeURIComponent('파일:'+filename);
   let html;
   try{
    const r=await axios.get(page,{
     timeout:9000,maxRedirects:2,maxContentLength:4*1024*1024,
     headers:{'User-Agent':'Mozilla/5.0','Accept':'text/html'}
    });
    html=String(r.data);
   }catch(e){error='NAMU_PAGE_'+String(e.response?.status||e.code||'UNAVAILABLE');continue;}
   for(const tag of html.match(/<img\b[^>]*>/gi)||[]){
    const a=attrs(tag);
    const alt=a.alt||a.title||'';
    if(!norm(alt).includes(norm(filename)))continue;
    const src=a['data-src']||a.src||a['data-original'];
    if(!src)continue;
    try{
     const u=new URL(src,page);
     if(u.protocol!=='https:'||!HOSTS.has(u.hostname))continue;
     if(!/^(\/i\/|\/file\/)/.test(u.pathname))continue;
     if(u.hostname.endsWith('namu.moe')&&u.pathname.startsWith('/file/'))
      u.hostname='file.namu.moe';
     return {page,portrait:{url:u.toString(),alt:filename},origin:'namuwiki'};
    }catch{}
   }
   error='NAMU_MATCHING_IMAGE_ELEMENT_NOT_FOUND';
  }
 }
 return {error};
}
module.exports={findNamuFilePhoto};

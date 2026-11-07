#!/usr/bin/env node
'use strict';
// Inspect publicly served official esports roster HTML for the exact zekas
// image. Does not alter user data or save copyrighted photos.
const axios=require('axios');
const fs=require('node:fs/promises');
const endpoints=[
'https://lolesports.com/en-US/teams/vivo-keyd',
'https://lolesports.com/en-US/teams/vivo-keyd/',
'https://www.namu.moe/w/'+encodeURIComponent('세자르 프란사')
];
async function run(){
 const notes=[];
 const norm=s=>String(s).replace(/\\u([0-9a-fA-F]{4})/g,(_,hex)=>String.fromCharCode(parseInt(hex,16)));
 for(const target of endpoints){
  try{
   const r=await axios.get(target,{timeout:17000,maxContentLength:6e6,
    headers:{'User-Agent':'Mozilla/5.0','Accept':'text/html'}});
   const s=String(r.data);
   notes.push('URL '+target+' status='+r.status+' bytes='+s.length);
   for(const keyword of ['zekas','ZekaS','CESAR FRAN','César França','VKS_Zekas_2026_Split_1.webp']){
    const index=s.toLowerCase().indexOf(keyword.toLowerCase());
    notes.push('keyword '+keyword+' first index '+index);
    if(index>=0)notes.push(norm(s.slice(Math.max(0,index-900),Math.min(s.length,index+1500))));
   }
   const images=(s.match(/<img\b[^>]*>/gi)||[]).filter(tag=>/zekas|c[eé]sar|fran[cç]a|vks/i.test(tag));
   notes.push('named image tags '+images.length+' '+images.slice(0,12).join('\n'));
  }catch(e){notes.push('FAILED '+target+' '+String(e.response?.status||e.code||e.message));}
 }
 await fs.writeFile('zekas-source-inspection.txt',notes.join('\n\n'),'utf8');
 console.log(notes.map(s=>s.slice(0,1100)).join('\n'));
}
run().catch(e=>{console.error(e);process.exitCode=1;});

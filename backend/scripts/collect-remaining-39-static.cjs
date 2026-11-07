#!/usr/bin/env node
// Build a portable photo pack for only the 39 unresolved 2026 players.
// No production database credentials needed; photos come from exact team/player
// filename matches and the verified NamuWiki file list, never fuzzy faces.
// Run on Node 20 with "sharp" installed next to the backend script.
'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const axios=require('axios');
const sharp=require('sharp');
const {findLeaguepediaPhoto,allowed:leaguepediaHost}=require('./leaguepedia-source.cjs');
const {findNamuFilePhoto}=require('./verified-namu-files.cjs');
const players=require('./remaining-39-player-portraits.cjs');
const outDir=path.resolve(__dirname,'../../frontend/public/players');
const reportPath=path.resolve(__dirname,'../../remaining-39-photo-sources.csv');
// Independently verified portraits for players lacking a matching wiki file.
const verifiedPortraits={
 'DSG:KryRa':[{
   page:'https://www.sheepesports.com/en/lol/articles/dsg-kryra-today-could-be-a-reality-check-for-me-which-will-help-i-will-learn-a-lot-from-this/en',
   url:'https://cdn.sanity.io/images/9rqbl8zs/production/e2031673a364c71ea9879b05fc6dbace01892040-1920x1080.webp'
 }],
 'FUR:Jojo':[{
   page:'https://x.com/jojooolol',
   url:'https://pbs.twimg.com/profile_images/1935471276065251328/GTC_zHkt_400x400.jpg'
 }],
 'LNG:Sheer':[{
   page:'https://lol.fandom.com/wiki/Sheer',
   url:'https://cdn-api.pandascore.co/images/player/image/51648/fpx_sheer_2025_split_1.png'
 }],
 'VKS:zekas':[{
   page:'https://lolesports.com/en-US/teams/vivo-keyd',
   url:'https://am-a.akamaihd.net/image?resize=750:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1785142363013_VKS_Zekas-1copy.png'
 }],
 'LR:Thebausffs':[{
   page:'https://liquipedia.net/leagueoflegends/Thebausffs',
   url:'https://liquipedia.net/commons/images/b/ba/Thebausffs_LEC2021.jpg'
 },{
   page:'https://www.sheepesports.com/articles/lr-thebausffs-we-didn-t-start-los-ratones-just-to-have-fun-we-made-it-to-win-everything/en',
   url:'https://cdn.sanity.io/images/9rqbl8zs/production/de9200bdaf520b765543771281ab25b6d1450268-1920x1080.webp'
 }]
};
const exactExternalUrls=new Set(Object.values(verifiedPortraits).flatMap(v=>v.map(x=>x.url)));
const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
const sleep=n=>new Promise(r=>setTimeout(r,n));
const namuHost=u=>{
 try{
  const url=new URL(u);
  return url.protocol==='https:' &&
   ['i.namu.wiki','file.namu.moe'].includes(url.hostname);
 }catch{return false;}
};
async function download(url){
 if(!leaguepediaHost(url)&&!namuHost(url)&&!exactExternalUrls.has(url))throw Error('UNTRUSTED_IMAGE_HOST');
 const r=await axios.get(url,{responseType:'arraybuffer',
  maxContentLength:5242880,timeout:18000,maxRedirects:2,
  headers:{'User-Agent':'Mozilla/5.0','Referer':
   leaguepediaHost(url)?'https://lol.fandom.com/':
   url.startsWith('https://liquipedia.net/')?'https://liquipedia.net/':
   url.startsWith('https://cdn-api.pandascore.co/')?'https://pandascore.co/':
   url.startsWith('https://am-a.akamaihd.net/')?'https://lolesports.com/':
   'https://www.namu.moe/'}
 });
 const b=Buffer.from(r.data);
 if(b.length>5242880||b.length<1500)throw Error('PHOTO_EMPTY_OR_OVERSIZE');
 const meta=await sharp(b).metadata();
 if(!['jpeg','png','webp'].includes(String(meta.format))||
    Number(meta.width)<160||Number(meta.height)<160)
   throw Error('PHOTO_FORMAT_OR_DIMENSIONS');
 return sharp(b).resize({width:900,height:900,fit:'inside',
  withoutEnlargement:true}).png({compressionLevel:8}).toBuffer();
}
async function run(){
 let saved=0,existing=0,missing=0,failed=0;
 const lines=[['team','player','status','source_page','image_url','note']];
 const prior=new Map();
 try{
  const previous=await fs.readFile(reportPath,'utf8');
  for(const line of previous.trim().split('\n').slice(1)){
   const m=line.match(/^"([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)"/);
   if(m)prior.set(m[1]+'|'+m[2],m);
  }
 }catch{};
 for(const p of players){
  const name=String(p.name).replace(/[^\p{L}\p{N} _-]/gu,'').trim();
  const names=['26_'+name+'.png','26WR_'+name+'.png','26WRs_'+name+'.png'];
  let already=true;
  for(const file of names)try{await fs.access(path.join(outDir,file));}catch{already=false;}
  if(already){
   existing++;
   const old=prior.get(p.team+'|'+p.name);
   lines.push([p.team,p.name,'EXISTING',(old?.[4]||'').replace(/File%3AFile%3A/i,'File%3A'),old?.[5]||'','']);
   continue;
  }
  let found=await findLeaguepediaPhoto(p.name,p.team);
  if(found.error){
   const fallback=await findNamuFilePhoto(p.name,p.team);
   if(!fallback.error)found=fallback;
  }
  if(found.error&&verifiedPortraits[p.team+':'+p.name]){
   const options=verifiedPortraits[p.team+':'+p.name];
   found={page:options[0].page,portrait:{url:options[0].url},alternatives:options};
  }
  if(found.error){
   missing++;
   console.log('MISSING '+p.team+' / '+p.name+' '+found.error);
   lines.push([p.team,p.name,'MISSING','','',found.error]);
   continue;
  }
  try{
   const attempts=found.alternatives||[{page:found.page,url:found.portrait.url}];
   let png=null,lastFailure=null;
   for(const option of attempts){
    try{
     png=await download(option.url);
     found.page=option.page;
     found.portrait.url=option.url;
     break;
    }catch(e){lastFailure=e;}
   }
   if(!png)throw lastFailure||new Error('PHOTO_DOWNLOAD_UNAVAILABLE');
   await fs.mkdir(outDir,{recursive:true});
   for(const file of names){
    const destination=path.join(outDir,file);
    try{await fs.writeFile(destination,png,{flag:'wx'});}
    catch(e){if(e.code!=='EEXIST')throw e;}
   }
   saved++;
   console.log('COLLECTED '+p.team+' / '+p.name+' '+found.page);
   lines.push([p.team,p.name,'COLLECTED',found.page,found.portrait.url,'']);
  }catch(e){
   failed++;
   console.log('FAILED '+p.team+' / '+p.name+' '+String(e.message).slice(0,90));
   lines.push([p.team,p.name,'FAILED',found.page,found.portrait.url,e.message]);
  }
  await sleep(350);
 }
 await fs.writeFile(reportPath,lines.map(row=>row.map(quote).join(',')).join('\n')+'\n');
 console.log(JSON.stringify({total:players.length,collected:saved,existing,missing,failed,
  report:reportPath},null,2));
}
run().catch(e=>{console.error(e);process.exitCode=1;});

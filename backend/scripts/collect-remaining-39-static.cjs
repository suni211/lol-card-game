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
 if(!leaguepediaHost(url)&&!namuHost(url))throw Error('UNTRUSTED_IMAGE_HOST');
 const r=await axios.get(url,{responseType:'arraybuffer',
  maxContentLength:5242880,timeout:18000,maxRedirects:2,
  headers:{'User-Agent':'Mozilla/5.0','Referer':
   leaguepediaHost(url)?'https://lol.fandom.com/':'https://www.namu.moe/'}
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
 for(const p of players){
  const name=String(p.name).replace(/[^\p{L}\p{N} _-]/gu,'').trim();
  const names=['26_'+name+'.png','26WR_'+name+'.png','26WRs_'+name+'.png'];
  let already=true;
  for(const file of names)try{await fs.access(path.join(outDir,file));}catch{already=false;}
  if(already){existing++;lines.push([p.team,p.name,'EXISTING','','','']);continue;}
  let found=await findLeaguepediaPhoto(p.name,p.team);
  if(found.error){
   const fallback=await findNamuFilePhoto(p.name,p.team);
   if(!fallback.error)found=fallback;
  }
  if(found.error){
   missing++;
   console.log('MISSING '+p.team+' / '+p.name+' '+found.error);
   lines.push([p.team,p.name,'MISSING','','',found.error]);
   continue;
  }
  try{
   const png=await download(found.portrait.url);
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

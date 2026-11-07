'use strict';
// Discover an exact player portrait by current TEAM + gamer tag.
// Sources: Leaguepedia file metadata and previous-season photos of the
// SAME team/player. No nickname-only matching and no cross-player guesses.
const axios=require('axios');
const {URL}=require('node:url');
const API='https://lol.fandom.com/api.php';
const UA='Mozilla/5.0 (compatible; LCG-Player-Image-Lookup/2.0)';
const clean=x=>String(x||'').normalize('NFKC').toLowerCase()
  .replace(/[^a-z0-9\p{L}\p{N}]/gu,'');
const teamAliases={
 'GEN.G':['GEN','GEN.G'], 'GEN':['GEN'], 'TES':['TES'],
 'MKOI':['MKOI','KOI'], 'KC':['KC'], 'BFX':['BFX'],
 'DNS':['DNS'], 'BRO':['BRO'], 'NS':['NS'], 'C9':['C9'],
 'KRX':['DRX','KRX'], 'TLAW':['TL','TLAW'],
 'NAVI':['NAVI'], 'FUR':['FUR'], 'PAIN':['PNG','PAIN'],
 'LR':['LR'], 'VKS':['VKS'], 'SR':['SR']
};
const aliasByIdentity={
 'NAVI:Hans SamD':['SamD','Hans SamD'],
 'DIG:IgNar':['IgNar','Ignar'],
 'LR:Thebausffs':['Thebausffs','TheBausffs'],
 'KRX:Ucal':['UCal','Ucal'],
 'PAIN:Cariok':['CarioK','Cariok'],
 'VKS:zekas':['zekas','Zekas'],
 'VKS:scamber':['scamber','Scamber'],
 'FX:cody':['cody','Cody'],
 'LGD:ycx':['ycx','Ycx']
};
function allowed(value){
 try{
  const url=new URL(value);
  return url.protocol==='https:'&&(
    url.hostname==='static.wikia.nocookie.net'||
    url.hostname==='images.wikia.com'||
    url.hostname.endsWith('.wikia.nocookie.net')
  );
 }catch{return false;}
}
async function api(params){
 const result=await axios.get(API,{
  timeout:18000,maxRedirects:2,params:{action:'query',format:'json',...params},
  headers:{'User-Agent':UA,'Accept':'application/json'}
 });
 return result.data;
}
function mediaValid(info){
 return info&&allowed(info.url)&&
  (!info.mime||['image/png','image/jpeg','image/webp'].includes(info.mime))&&
  (!info.size||Number(info.size)<=5242880)&&
  (!info.width||info.width>=160)&&(!info.height||info.height>=160);
}
function imgScore(name,code,gamer){
 const namePart=String(name||'').replace(/^File:/i,'')
    .replace(/\.(png|jpe?g|webp)$/i,'');
 const whole=clean(namePart),prefix=clean(code+' '+gamer);
 if(!whole.startsWith(prefix))return -1;
 const tail=whole.slice(prefix.length);
 // Exclude nicknames prefixed by other players (e.g. "FBI" and "FBIA").
 if(tail&&!/^(?:20(?:2[0-6]|1\d)|split|lck|worlds|msi|cup|season|player|profile|portrait|photo|image|$)/.test(tail))
   return -1;
 if(/logo|icon|teamlogo|banner|flag|signature|placeholder|staff|coach/i.test(tail))return -1;
 const year=/2026/.test(tail)?200:/2025/.test(tail)?150:/2024/.test(tail)?110:
   /2023/.test(tail)?75:/2022/.test(tail)?45:/2027|2028|2029/.test(tail)?-1:20;
 if(year<0)return -1;
 return year+(/split[123]/i.test(tail)?15:0)+(/worlds/i.test(tail)?11:0)+
  (/lckcup|lckkickoff/i.test(tail)?12:0)+
  (/portrait|profile|player/i.test(tail)?5:0);
}
function choose(files,codes,names){
 const matched=[];
 for(const file of files){
  const info=file.imageinfo?.[0]||file;
  if(!mediaValid(info))continue;
  const title=String(file.title||file.name||'');
  let best=-1;
  for(const c of codes)for(const n of names){
   best=Math.max(best,imgScore(title,c,n));
  }
  if(best<0)continue;
  matched.push({title,info,score:best});
 }
 // All candidates already passed the strict TEAM+gamer filename prefix.
 // Different seasonal portraits of that same identity are safe to rank.
 matched.sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title));
 return matched[0]||null;
}
async function exact2026(codes,names){
 const titles=[];
 for(const code of codes)for(const gamer of names){
  for(const label of ['2026 Split 3','2026 Split 2','2026 Split 1','2026 Worlds',
     '2026 LCK Cup','2026 LCKCup','2025 Split 2','2025 Split 1']){
   for(const ext of ['png','webp','jpg']){
    titles.push('File:'+code+' '+gamer+' '+label+'.'+ext);
   }
  }
 }
 const found=[];
 for(let start=0;start<titles.length;start+=45){
  const response=await api({prop:'imageinfo',iiprop:'url|mime|size|dimensions',
    titles:titles.slice(start,start+45).join('|')});
  const pages=Object.values(response?.query?.pages||{});
  found.push(...pages.filter(p=>p&&p.pageid>0&&p.imageinfo?.length));
 }
 return found;
}
async function allImages(codes,names){
 const found=[];
 for(const code of codes){
  for(const gamer of names){
   const response=await api({list:'allimages',aiprefix:code+' '+gamer,
     ailimit:'100',aiprop:'url|mime|size|dimensions'});
   const records=response?.query?.allimages;
   if(!Array.isArray(records))throw Error('LEAGUEPEDIA_ALLIMAGES_UNAVAILABLE');
   found.push(...records);
  }
 }
 return found;
}
async function findLeaguepediaPhoto(name,team){
 const codes=(teamAliases[team]||[team]).slice(0,3);
 const names=(aliasByIdentity[team+':'+name]||[name]).slice(0,3);
 let files=[],failure='';
 // API exact query is already verified to work for most existing 2026 photos.
 try{
  const titleList=[];
  for(const code of codes)for(const gamer of names){
   for(const label of ['2026 Split 3','2026 Split 2','2026 Split 1','2026 Worlds']){
    titleList.push('File:'+code+' '+gamer+' '+label+'.png');
   }
  }
  for(let i=0;i<titleList.length;i+=45){
   const result=await api({prop:'imageinfo',iiprop:'url|mime|size|dimensions',
     titles:titleList.slice(i,i+45).join('|')});
   files.push(...Object.values(result?.query?.pages||{}).filter(p=>p&&p.pageid>0&&p.imageinfo?.length));
  }
  let best=choose(files,codes,names);
  if(best?.info)return {page:'https://lol.fandom.com/wiki/'+
    encodeURIComponent(best.title.replace(/ /g,'_')),
    portrait:{url:best.info.url,alt:best.title},origin:'leaguepedia'};
  // Filename-index lookup searches historical years, JPG and WebP as well.
  let indexed=[];
  try {indexed=await allImages(codes,names);}
  catch(e) {
    // Some Fandom instances disable the allimages listing. Exact file
    // lookups remain available and should continue even in that case.
    console.warn('Leaguepedia photo index unavailable for '+team+' '+name+': '+
      String(e.response?.status||e.code||e.message));
  }
  best=choose(indexed,codes,names);
  if(best?.info)return {page:'https://lol.fandom.com/wiki/'+
    encodeURIComponent(('File:'+best.title).replace(/ /g,'_')),
    portrait:{url:best.info.url,alt:best.title},origin:'leaguepedia'};
  if(best?.error)return {error:best.error,sourceError:false};
  // Try known JPG/WebP and 2025 file title variants even when the index fails.
  const exact=await exact2026(codes,names);
  best=choose(exact,codes,names);
  if(best?.info)return {page:'https://lol.fandom.com/wiki/'+
    encodeURIComponent(best.title.replace(/ /g,'_')),
    portrait:{url:best.info.url,alt:best.title},origin:'leaguepedia'};
  return {error:'EXACT_TEAM_PLAYER_PORTRAIT_NOT_FOUND',sourceError:false};
 }catch(e){
  failure=String(e.response?.status||e.code||e.message||'FETCH_FAILED');
  // Already fetched image metadata still wins if the fallback source fails.
  const best=choose(files,codes,names);
  if(best?.info)return {page:'https://lol.fandom.com/wiki/'+
    encodeURIComponent(best.title.replace(/ /g,'_')),
    portrait:{url:best.info.url,alt:best.title},origin:'leaguepedia'};
  return {error:'PHOTO_INDEX_UNAVAILABLE_'+failure,sourceError:true};
 }
}
module.exports={findLeaguepediaPhoto,allowed};

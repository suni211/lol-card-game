'use strict';
// Exact 2026 team+nickname portraits on Leaguepedia (MediaWiki/Fandom).
// Do not infer a portrait from a nickname alone. Rights remain with the owner.
const axios=require('axios');
const CDN=['static.wikia.nocookie.net','images.wikia.com'];
const clean=x=>String(x||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9\p{L}\p{N}]/gu,'');
const teamAliases={
  'GEN.G':['GEN','GEN.G'], 'GEN':['GEN'],
  'TES':['TES'], 'TOP ESPORTS':['TES'],
  'MKOI':['MKOI','KOI'], 'KC':['KC'],
  'BFX':['BFX'], 'DNS':['DNS'], 'BRO':['BRO'],
  'NS':['NS'], 'C9':['C9'], 'KRX':['KRX']
};
function allowed(url){
  try {
    const u=new URL(url);
    return u.protocol==='https:' &&
      (CDN.includes(u.hostname) || u.hostname.endsWith('.wikia.nocookie.net'));
  }catch{return false;}
}
async function findLeaguepediaPhoto(name,team){
  const titles=[];
  for(const code of (teamAliases[team]||[team]).slice(0,2)){
    for(const split of [3,2,1]){
      titles.push('File:'+code+' '+name+' 2026 Split '+split+'.png');
    }
    titles.push('File:'+code+' '+name+' 2026 Worlds.png');
  }
  let response;
  try {
    response=await axios.get('https://lol.fandom.com/api.php',{
      timeout:15000,maxRedirects:2,
      params:{action:'query',format:'json',prop:'imageinfo',
        iiprop:'url|mime|size',titles:titles.join('|')},
      headers:{'User-Agent':'Mozilla/5.0 (compatible; LCG-Player-Image-Lookup/1.1)',
        'Accept':'application/json'}
    });
  }catch(e){
    return {error:'LEAGUEPEDIA_UNAVAILABLE_'+String(e.response?.status||e.code||e.message),
      sourceError:true};
  }
  const pages=response.data?.query?.pages;
  if(!pages||typeof pages!=='object')return {error:'LEAGUEPEDIA_BAD_RESPONSE',sourceError:true};
  const values=Object.values(pages).filter(p=>p&&p.pageid>0&&p.imageinfo?.length);
  for(const title of titles){
    const p=values.find(page=>clean(page.title)===clean(title));
    if(!p)continue;
    const info=p.imageinfo[0];
    if(info.mime && !['image/png','image/jpeg','image/webp'].includes(info.mime))continue;
    if(info.size&&Number(info.size)>5242880)continue;
    if(!allowed(info.url))continue;
    return {
      page:'https://lol.fandom.com/wiki/'+encodeURIComponent(p.title.replace(/ /g,'_')),
      portrait:{url:info.url,alt:p.title},
      origin:'leaguepedia'
    };
  }
  return {error:'2026_TEAM_PLAYER_IMAGE_NOT_FOUND',sourceError:false};
}
module.exports={findLeaguepediaPhoto,allowed};

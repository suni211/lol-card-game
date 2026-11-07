#!/usr/bin/env node
// 2026 NamuWiki photo importer. Uses name + team matching; never overwrites
// existing photographs. Does not circumvent website access restrictions.
// npm run portraits:namu -- --apply
'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const axios=require('axios');
const mysql=require('mysql2/promise');
const {findLeaguepediaPhoto,allowed:leaguepediaImageHost}=require('./leaguepedia-source.cjs');
require('dotenv').config({path:path.resolve(__dirname,'../.env')});
const APPLY=process.argv.includes('--apply');
const OVERWRITE=process.argv.includes('--overwrite');
const NAMU_FALLBACK=process.argv.includes('--namu-fallback');
const ONLY_REMAINING=process.argv.includes('--remaining-39');
const remainingSet=new Set(require('./remaining-39-player-portraits.cjs')
  .map(p=>String(p.team).toLowerCase()+'|'+String(p.name).toLowerCase()));
const nameFlag=process.argv.find(a=>a.startsWith('--player='));
const teamFlag=process.argv.find(a=>a.startsWith('--team='));
const maxFlag=process.argv.find(a=>a.startsWith('--limit='));
const LIMIT=maxFlag?Math.max(1,Math.min(1000,parseInt(maxFlag.split('=')[1],10)||1000)):1000;
const clean=t=>String(t||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9\p{L}\p{N}]/gu,'');
const csv=s=>'"'+String(s??'').replace(/"/g,'""')+'"';
const pause=t=>new Promise(resolve=>setTimeout(resolve,t));
const photoHosts=new Set(['file.namu.moe','d.namu.moe','namu.moe','www.namu.moe','i.namu.wiki']);
const sources=['https://d.namu.moe/w/','https://www.namu.moe/w/','https://namu.moe/w/'];
const UA='Mozilla/5.0 (compatible; LCG-portrait-photo-index/1.0)';
const teamNames={
  'GEN.G':['Gen.G','젠지'], 'T1':['티원','SKT'], 'HLE':['한화생명','Hanwha Life'],
  'NS':['농심 레드포스','Nongshim RedForce'],
  'BFX':['BNK FEARX','피어엑스'], 'BRO':['브리온','BRION'],
  'DNS':['DN SOOPers','디엔 수퍼스'], 'KRX':['Kwangdong','광동 프릭스'],
  'C9':['Cloud9','클라우드나인'], 'G2':['G2 Esports'],
  'JDG':['JD Gaming','징동'], 'BLG':['Bilibili Gaming'],
  'MKOI':['Movistar KOI'], 'KC':['Karmine Corp'],
  'T1':['티원','SK Telecom','SKT'],
  'KT':['KT Rolster','KT 롤스터']
};
function fileExt(b) {
  if(b.length<12||b.length>5*1024*1024)return null;
  if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';
  if(b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP')return 'webp';
  if(b[0]===255&&b[1]===216&&b[b.length-2]===255&&b[b.length-1]===217)return 'jpg';
  return null;
}
function htmlDecode(s) {
  return String(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"')
    .replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}
function attributes(tag){
  const data={};
  for(const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    data[m[1].toLowerCase()]=htmlDecode(m[2]??m[3]);
  }
  return data;
}
function candidatePortraits(html,pageUrl,name,team) {
  const tags=html.match(/<img\b[^>]*>/gi)||[];
  const candidates=[];
  for(let i=0;i<tags.length;i++){
    const attrs=attributes(tags[i]);
    const alt=String(attrs.alt||attrs.title||'');
    let u;
    try{u=new URL(attrs['data-src']||attrs.src||'',pageUrl);}catch{continue;}
    // Mirror markup can use /file/<sha>, while the actual binary is served
    // by file.namu.moe (as linked from the rendered Namu mirror).
    if(u.pathname.startsWith('/file/') && u.hostname.endsWith('namu.moe')){
      u.hostname='file.namu.moe';
    }
    if(u.protocol!=='https:'||!photoHosts.has(u.hostname)||!/^\/(file|i)\//.test(u.pathname))continue;
    if(/로고|국기|아이콘|logo|flag|icon|emblem|mark|서명|우승컵|트로피|스폰서|포지션|워드마크/i.test(alt))continue;
    const named=clean(alt).includes(clean(name));
    const portrait=/선수|프로필|portrait|profile|증명/i.test(alt);
    const season=/2026|26_lck|26lck/i.test(alt);
    const teamMatched=clean(alt).includes(clean(team));
    const score=(named?10:0)+(portrait?4:0)+(season?7:0)+(teamMatched?3:0)-Math.floor(i/30);
    if(score>=10)candidates.push({url:u.toString(),alt,score});
  }
  return candidates.sort((a,b)=>b.score-a.score);
}
function teamMention(html,team) {
  const body=clean(html.slice(0,180000).replace(/<[^>]*>/g,' '));
  return [team,...(teamNames[team]||[])].some(v=>clean(v).length>=3&&body.includes(clean(v)));
}
async function findPhoto(name,team) {
  let failure='NOT_FOUND';
  for(const title of [name,name+'(프로게이머)',name+'(리그 오브 레전드)']){
    for(const base of sources){
      const url=base+encodeURIComponent(title);
      let response;
      try{
        response=await axios.get(url,{timeout:11000,maxRedirects:3,maxContentLength:4*1024*1024,
          headers:{'User-Agent':UA,'Accept':'text/html,*/*'},validateStatus:s=>s>=200&&s<300});
      }catch(e){failure=String(e.response?.status||e.code||e.message);continue;}
      const html=String(response.data);
      if(!/리그 오브 레전드|League of Legends|프로게이머|e스포츠/i.test(html.slice(0,180000))){
        failure='NOT_PLAYER_PAGE';continue;
      }
      if(!clean(html).includes(clean(name))){failure='NAME_MISMATCH';continue;}
      if(!teamMention(html,team)){failure='TEAM_NOT_CONFIRMED';continue;}
      const candidates=candidatePortraits(html,response.request?.res?.responseUrl||url,name,team);
      if(!candidates.length){failure='NO_PORTRAIT';continue;}
      if(candidates.length>1&&candidates[0].score===candidates[1].score&&
        candidates[0].url!==candidates[1].url){failure='AMBIGUOUS_PORTRAITS';continue;}
      return {page:url,portrait:candidates[0]};
    }
  }
  return {error:failure};
}
async function downloadPhoto(source){
  const parsed=new URL(source);
  if(!((photoHosts.has(parsed.hostname)&&parsed.protocol==='https:')||leaguepediaImageHost(source)))throw Error('BAD_IMAGE_HOST');
  const response=await axios.get(source,{responseType:'arraybuffer',maxContentLength:5*1024*1024,
    timeout:16000,maxRedirects:2,headers:{'User-Agent':UA,'Referer':leaguepediaImageHost(source)?'https://lol.fandom.com/':'https://d.namu.moe/'},
    validateStatus:s=>s===200});
  const data=Buffer.from(response.data);
  const ext=fileExt(data);
  if(!ext)throw Error('UNSUPPORTED_IMAGE');
  return {data,ext};
}
async function run(){
  const db=await mysql.createConnection({
    host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||3306),
    user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',
    database:process.env.DB_NAME||'lol_card_game'
  });
  let found=0,existing=0,missing=0,errors=0,checked=0,sourceFailures=0;
  const report=[['player','team','position','status','page','photo_url','note']];
  const destination=path.resolve(__dirname,'../uploads/players');
  try{
    const [cards]=await db.query(
      "SELECT id,name,team,position,season,image_url FROM players WHERE season IN ('26 LIVE','26WR','26WRs') ORDER BY team,name,position,id"
    );
    const identities=new Map();
    for(const p of cards){
      const key=[clean(p.name),clean(p.team),p.position].join('|');
      if(!identities.has(key))identities.set(key,[]);
      identities.get(key).push(p);
    }
    console.log('Roster identities: '+identities.size+' / mode: '+(APPLY?'APPLY':'DRY RUN'));
    for(const cards of identities.values()){
      const p=cards[0];
      if(ONLY_REMAINING && !remainingSet.has(String(p.team).toLowerCase()+'|'+String(p.name).toLowerCase()))continue;
      if(nameFlag&&clean(p.name)!==clean(nameFlag.slice('--player='.length)))continue;
      if(teamFlag&&clean(p.team)!==clean(teamFlag.slice('--team='.length)))continue;
      if(checked++>=LIMIT)break;
      if(!OVERWRITE&&cards.some(c=>c.image_url)){
        existing++;
        if(APPLY){
          // Reuse an already uploaded portrait for the other series of the
          // exact same player, with no overwrites.
          const source=cards.find(c=>c.image_url);
          await db.query(
            "UPDATE players SET image_url=? WHERE name=? AND team=? AND position=? AND season IN ('26 LIVE','26WR','26WRs') AND (image_url IS NULL OR image_url='')",
            [source.image_url,p.name,p.team,p.position]
          );
        }
        continue;
      }
      let match=await findLeaguepediaPhoto(p.name,p.team);
      if(match.error&&NAMU_FALLBACK&&!match.sourceError){
        const fallback=await findPhoto(p.name,p.team);
        if(!fallback.error)match={...fallback,origin:'namuwiki'};
      }
      if(match.error){
        missing++;
        sourceFailures=match.sourceError?sourceFailures+1:0;
        report.push([p.name,p.team,p.position,'SKIP','','',match.error]);
        console.log('SKIP '+p.name+' / '+p.team+': '+match.error);
        if(sourceFailures>=3){
          console.log('STOP: portrait source unavailable for 3 consecutive players; avoid further failed requests.');
          break;
        }
        continue;
      }
      sourceFailures=0;
      try{
        const result=await downloadPhoto(match.portrait.url);
        const digest=crypto.createHash('sha256').update(result.data).digest('hex').slice(0,16);
        const filename=(match.origin==='leaguepedia'?'leaguepedia-':'namu-')+p.id+'-'+digest+'.'+result.ext;
        const imageUrl='/api/player-images/'+filename;
        if(APPLY){
          await fs.mkdir(destination,{recursive:true});
          await fs.writeFile(path.join(destination,filename),result.data,{flag:'wx'})
            .catch(e=>{if(e.code!=='EEXIST')throw e;});
          const where=OVERWRITE?'':"AND (image_url IS NULL OR image_url='')";
          await db.query(
            "UPDATE players SET image_url=? WHERE name=? AND team=? AND position=? AND season IN ('26 LIVE','26WR','26WRs') "+where,
            [imageUrl,p.name,p.team,p.position]
          );
        }
        found++;
        console.log((APPLY?'SAVED ':'FOUND ')+p.name+' / '+p.team);
        report.push([p.name,p.team,p.position,APPLY?'SAVED':'FOUND',match.page,match.portrait.url,'']);
      }catch(e){
        errors++;
        const reason=String(e.response?.status||e.code||e.message);
        report.push([p.name,p.team,p.position,'FAILED',match.page,match.portrait.url,reason]);
        console.log('FAILED '+p.name+' / '+p.team+': '+reason);
      }
      await pause(500);
    }
  }finally{await db.end();}
  const file=path.resolve(__dirname,ONLY_REMAINING?
    '../../remaining-39-photo-report.csv':'../../player-photo-report.csv');
  await fs.writeFile(file,report.map(row=>row.map(csv).join(',')).join('\n')+'\n','utf8');
  console.log(JSON.stringify({mode:APPLY?'APPLY':'DRY_RUN',found,existing,missing,errors,report:file},null,2));
  if(!APPLY)console.log('No database changes. Use --apply to save portraits.');
  console.log('Namu mirror fallback disabled by default due to repeated 404; use --namu-fallback to opt in.');
}
run().catch(error=>{console.error('Photo import failed:',error);process.exitCode=1;});

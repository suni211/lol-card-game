import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { getPlayerImageUrl, getSeriesLogo } from '../utils/playerImage';

const API_URL=import.meta.env.VITE_API_URL||'http://localhost:5000/api';
const ROLES=['TOP','JUNGLE','MID','ADC','SUPPORT'] as const;
type Role=typeof ROLES[number];
type Phase='early'|'mid'|'late';
type Card={id:number;cardId?:number;name:string;team:string;position:Role;overall:number;season:string;imageUrl?:string};
type Preview={own:Card[];enemy:Card[];ownOverall:number;enemyOverall:number;advantagePercent:number;explanation:string};
type Job={id:string;status:'QUEUED'|'RUNNING'|'COMPLETE'|'ERROR';queuePosition:number;result?:any;error?:string};
const CHAMPIONS:Record<string,Role[]>={
  Alistar:['SUPPORT','TOP'],Annie:['MID','SUPPORT'],Ashe:['ADC'],Fiddlesticks:['JUNGLE','SUPPORT'],
  Jax:['TOP','JUNGLE'],Kayle:['TOP','MID'],MasterYi:['JUNGLE'],Morgana:['MID','SUPPORT','JUNGLE'],
  Nunu:['JUNGLE'],Ryze:['MID','TOP'],Sion:['TOP'],Sivir:['ADC'],Soraka:['SUPPORT'],
  Teemo:['TOP'],Tristana:['ADC','MID'],TwistedFate:['MID'],Warwick:['JUNGLE','TOP'],
};
const PRESET:Record<Role,string>={TOP:'Jax',JUNGLE:'Nunu',MID:'Annie',ADC:'Ashe',SUPPORT:'Alistar'};
const OPTIONS:Record<Phase,{value:string;label:string}[]>={
  early:[{value:'LANE',label:'라인전 우선'},{value:'OBJECTIVE',label:'오브젝트 우선'}],
  mid:[{value:'MACRO',label:'운영 우선'},{value:'TEAMFIGHT',label:'한타 우선'},{value:'OBJECTIVE',label:'오브젝트 우선'}],
  late:[{value:'MACRO',label:'운영 우선'},{value:'TEAMFIGHT',label:'한타 우선'},{value:'OBJECTIVE',label:'오브젝트 우선'}],
};
const PHASES:Phase[]=['early','mid','late'];
function Portrait({card}:{card:Card}){
  return <div className="h-28 w-24 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-end overflow-hidden">
    <img src={getPlayerImageUrl(card.name,card.season,'',card.imageUrl)} alt={card.name}
      className="h-20 w-full object-contain"
      onError={e=>{const t=e.currentTarget;t.onerror=null;t.src='/players/placeholder.png';}}/>
    <span className="text-xs font-semibold bg-black/70 w-full text-center truncate px-1">{card.name}</span>
  </div>;
}
export default function RiftPrematch(){
  const {token}=useAuthStore();
  const [cards,setCards]=useState<Array<{id:number;player:Card}>>([]);
  const [enemyTeams,setEnemyTeams]=useState<string[]>([]);
  const [enemyTeam,setEnemyTeam]=useState('');
  const [selected,setSelected]=useState<Record<Role,number>>({TOP:0,JUNGLE:0,MID:0,ADC:0,SUPPORT:0});
  const [stage,setStage]=useState<'lineup'|'draft'|'strategy'|'match'>('lineup');
  const [preview,setPreview]=useState<Preview|null>(null);
  const [bans,setBans]=useState<string[]>(['Teemo','Kayle','TwistedFate']);
  const [picks,setPicks]=useState<Record<Role,string>>(PRESET);
  const [strategy,setStrategy]=useState<Record<Phase,string>>({early:'LANE',mid:'MACRO',late:'TEAMFIGHT'});
  const [job,setJob]=useState<Job|null>(null);
  const [loading,setLoading]=useState(false);
  const headers={Authorization:`Bearer ${token}`};
  async function load(){
    try{
      const [all,opponents]=await Promise.all([
        axios.get(`${API_URL}/deck/cards`,{headers}),
        axios.get(`${API_URL}/rift/opponents`,{headers})
      ]);
      const playable=(all.data.data||[]).filter((c:{player:Card})=>['26 LIVE','26WR','26WRs'].includes(c.player.season));
      setCards(playable);
      setSelected(current=>Object.fromEntries(ROLES.map(role=>[
        role,playable.some((c:{id:number;player:Card})=>c.id===current[role]&&c.player.position===role)
          ?current[role]:(playable.find((c:{player:Card})=>c.player.position===role)?.id||0)
      ])) as Record<Role,number>);
      const teams=opponents.data.data.teams as string[];
      setEnemyTeams(teams);
      setEnemyTeam(prev=>teams.includes(prev)?prev:(teams.find(t=>t==='T1')||teams[0]||''));
    }catch(err:any){toast.error(err.response?.data?.error||'선수 또는 AI 팀 목록 조회 실패');}
  }
  useEffect(()=>{if(token)void load();},[token]);
  useEffect(()=>{
    if(!job||job.status==='COMPLETE'||job.status==='ERROR')return;
    const interval=window.setInterval(async()=>{
      try{
        const r=await axios.get(`${API_URL}/rift/match/${job.id}`,{headers});
        setJob(r.data.data);
      }catch{ /* transient request failure; retry on next poll */ }
    },2500);
    return ()=>window.clearInterval(interval);
  },[job?.id,job?.status,token]);
  const chosen=useMemo(()=>ROLES.map(role=>cards.find(c=>c.id===selected[role])?.player),[cards,selected]);
  const valid=chosen.every(Boolean)&&new Set(ROLES.map(role=>selected[role])).size===5;
  async function starter(){
    try{setLoading(true);await axios.post(`${API_URL}/rift/starter`,{}, {headers});toast.success('26 LIVE 스타터 선수 5명 지급');await load();}
    catch(err:any){toast.error(err.response?.data?.error||'초기 선수 지급 실패');}finally{setLoading(false);}
  }
  async function previewLineup(){
    if(!valid||!enemyTeam){toast.error('5개 포지션과 AI 상대 팀을 선택하세요.');return;}
    try{
      setLoading(true);
      const r=await axios.post(`${API_URL}/rift/preview`,{cardIds:ROLES.map(role=>selected[role]),enemyTeam},{headers});
      setPreview(r.data.data);setStage('draft');
    }catch(err:any){toast.error(err.response?.data?.error||'라인업 분석 실패');}finally{setLoading(false);}
  }
  function setBan(index:number,value:string){setBans(old=>old.map((x,i)=>i===index?value:x));}
  function validateDraft(){
    const chosenPicks=Object.values(picks);
    if(new Set(chosenPicks).size!==5||new Set(bans).size!==3||bans.some(c=>chosenPicks.includes(c))){
      toast.error('중복 픽 또는 자신의 픽을 밴했습니다.');return false;
    }
    return true;
  }
  async function start(){
    if(!preview||!validateDraft())return;
    try{
      setLoading(true);
      const r=await axios.post(`${API_URL}/rift/start`,{
        cardIds:ROLES.map(role=>selected[role]),enemyTeam,
        draft:{bans,picks},
        strategies:[strategy,{early:'LANE',mid:'MACRO',late:'OBJECTIVE'}]
      },{headers});
      setJob(r.data.data);setStage('match');
    }catch(err:any){toast.error(err.response?.data?.error||'매치 시작 실패');}finally{setLoading(false);}
  }
  function teamStrip(team:Card[],name:string){
    return <section className="bg-slate-900 border border-slate-700 rounded-xl p-4 min-w-0">
      <h3 className="text-xl font-bold mb-4">{name} <span className="text-xs text-slate-400">{team.reduce((n,c)=>n+c.overall,0)} OVR</span></h3>
      <div className="flex flex-wrap gap-3">{team.map((card,i)=><div key={card.id+'-'+i} className="flex flex-col items-center">
        <span className="text-xs text-sky-300 mb-1">{ROLES[i]}</span><Portrait card={card}/>
        <img src={getSeriesLogo(card.season)} className="h-8 w-20 object-contain mt-1" alt={card.season}/>
        <span className="text-sm font-bold">{card.overall} OVR</span>
      </div>)}</div>
    </section>;
  }
  return <main className="min-h-screen bg-gradient-to-b from-slate-950 to-blue-950 text-white px-4 py-10">
    <div className="max-w-6xl mx-auto">
      <div className="mb-7"><p className="text-cyan-400 text-xs tracking-[.2em] font-bold">RIFT REBUILD · 2026</p>
        <h1 className="text-3xl md:text-4xl font-black mt-2">경기 준비 센터</h1>
        <p className="text-slate-300 mt-2">선수 라인업 → 밴픽 → 시간대별 운영 → 리프트 매치엔진</p>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-7">
        {([['lineup','① 라인업'],['draft','② 밴픽'],['strategy','③ 전략'],['match','④ 경기']] as const).map(([key,label])=>
          <div key={key} className={`text-center text-xs md:text-sm font-bold rounded-lg p-3 border ${stage===key?'bg-cyan-800 border-cyan-300':'bg-slate-900 border-slate-800'}`}>{label}</div>)}
      </div>
      {stage==='lineup'&&<>
        {cards.length===0&&<div className="border border-amber-600 bg-slate-900 rounded-xl p-5 mb-6">
          <p className="mb-3">새 계정에 선수가 없습니다. 26 LIVE 스타터 카드 5장을 지급받을 수 있습니다.</p>
          <button onClick={starter} disabled={loading} className="bg-amber-500 px-5 py-2 rounded-lg font-bold text-slate-950">스타터 라인업 받기</button>
        </div>}
        <section className="bg-slate-900 rounded-xl border border-slate-700 p-5 mb-5">
          <h2 className="font-bold text-xl mb-4">내 선수 선발</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">{ROLES.map(role=>
            <label key={role} className="text-sm">
              <span className="text-cyan-400 font-bold">{role}</span>
              <select className="block w-full rounded-lg p-2 bg-slate-800 border border-slate-600 mt-1" value={selected[role]}
                onChange={e=>{setSelected({...selected,[role]:Number(e.target.value)});setPreview(null);}}>
                <option value={0}>선수 선택</option>
                {cards.filter(c=>c.player.position===role).map(c=><option key={c.id} value={c.id}>{c.player.name} · {c.player.season} · {c.player.overall}</option>)}
              </select>
              {chosen[ROLES.indexOf(role)]&&<div className="flex justify-center mt-3"><Portrait card={chosen[ROLES.indexOf(role)]!}/></div>}
            </label>)}</div>
        </section>
        <section className="bg-slate-900 rounded-xl border border-slate-700 p-5 mb-5">
          <h2 className="text-xl font-bold mb-3">AI 상대 팀</h2>
          <select className="bg-slate-800 border border-slate-600 rounded p-2 w-full md:w-64" value={enemyTeam} onChange={e=>setEnemyTeam(e.target.value)}>
            {enemyTeams.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </section>
        <button disabled={!valid||loading} onClick={previewLineup} className="bg-cyan-500 text-slate-950 font-black px-8 py-3 rounded-lg disabled:opacity-40">라인업 비교 및 밴픽 시작</button>
      </>}
      {stage==='draft'&&preview&&<>
        <div className="grid md:grid-cols-2 gap-4">{teamStrip(preview.own,'내 라인업')}{teamStrip(preview.enemy,`AI · ${enemyTeam}`)}</div>
        <section className="my-5 bg-slate-900 border border-slate-700 rounded-xl p-5">
          <h2 className="font-bold text-xl">예상 우세도</h2>
          <div className="flex justify-between mt-3 text-sm"><span>내 팀 {preview.advantagePercent}%</span><span>AI {Math.round((100-preview.advantagePercent)*10)/10}%</span></div>
          <div className="h-4 mt-2 rounded-full overflow-hidden bg-rose-500"><div className="h-full bg-sky-400" style={{width:`${preview.advantagePercent}%`}}/></div>
          <p className="text-xs text-slate-400 mt-2">{preview.explanation}</p>
        </section>
        <section className="bg-slate-900 border border-slate-700 rounded-xl p-5 mb-5">
          <h2 className="font-bold text-xl mb-4">밴픽 · 17종 챔피언 키트</h2>
          <p className="text-slate-400 text-sm mb-4">3개 밴과 포지션별 픽을 직접 선택합니다. 상대는 AI가 규칙에 맞춰 밴픽합니다.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">{bans.map((ban,index)=><label key={index} className="text-sm">BAN {index+1}
            <select className="block w-full mt-1 bg-slate-800 border border-red-700 p-2 rounded" value={ban} onChange={e=>setBan(index,e.target.value)}>
              {Object.keys(CHAMPIONS).map(name=><option key={name} value={name}>{name}</option>)}
            </select>
          </label>)}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">{ROLES.map(role=><label key={role} className="text-sm">PICK · {role}
            <select className="block mt-1 w-full bg-slate-800 border border-cyan-600 p-2 rounded" value={picks[role]} onChange={e=>setPicks({...picks,[role]:e.target.value})}>
              {Object.entries(CHAMPIONS).filter(([,roles])=>roles.includes(role)).map(([name])=><option key={name} value={name}>{name}</option>)}
            </select>
          </label>)}</div>
        </section>
        <div className="flex gap-3"><button onClick={()=>setStage('lineup')} className="border border-slate-600 rounded px-6 py-2">뒤로</button>
          <button onClick={()=>validateDraft()&&setStage('strategy')} className="bg-cyan-500 text-slate-950 rounded font-bold px-6 py-2">전략 설정</button></div>
      </>}
      {stage==='strategy'&&preview&&<>
        <div className="grid md:grid-cols-2 gap-4 mb-5">{teamStrip(preview.own,'내 선수')}{teamStrip(preview.enemy,`AI · ${enemyTeam}`)}</div>
        <div className="grid md:grid-cols-3 gap-4 mb-5">{PHASES.map((phase,index)=><section key={phase} className="bg-slate-900 border border-sky-700 rounded-xl p-5">
          <h2 className="font-bold text-xl mb-4">{['초반 운영','중반 운영','후반 운영'][index]}</h2>
          <div className="grid gap-2">{OPTIONS[phase].map(o=><button key={o.value} onClick={()=>setStrategy({...strategy,[phase]:o.value})}
            className={`p-3 rounded-lg text-left border ${strategy[phase]===o.value?'bg-cyan-800 border-cyan-300':'bg-slate-800 border-slate-700'}`}>{o.label}</button>)}</div>
        </section>)}</div>
        <div className="flex gap-3"><button onClick={()=>setStage('draft')} className="border border-slate-600 rounded px-6 py-2">밴픽으로</button>
          <button disabled={loading} onClick={start} className="bg-amber-500 text-slate-950 font-black rounded px-8 py-3 disabled:opacity-40">RIFT 경기 시작</button></div>
      </>}
      {stage==='match'&&job&&<section className="bg-slate-900 border border-slate-700 rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-4">경기 진행 · {job.status}</h2>
        {job.status==='QUEUED'&&<p>매치 대기열 {job.queuePosition}번째입니다.</p>}
        {job.status==='RUNNING'&&<p>Python 리프트 엔진이 챔피언 이동·스킬·오브젝트·넥서스 결과를 계산하고 있습니다.</p>}
        {job.status==='ERROR'&&<p className="text-red-300">{job.error}</p>}
        {job.status==='COMPLETE'&&job.result&&<>
          <h3 className="text-3xl font-black text-amber-300 mb-2">{job.result.result.finished?
            job.result.result.winner===0?'승리':job.result.result.winner===1?'패배':'무승부':'경기 제한 시간 도달 · 미결정'}</h3>
          <p className="text-slate-300 mb-5">경기 시간 {Math.floor(job.result.result.time/60)}분 · 시뮬레이션 완료</p>
          <h4 className="font-bold mb-2">선수 기록</h4>
          <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr>{['팀','선수','챔피언','포지션','K/D/A','CS','딜량'].map(h=><th className="p-2" key={h}>{h}</th>)}</tr></thead>
            <tbody>{(job.result.result.players||[]).map((p:any,i:number)=><tr key={i} className="border-t border-slate-700">
              <td className="p-2">{p.team===0?'나':'AI'}</td><td className="p-2">{p.player_name}</td><td className="p-2">{p.name}</td>
              <td className="p-2">{p.role}</td><td className="p-2">{p.kda.join('/')}</td><td className="p-2">{p.cs}</td><td className="p-2">{p.damage}</td>
            </tr>)}</tbody></table></div>
          <h4 className="font-bold mt-6 mb-2">주요 경기 사건</h4>
          <div className="max-h-60 overflow-y-auto space-y-2 text-sm">{(job.result.timeline||[]).map((e:any,i:number)=>
            <p key={i} className="border-b border-slate-800 pb-2"><span className="text-cyan-400 mr-2">{Math.floor(e.t/60)}:{String(Math.floor(e.t%60)).padStart(2,'0')}</span>
              {e.type} {e.name||e.element||''} {e.team!==undefined?`· 팀 ${e.team===0?'BLUE':'RED'}`:''}</p>)}</div>
          <button className="mt-6 bg-cyan-500 px-5 py-2 rounded font-bold text-slate-950" onClick={()=>{setJob(null);setStage('lineup');setPreview(null);}}>다음 경기 준비</button>
        </>}
      </section>}
    </div>
  </main>;
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { Swords, Bot, Trophy, RefreshCw, Zap, ShieldCheck } from 'lucide-react';

const API_URL = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');
type Mode = 'AI' | 'RANKED';
type Choice = 'ROCK' | 'PAPER' | 'SCISSORS';
type Player = {cardId:number; playerId:number; name:string; team:string; position:string; season:string; overall:number; level:number};
type Round = {round:number; choice:Choice; opponentChoice:Choice; rps:'WIN'|'LOSE'|'TIE';playerScore:number;opponentScore:number;won:boolean};
type Series = {
  id:number;mode:Mode;playerPower:number;opponentPower:number;
  wins:number;losses:number;status:'ACTIVE'|'WIN'|'LOSE';rounds:Round[];roster:Player[];
  ratingDelta:number;pointsReward:number;
};
type Preview = {players:Player[];power:number;deckId:number|null};
type History = {id:number;mode:Mode;player_power:number;opponent_power:number;wins:number;losses:number;status:string;rating_delta:number;points_reward:number};
const names: Record<Choice, string> = {ROCK:'바위',PAPER:'보',SCISSORS:'가위'};
const buttons: {choice:Choice;emoji:string}[] = [
  {choice:'SCISSORS',emoji:'✌️'},{choice:'ROCK',emoji:'✊'},{choice:'PAPER',emoji:'✋'}
];

export default function OvrMatch() {
  const {token,updateUser} = useAuthStore();
  const headers = useMemo(()=>({Authorization:`Bearer ${token}`}),[token]);
  const [mode,setMode] = useState<Mode>('AI');
  const [deckSlot,setDeckSlot] = useState(1);
  const [preview,setPreview] = useState<Preview|null>(null);
  const [series,setSeries] = useState<Series|null>(null);
  const [teamError,setTeamError] = useState('');
  const [history,setHistory] = useState<History[]>([]);
  const [busy,setBusy] = useState(false);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');

  const load = useCallback(async()=>{
    try {
      setError('');
      const [current,prev] = await Promise.all([
        axios.get(`${API_URL}/ovr-match/current`,{headers,params:{deckSlot}}),
        axios.get(`${API_URL}/ovr-match/history`,{headers})
      ]);
      setSeries(current.data.data?.series ?? null);
      setPreview(current.data.data?.preview ?? null);
      setTeamError(current.data.data?.teamError || '');
      setHistory(prev.data.data || []);
    } catch(e:any) {
      setError(e.response?.data?.error || '대전 정보를 불러오지 못했습니다. DB 테이블 적용을 확인하세요.');
    } finally {setLoading(false);}
  },[headers,deckSlot]);
  useEffect(()=>{void load();},[load]);

  const start = async()=>{
    setBusy(true);
    try{
      const r=await axios.post(`${API_URL}/ovr-match/start`,{mode,deckSlot},{headers});
      setSeries(r.data.data);
      if(r.data.resumed) toast('진행 중이던 경기를 이어갑니다.');
      else toast.success('가위바위보 3판 2선승제 경기 시작!');
    }catch(e:any){toast.error(e.response?.data?.error||'경기 시작 실패');}
    finally{setBusy(false);}
  };
  const play = async(choice:Choice)=>{
    if(!series||series.status!=='ACTIVE')return;
    setBusy(true);
    try{
      const r=await axios.post(`${API_URL}/ovr-match/${series.id}/play`,{choice},{headers});
      const next:Series = r.data.data;
      setSeries(next);
      const latest = next.rounds[next.rounds.length-1];
      if(next.status==='ACTIVE')toast(latest.won?'이번 판 승리!':'이번 판 패배!');
      else{
        toast.success(next.status==='WIN'?'2승 달성! 최종 승리':'시리즈 종료 · 다음 경기에서 재도전하세요.');
        const me=await axios.get(`${API_URL}/auth/me`,{headers});
        if(me.data.success)updateUser(me.data.data);
        const prev=await axios.get(`${API_URL}/ovr-match/history`,{headers});
        setHistory(prev.data.data||[]);
      }
    }catch(e:any){toast.error(e.response?.data?.error||'경기 판정 오류');}
    finally{setBusy(false);}
  };

  const active=series?.status==='ACTIVE';
  const roster=active?series.roster:preview?.players||[];
  return <div className="min-h-screen bg-slate-950 px-4 py-8 text-white">
    <div className="mx-auto max-w-5xl space-y-7">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-black"><Swords className="h-9 w-9 text-sky-400"/>OVR 가위바위보 대전</h1>
          <p className="mt-2 text-sm text-slate-300">선수 카드 5명 · 포지션 제한 없음 · 랜덤 상대 OVR · 최대 3판 2선승제</p>
        </div>
        <button onClick={()=>void load()} disabled={busy} className="flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 disabled:opacity-40"><RefreshCw className="h-4 w-4"/>새로고침</button>
      </header>
      {error&&<p role="alert" className="rounded-lg border border-red-700 bg-red-950 p-4 text-red-200">{error}</p>}
      {loading ? <p className="rounded-lg bg-slate-900 p-6">경기 정보를 불러오는 중...</p> : <>
        {!active&&<section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <h2 className="mb-4 text-xl font-bold">경기 선택</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <button onClick={()=>setMode('AI')} aria-pressed={mode==='AI'}
              className={`rounded-lg border p-4 text-left ${mode==='AI'?'border-sky-400 bg-sky-950':'border-slate-700'}`}>
              <Bot className="mb-2 h-6 w-6"/>AI 매치
              <p className="mt-1 text-sm text-slate-300">랜덤 OVR AI · 승리 200P</p>
            </button>
            <button onClick={()=>setMode('RANKED')} aria-pressed={mode==='RANKED'}
              className={`rounded-lg border p-4 text-left ${mode==='RANKED'?'border-amber-400 bg-amber-950':'border-slate-700'}`}>
              <Trophy className="mb-2 h-6 w-6"/>경쟁전
              <p className="mt-1 text-sm text-slate-300">랜덤 OVR 경쟁전 · 승리 350P / 랭크 +25</p>
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label htmlFor="ovr-deck" className="text-sm font-semibold">우선 적용할 덱</label>
            <select id="ovr-deck" value={deckSlot} onChange={e=>setDeckSlot(Number(e.target.value))}
              className="rounded-lg border border-slate-600 bg-slate-800 p-2">
              {[1,2,3,4,5].map(n=><option key={n} value={n}>덱 {n}</option>)}
            </select>
            <p className="text-xs text-slate-400">덱에 자리가 비어도 보유 카드로 자동 충원합니다.</p>
          </div>
          {teamError&&<p className="mt-3 text-amber-300">{teamError}</p>}
          <button disabled={busy||!preview||!!teamError} onClick={()=>void start()}
            className="mt-5 w-full rounded-lg bg-sky-600 p-4 font-bold hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40">
            {busy?'경기 준비 중...':mode==='RANKED'?'경쟁전 시작 · 3판 2선승':'AI 매치 시작 · 3판 2선승'}
          </button>
        </section>}
        <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><ShieldCheck className="h-5 w-5 text-emerald-400"/>출전 선수 5명</h2>
          <div className="grid gap-2 sm:grid-cols-5">
            {roster.map(c=><div key={c.cardId} className="rounded-lg bg-slate-800 p-3 text-sm">
              <div className="font-bold">{c.name}</div>
              <div className="mt-1 text-xs text-slate-400">{c.season} · {c.position}</div>
              <div className="mt-2 font-bold text-amber-300">{c.overall} OVR {c.level>0?`+ ${c.level}강`:''}</div>
            </div>)}
          </div>
          <p className="mt-4 text-sm text-slate-300">아군 합산 OVR: <strong className="text-sky-300">{active?series.playerPower:preview?.power??'-'}</strong>{active&&<> · 상대 랜덤 OVR: <strong className="text-rose-300">{series.opponentPower}</strong></>}</p>
        </section>
        {series&&<section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-black">{series.mode==='RANKED'?'경쟁전':'AI 매치'} · {series.wins}승 {series.losses}패</h2>
            <div className="text-sm text-slate-300">먼저 2승 달성 시 승리</div>
          </div>
          <div className="mb-5 grid grid-cols-3 gap-2">
            {[0,1,2].map(i=><div key={i} className={`rounded-lg border p-3 text-center text-sm ${series.rounds[i]?.won?'border-emerald-500 bg-emerald-950':series.rounds[i]?'border-red-500 bg-red-950':'border-slate-700 bg-slate-800'}`}>
              {i+1}판 <span className="block font-bold">{series.rounds[i]?(series.rounds[i].won?'승리':'패배'):'대기'}</span>
            </div>)}
          </div>
          {active ? <>
            <p className="mb-3 text-center text-slate-300">가위바위보 승자는 해당 판의 OVR에 +25% 보정, 패자는 -25% 보정됩니다. OVR이 높으면 불리한 가위바위보도 뒤집을 수 있습니다.</p>
            <div className="grid grid-cols-3 gap-3">
              {buttons.map(({choice,emoji})=><button key={choice} disabled={busy} onClick={()=>void play(choice)}
                className="rounded-xl border border-sky-500 bg-sky-900 p-5 text-center font-black hover:bg-sky-700 disabled:opacity-40">
                <span className="block text-4xl">{emoji}</span>{names[choice]}
              </button>)}
            </div>
          </> : <div className="rounded-lg bg-slate-800 p-4 text-center">
            <p className="text-2xl font-black">{series.status==='WIN'?'시리즈 승리!':'시리즈 패배'}</p>
            <p className="mt-2 text-sm text-slate-300">포인트 +{series.pointsReward}P · 랭크 {series.ratingDelta>0?'+':''}{series.ratingDelta}</p>
            <button onClick={()=>setSeries(null)} className="mt-4 rounded-lg bg-sky-600 px-7 py-3 font-bold">다음 경기</button>
          </div>}
          {!!series.rounds.length&&<div className="mt-5 space-y-2">
            {series.rounds.map(r=><div key={r.round} className="flex flex-wrap justify-between gap-2 rounded-lg bg-slate-800 p-3 text-sm">
              <span>{r.round}판 · 나 {names[r.choice]} / 상대 {names[r.opponentChoice]}</span>
              <span className={r.won?'text-emerald-300':'text-rose-300'}>{r.playerScore} : {r.opponentScore} · {r.won?'승리':'패배'}</span>
            </div>)}
          </div>}
        </section>}
        <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Zap className="h-5 w-5 text-amber-400"/>최근 대전 기록</h2>
          {history.length===0?<p className="text-sm text-slate-400">완료된 경기가 없습니다.</p>:<div className="space-y-2">
            {history.map(h=><div key={h.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-slate-800 p-3 text-sm">
              <span>{h.mode==='RANKED'?'경쟁전':'AI'} · {h.wins}승 {h.losses}패</span>
              <span className={h.status==='WIN'?'text-emerald-300':'text-rose-300'}>{h.status==='WIN'?'승리':'패배'} · {h.player_power} vs {h.opponent_power} OVR · +{h.points_reward}P</span>
            </div>)}
          </div>}
        </section>
      </>}
    </div>
  </div>;
}

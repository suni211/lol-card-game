import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Trophy, Users, RefreshCw, ShieldCheck, Swords } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');

type Strategy = 'MACRO' | 'TEAMFIGHT' | 'OBJECTIVE';
type Card = {
  cardId:number; playerId:number; name:string; team:string; position:string;
  season:string; overall:number; level:number;
  stats:{cs:number;teamfight:number;laning:number;shotcalling:number;mental:number;clutch:number};
};
type Round = {round:number;choice:Strategy;opponentChoice:Strategy;
  ownScore:number;opponentScore:number;won:boolean};
type Match = {
  id:number;opponentName:string;opponentId:number;
  ownWins:number;opponentWins:number;round:number;status:'ACTIVE'|'COMPLETED';
  ownSubmitted:boolean;opponentSubmitted:boolean;winnerId:number|null;
  roster:Card[];rounds:Round[];
};
type QueueData = {status:'NONE'|'WAITING'|'MATCHED'; match:Match|null};
const strategyOptions:{key:Strategy; label:string;description:string}[] = [
  {key:'MACRO',label:'운영',description:'CS · 오더 · 멘탈 중심'},
  {key:'TEAMFIGHT',label:'한타',description:'한타 · 클러치 중심'},
  {key:'OBJECTIVE',label:'오브젝트',description:'오더 · 한타 · 클러치 중심'},
];
const statLabels:{key:keyof Card['stats'];label:string}[] = [
  {key:'cs',label:'CS'},{key:'teamfight',label:'한타'},
  {key:'laning',label:'라인전'},{key:'shotcalling',label:'오더'},
  {key:'mental',label:'멘탈'},{key:'clutch',label:'클러치'},
];
const choiceLabel = (choice:Strategy) => strategyOptions.find(s=>s.key===choice)?.label ?? choice;

export default function CompetitivePvP() {
  const {user,token,updateUser} = useAuthStore();
  const headers = useMemo(()=>({Authorization:`Bearer ${token}`}),[token]);
  const [queue,setQueue] = useState<QueueData>({status:'NONE',match:null});
  const lastMatchId=useRef<number|null>(null);
  const [history,setHistory] = useState<Match[]>([]);
  const [myRank,setMyRank] = useState<{rank:number;rating:number;tier:string;wins:number;losses:number}|null>(null);
  const [deckSlot,setDeckSlot] = useState(1);
  const [busy,setBusy] = useState(false);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const refresh = useCallback(async()=>{
    try {
      const r=await axios.get(`${API_URL}/competitive-pvp/status`,{
        headers,params:{matchId:lastMatchId.current||undefined}
      });
      const next=r.data.data as QueueData;
      if(next.match)lastMatchId.current=next.match.id;
      setQueue(next);
      setError('');
    }catch(e:any){setError(e.response?.data?.error||'경쟁전 상태를 확인할 수 없습니다.');}
    finally{setLoading(false);}
  },[headers]);
  const loadMyRank=useCallback(async()=>{
    try{
      const r=await axios.get(`${API_URL}/ranking/me`,{headers});
      if(r.data.success)setMyRank(r.data.data);
    }catch(e){console.warn('경쟁전 순위 조회 실패',e);}
  },[headers]);
  const loadHistory=useCallback(async()=>{
    try{
      const r=await axios.get(`${API_URL}/competitive-pvp/history`,{headers});
      setHistory(r.data.data||[]);
    }catch(e){console.error('PvP history:',e);}
  },[headers]);
  useEffect(()=>{
    void refresh(); void loadHistory(); void loadMyRank();
    const interval=setInterval(()=>{void refresh();},3000);
    return ()=>clearInterval(interval);
  },[refresh,loadHistory,loadMyRank]);
  const join=async()=>{
    if(busy)return;
    setBusy(true);
    try{
      const r=await axios.post(`${API_URL}/competitive-pvp/queue`,{deckSlot},{headers});
      setQueue(r.data.data);
      if(r.data.data?.match)lastMatchId.current=r.data.data.match.id;
      toast.success(r.data.data?.status==='WAITING'?'상대 유저를 찾는 중입니다.':'상대 유저 매칭 완료!');
    }catch(e:any){toast.error(e.response?.data?.error||'매칭 신청 실패');}
    finally{setBusy(false);}
  };
  const leave=async()=>{
    setBusy(true);
    try{
      await axios.delete(`${API_URL}/competitive-pvp/queue`,{headers});
      lastMatchId.current=null;
      setQueue({status:'NONE',match:null});
      toast('매칭을 취소했습니다.');
    }catch(e:any){toast.error(e.response?.data?.error||'매칭 취소 실패');}
    finally{setBusy(false);}
  };
  const select=async(strategy:Strategy)=>{
    const match=queue.match;
    if(!match||match.status!=='ACTIVE'||match.ownSubmitted||busy)return;
    setBusy(true);
    try{
      const r=await axios.post(`${API_URL}/competitive-pvp/${match.id}/choice`,
        {strategy,round:match.round},{headers});
      const next=r.data.data as Match;
      lastMatchId.current=next.id;
      setQueue({status:'MATCHED',match:next});
      if(next.status==='COMPLETED'){
        toast.success(next.winnerId===user?.id?'경쟁전 승리!':'경쟁전 종료');
        await loadHistory();
        await loadMyRank();
        const me=await axios.get(`${API_URL}/auth/me`,{headers});
        if(me.data.success)updateUser(me.data.data);
      }else if(next.ownSubmitted)toast('전술 제출 완료 · 상대 선택을 기다립니다.');
      else toast.success('이번 판 결과가 확정됐습니다.');
    }catch(e:any){toast.error(e.response?.data?.error||'전술 제출 실패');void refresh();}
    finally{setBusy(false);}
  };
  const match=queue.match;
  return <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
    <div className="mx-auto max-w-5xl space-y-7">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="flex items-center gap-3 text-3xl font-black">
          <Trophy className="h-8 w-8 text-amber-400"/>경쟁전
        </h1><p className="mt-2 text-sm text-slate-300">실제 유저 대전 · 3판 2선승제</p></div>
        <div className="flex flex-wrap items-center gap-3">
          {myRank && <div className="text-sm text-amber-300">내 순위 <strong>#{myRank.rank}</strong> · {myRank.rating} RP · {myRank.wins}승 {myRank.losses}패</div>}
          <Link to="/ranking" className="rounded-lg border border-amber-600 px-3 py-2 text-sm font-semibold text-amber-300">플레이어 랭킹</Link>
          <button onClick={()=>{void refresh();void loadMyRank();}} disabled={busy}
            aria-label="경쟁전 새로고침" className="rounded-lg border border-slate-600 px-3 py-2"><RefreshCw size={17}/></button>
        </div>
      </header>
      {error&&<p role="alert" className="rounded-lg border border-red-700 p-3 text-red-300">{error}</p>}
      {loading?<p className="rounded-lg bg-slate-900 p-5">불러오는 중...</p>:
      <>
        {queue.status==='NONE'&&<section className="rounded-xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="text-xl font-bold">경쟁전 입장</h2>
          <p className="mt-2 text-sm text-slate-400">선수 카드 5장으로 다른 유저와 매칭됩니다.</p>
          <div className="mt-4 flex items-center gap-3">
            <label htmlFor="pvp-deck-slot" className="text-sm">덱 선택</label>
            <select id="pvp-deck-slot" value={deckSlot} onChange={e=>setDeckSlot(Number(e.target.value))}
              className="rounded-lg border border-slate-600 bg-slate-800 p-2">
              {[1,2,3,4,5].map(n=><option value={n} key={n}>덱 {n}</option>)}
            </select>
          </div>
          <button onClick={()=>void join()} disabled={busy}
            className="mt-5 w-full rounded-lg bg-amber-600 p-4 font-bold disabled:opacity-50">매칭 시작</button>
        </section>}
        {queue.status==='WAITING'&&<section className="rounded-xl border border-sky-600 bg-slate-900 p-7 text-center">
          <Users className="mx-auto mb-4 h-10 w-10 text-sky-400"/>
          <h2 className="text-xl font-bold">상대 유저를 찾고 있습니다</h2>
          <p className="mt-2 text-sm text-slate-400">다른 유저가 경쟁전에 참가하면 자동으로 매칭됩니다.</p>
          <button onClick={()=>void leave()} disabled={busy}
            className="mt-5 rounded-lg border border-slate-600 px-7 py-3 font-semibold disabled:opacity-50">매칭 취소</button>
        </section>}
        {match&&<section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">
              나 {match.ownWins} : {match.opponentWins} {match.opponentName}
            </h2><span className="text-sm text-slate-300">
              {match.status==='ACTIVE'?`${match.round}판`:'경기 종료'}
            </span>
          </div>
          <div className="my-5 grid grid-cols-3 gap-2">
            {[0,1,2].map(i=><div key={i} className={`rounded-lg border p-3 text-center text-sm ${match.rounds[i]?.won?'border-emerald-500 bg-emerald-950':match.rounds[i]?'border-rose-500 bg-rose-950':'border-slate-700 bg-slate-800'}`}>
              {i+1}판 <span className="block font-bold">{match.rounds[i]?(match.rounds[i].won?'승리':'패배'):'대기'}</span>
            </div>)}
          </div>
          {match.status==='ACTIVE'&&<>
            {match.ownSubmitted?<p className="rounded-lg bg-sky-950 p-4 text-center text-sky-300">
              내 전술 제출 완료 · 상대 유저의 선택을 기다리는 중
            </p>:<>
              <p className="mb-3 text-center text-sm text-slate-300">이번 판 전술을 선택하세요.</p>
              <div className="grid grid-cols-3 gap-3">
                {strategyOptions.map(option=><button key={option.key} onClick={()=>void select(option.key)}
                  disabled={busy} className="rounded-xl border border-amber-600 bg-slate-800 p-4 text-center hover:bg-slate-700 disabled:opacity-50">
                  <span className="block text-lg font-black">{option.label}</span>
                  <span className="mt-1 block text-xs text-slate-400">{option.description}</span>
                </button>)}
              </div>
            </>}
          </>}
          {match.status==='COMPLETED'&&<div className="rounded-lg bg-slate-800 p-5 text-center">
            <h3 className="text-2xl font-black">{match.winnerId===user?.id?'경쟁전 승리':'경쟁전 패배'}</h3>
            <button onClick={()=>{lastMatchId.current=null;setQueue({status:'NONE',match:null});}}
              className="mt-4 rounded-lg bg-amber-600 px-6 py-3 font-bold">다음 경쟁전</button>
          </div>}
          {match.rounds.length>0&&<div className="mt-5 space-y-2">
            {match.rounds.map(r=><div key={r.round} className="flex flex-wrap justify-between gap-2 rounded-lg bg-slate-800 p-3 text-sm">
              <span>{r.round}판 · {choiceLabel(r.choice)} vs {choiceLabel(r.opponentChoice)}</span>
              <span className={r.won?'text-emerald-300':'text-rose-300'}>
                {r.ownScore} : {r.opponentScore} · {r.won?'승리':'패배'}
              </span>
            </div>)}
          </div>}
        </section>}
        {match&&<section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><ShieldCheck size={19}/>출전 선수 5명</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {match.roster.map(card=><div key={card.cardId} className="rounded-lg bg-slate-800 p-3">
              <p className="font-bold">{card.name}</p>
              <p className="mb-2 text-xs text-slate-400">{card.team} · {card.position} · +{card.level}강</p>
              <p className="mb-3 text-amber-300">{card.overall} OVR</p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                {statLabels.map(stat=><div key={stat.key} className="text-xs">
                  <span className="text-slate-400">{stat.label}</span> <strong>{card.stats?.[stat.key]??'—'}</strong>
                </div>)}
              </div>
            </div>)}
          </div>
        </section>}
        <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Swords size={19}/>최근 경쟁전</h2>
          {!history.length?<p className="text-sm text-slate-400">완료된 경기가 없습니다.</p>:
            <div className="space-y-2">{history.map(h=><div key={h.id} className="flex flex-wrap justify-between rounded-lg bg-slate-800 p-3 text-sm">
              <span>vs {h.opponentName} · {h.ownWins} : {h.opponentWins}</span>
              <span className={h.winnerId===user?.id?'text-emerald-300':'text-rose-300'}>
                {h.winnerId===user?.id?'승리':'패배'}
              </span>
            </div>)}</div>}
        </section>
      </>}
    </div>
  </main>;
}

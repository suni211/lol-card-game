import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { Swords, BrainCircuit, ShieldCheck, Copy, Trophy, ArrowRight } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const ASSETS = API_URL.replace(/\/api\/?$/, '');
type Mode = 'AI' | 'PVP';
type Plan = { laning: string; teamfight: string; macro: string };
type Turn = { kind: 'ban' | 'pick'; team: 0 | 1; role: string | null };
type Draft = {
  actions: string[]; banned: string[]; picks: (string | null)[][];
  turn: Turn | null; legal: string[];
  champions: { id: string; name: string; roles: string[] }[];
  done: boolean;
};
type Session = {
  id: number; status: string; mode: Mode; ownerId: number; opponentId: number | null;
  you: number; draft: Draft; result: any; error?: string;
};
type DeckInfo = {
  deck_slot: number; name: string; top_card_id: number | null;
  jungle_card_id: number | null; mid_card_id: number | null;
  adc_card_id: number | null; support_card_id: number | null;
  total_overall?: number;
};
const defaults: Plan = { laning: 'SAFE', teamfight: 'PROTECT', macro: 'OBJECTIVE' };
const strategyFields = [
  { key: 'laning', title: '라인 운영', values: [['SAFE','안정적'],['AGGRESSIVE','라인 압박'],['SCALING','후반 성장']] },
  { key: 'teamfight', title: '한타 전술', values: [['PROTECT','아군 보호'],['ENGAGE','선제 교전'],['KITE','거리 유지']] },
  { key: 'macro', title: '운영 목표', values: [['OBJECTIVE','오브젝트'],['VISION','시야 장악'],['SPLITPUSH','사이드 운영']] },
] as const;
const positions = ['TOP','JUNGLE','MID','ADC','SUPPORT'];

export default function RiftPrep() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { token } = useAuthStore();
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const [mode,setMode] = useState<Mode>(params.get('mode')==='PVP'?'PVP':'AI');
  const [slot,setSlot] = useState(Number(params.get('deck'))||1);
  const [plan,setPlan] = useState<Plan>({...defaults});
  const [decks,setDecks] = useState<DeckInfo[]>([]);
  const [sessionId,setSessionId] = useState<string|null>(params.get('session'));
  const [inviteId,setInviteId] = useState<string|null>(params.get('join'));
  const [session,setSession] = useState<Session|null>(null);
  const [busy,setBusy] = useState(false);
  const [engine,setEngine] = useState<{ready:boolean;champions?:number;error?:string}|null>(null);

  const refresh = useCallback(async (id: string) => {
    try {
      const response = await axios.get(`${API_URL}/rift/sessions/${id}`, {headers});
      setSession(response.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || '경기 정보를 읽을 수 없습니다.');
    }
  },[headers]);

  useEffect(() => {
    axios.get(`${API_URL}/deck/all`,{headers})
      .then(r=>setDecks(r.data.data||[]))
      .catch(()=>toast.error('덱 목록을 불러오지 못했습니다.'));
    axios.get(`${API_URL}/rift/health`,{headers})
      .then(r=>setEngine(r.data))
      .catch(e=>setEngine({ready:false,error:e.response?.data?.error||'Python 엔진을 설치하세요.'}));
  },[headers]);
  useEffect(() => {
    if(!sessionId)return;
    void refresh(sessionId);
    const interval=setInterval(()=>void refresh(sessionId),2600);
    return()=>clearInterval(interval);
  },[sessionId,refresh]);
  const complete=useMemo(()=>decks.filter(d=>
    Boolean(d.top_card_id&&d.jungle_card_id&&d.mid_card_id&&d.adc_card_id&&d.support_card_id)
  ),[decks]);
  const selectedDeck=complete.find(d=>d.deck_slot===slot);
  const myTurn = !!session?.draft.turn && session.draft.turn.team===session.you && session.status==='DRAFT';
  const inviteUrl = session ? `${window.location.origin}/rift-prep?join=${session.id}` : '';

  const create=async()=>{
    if(!selectedDeck)return toast.error('5개 포지션을 채운 덱을 선택하세요.');
    setBusy(true);
    try {
      const r=await axios.post(`${API_URL}/rift/sessions`, {mode,deckSlot:slot,plan},{headers});
      const id=String(r.data.data.id);
      setInviteId(null);
      setSessionId(id);
      navigate(`/rift-prep?session=${id}`,{replace:true});
      toast.success(mode==='PVP'?'초대 링크를 상대에게 전달하세요.':'밴픽을 시작하세요.');
    } catch(error:any){toast.error(error.response?.data?.error||'경기를 만들 수 없습니다.');}
    finally {setBusy(false);}
  };
  const join=async()=>{
    if(!inviteId||!selectedDeck)return toast.error('참가할 덱을 고르세요.');
    setBusy(true);
    try{
      await axios.post(`${API_URL}/rift/sessions/${inviteId}/join`,{deckSlot:slot,plan},{headers});
      setMode('PVP');setSessionId(inviteId);setInviteId(null);
      navigate(`/rift-prep?session=${inviteId}`,{replace:true});
    }catch(error:any){toast.error(error.response?.data?.error||'참가 실패');}
    finally{setBusy(false);}
  };
  const savePlan=async()=>{
    if(!sessionId)return;
    setBusy(true);
    try{
      await axios.post(`${API_URL}/rift/sessions/${sessionId}/plan`,{plan},{headers});
      toast.success('전략 저장 완료');
    }catch(error:any){toast.error(error.response?.data?.error||'전략 저장 실패');}
    finally{setBusy(false);}
  };
  const choose=async(champion:string)=>{
    if(!sessionId||!myTurn)return;
    setBusy(true);
    try{
      await axios.post(`${API_URL}/rift/sessions/${sessionId}/choose`,{champion},{headers});
      await refresh(sessionId);
    }catch(error:any){toast.error(error.response?.data?.error||'선택 실패');}
    finally{setBusy(false);}
  };

  return <div className="min-h-screen bg-slate-950 text-white py-8 px-4">
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex items-center gap-3">
        <Swords className="w-9 h-9 text-cyan-400"/>
        <div>
          <h1 className="text-3xl font-black">RIFT MANAGER · 매치 준비</h1>
          <p className="text-sm text-slate-400">덱 선택 → 전략 구성 → 6밴·10픽 → 실제 리프트 시뮬레이션</p>
        </div>
      </header>
      {engine && !engine.ready && <p className="rounded-lg bg-red-900/40 p-3 text-red-200">Python 엔진이 준비되지 않았습니다: {engine.error}</p>}
      {engine?.ready && <p className="text-sm text-cyan-300"><ShieldCheck className="inline h-4 w-4 mr-1"/>엔진 연결됨 · 지원 챔피언 {engine.champions}종</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <section className="bg-slate-900 rounded-xl border border-slate-700 p-5 space-y-4">
          <h2 className="text-lg font-bold">1. 대전과 덱</h2>
          <div className="flex gap-2">
            {(['AI','PVP'] as Mode[]).map(m=><button key={m} disabled={!!sessionId} onClick={()=>setMode(m)} className={`flex-1 rounded-lg p-3 border ${mode===m?'border-cyan-400 bg-cyan-950':'border-slate-700'}`}>
              {m==='AI'?<BrainCircuit className="inline mr-1 h-4 w-4"/>:<Swords className="inline mr-1 h-4 w-4"/>}
              {m==='AI'?'AI 매치':'PvP 매치'}
            </button>)}
          </div>
          <label className="text-sm">5인 선수 카드 덱</label>
          <select value={slot} onChange={e=>setSlot(Number(e.target.value))} disabled={!!sessionId} className="w-full rounded-lg bg-slate-800 p-3">
            {[1,2,3,4,5].map(n=>{
              const deck=complete.find(d=>d.deck_slot===n);
              return <option key={n} value={n}>{deck?`덱 ${n} · OVR ${deck.total_overall||'-'}`:`덱 ${n} (미완성)`}</option>;
            })}
          </select>
          {!selectedDeck && <button onClick={()=>navigate('/deck')} className="text-cyan-400 underline text-sm">덱 편성으로 이동</button>}
          {!sessionId && <button disabled={busy||!selectedDeck||!engine?.ready} onClick={()=>void (inviteId?join():create())}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg p-3 font-bold">
            {inviteId?'초대된 경기 참가':'경기 준비하기'} <ArrowRight className="inline h-4 w-4"/>
          </button>}
          {!!sessionId && <button onClick={()=>{setSession(null);setSessionId(null);navigate('/rift-prep',{replace:true});}} className="w-full rounded-lg border border-slate-600 py-2">새 경기 준비</button>}
        </section>
        <section className="bg-slate-900 rounded-xl border border-slate-700 p-5 space-y-3 md:col-span-2">
          <h2 className="text-lg font-bold">2. 경기 전 전략 설정</h2>
          <p className="text-xs text-slate-400">라인·한타·운영을 직접 지정합니다. 시뮬레이션 엔진의 공격성 및 판단에 반영됩니다.</p>
          {strategyFields.map(field=><div key={field.key} className="grid grid-cols-1 md:grid-cols-4 items-center gap-2">
            <strong className="text-sm">{field.title}</strong>
            {field.values.map(([value,label])=><button key={value}
              className={`rounded-lg border px-3 py-2 text-sm ${plan[field.key]===value?'bg-indigo-700 border-cyan-300':'bg-slate-800 border-slate-700'}`}
              onClick={()=>setPlan(p=>({...p,[field.key]:value}))}>{label}</button>)}
          </div>)}
          {!!sessionId && ['WAITING','DRAFT'].includes(session?.status||'') && <button onClick={()=>void savePlan()} disabled={busy} className="rounded bg-indigo-600 px-4 py-2">전략 저장</button>}
        </section>
      </div>
      {session && <section className="rounded-xl border border-slate-700 bg-slate-900 p-5 space-y-5">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">3. 밴픽 및 시뮬레이션</h2>
            <p className="text-slate-400 text-sm">매치 #{session.id} · {session.mode} · {session.status}</p>
          </div>
          {session.mode==='PVP'&&session.status==='WAITING'&&<button onClick={()=>{
            navigator.clipboard.writeText(inviteUrl).then(()=>toast.success('초대 주소 복사 완료')).catch(()=>toast.error('주소 복사 실패'));
          }} className="bg-sky-700 rounded px-4 py-2 flex items-center gap-2"><Copy className="h-4 w-4"/>초대 주소 복사</button>}
        </div>
        {session.status==='WAITING'&&<p className="text-cyan-300">상대방이 초대 링크로 입장하면 양쪽에서 밴픽을 시작합니다.</p>}
        {session.status==='DRAFT'&&<>
          <div className="flex flex-wrap gap-2 items-center">
            <span className={`rounded px-3 py-2 ${myTurn?'bg-green-700':'bg-slate-700'}`}>
              {myTurn?'내 선택 차례': '상대 / AI 선택 처리 중'} · {session.draft.turn?.kind==='ban'?'밴':'픽'} · {session.draft.turn?.role||'모든 포지션'}
            </span>
            <span className="text-xs text-slate-400">{session.draft.actions.length} / 16 선택 완료</span>
          </div>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            {session.draft.picks.map((team,i)=><div key={i} className="bg-slate-800 rounded p-3">
              <h3 className="font-bold mb-2">{i===session.you?'우리 팀':'상대 팀'}</h3>
              {positions.map((role,j)=><div key={role} className="flex justify-between py-1 border-b border-slate-700"><span>{role}</span><span>{team[j]||'대기'}</span></div>)}
            </div>)}
          </div>
          <p className="text-sm text-red-200">밴: {session.draft.banned.join(' · ')||'없음'}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {session.draft.champions.map(c=>{
              const enabled=myTurn&&!busy&&session.draft.legal.includes(c.id);
              const taken=session.draft.banned.includes(c.id)||session.draft.picks.some(t=>t.includes(c.id));
              return <button key={c.id} disabled={!enabled} onClick={()=>void choose(c.id)}
                className={`rounded-lg p-2 border text-center ${enabled?'border-cyan-400 bg-blue-950 hover:bg-blue-900':'border-slate-800 bg-slate-900 opacity-45'}`}>
                <img src={`${ASSETS}/rift-champions/${c.id}.png`} className="h-16 w-16 mx-auto object-contain" alt={c.name}
                  onError={e=>{e.currentTarget.style.visibility='hidden';}}/>
                <div className="font-semibold text-sm">{c.name}</div>
                <small className="text-slate-400">{taken?'선택 불가':c.roles.join(', ')}</small>
              </button>;
            })}
          </div>
        </>}
        {['QUEUED','RUNNING'].includes(session.status)&&<div className="bg-indigo-950/60 p-5 rounded-xl">
          <p className="text-xl font-bold">리프트 매치 엔진 계산 중…</p>
          <p className="text-slate-300 text-sm">병렬 계산 수를 제한한 대기열로 처리합니다. 승패는 넥서스가 파괴되어야 확정됩니다.</p>
        </div>}
        {session.status==='FAILED'&&<p className="text-red-300">경기 처리 실패: {session.error}</p>}
        {session.status==='FINISHED'&&session.result&&<div className="space-y-4">
          <h3 className="text-2xl font-black text-amber-300 flex gap-2 items-center"><Trophy/> {session.result.winnerTeam===session.you?'우리 팀 승리':'상대 팀 승리'}</h3>
          <p>총 경기 시간 {Math.floor(session.result.time/60)}분 {Math.floor(session.result.time%60)}초 · 엔진: {session.result.engine}</p>
          <div className="overflow-auto"><table className="w-full text-sm">
            <thead><tr className="bg-slate-800"><th className="p-2">진영</th><th>선수 / 챔피언</th><th>포지션</th><th>K/D/A</th><th>CS</th><th>대미지</th></tr></thead>
            <tbody>{(session.result.players||[]).map((p:any,i:number)=><tr key={i} className="border-b border-slate-700">
              <td className="p-2">{p.team===session.you?'우리 팀':'상대 팀'}</td><td>{p.player_name||p.name} / {p.name}</td><td>{p.role}</td><td>{p.kda?.join('/')}</td><td>{p.cs}</td><td>{p.damage}</td>
            </tr>)}</tbody>
          </table></div>
          <div className="text-xs text-slate-300">킬 / 오브젝트 / 구조물: {JSON.stringify(session.result.eventCounts||{})}</div>
        </div>}
      </section>}
    </div>
  </div>;
}

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {useAuthStore} from '../store/authStore';

type Change={id:number;before:number;after:number;previousBoost:number;newBoost:number;
  delta:number;reason:string;date:string;evidenceUrl?:string|null};
type BoostData={playerId:number;name?:string;team?:string;season:string;
  baseOverall:number;overall:number;boost:number;achievement?:string|null;
  evidenceUrl?:string|null;history:Change[]};
const API_URL=import.meta.env.PROD?'/api':(import.meta.env.VITE_API_URL||'http://localhost:5000/api');
export function LiveBoostBadge({boost}:{boost:number}){
  const value=Number(boost)||0;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${value>0?
    'bg-emerald-500/15 text-emerald-400':value<0?
    'bg-rose-500/15 text-rose-400':'bg-slate-500/15 text-slate-400'}`}>
    {value>0?<TrendingUp size={12}/>:value<0?<TrendingDown size={12}/>:<Minus size={12}/>}
    라이브 {value>0?'+':''}{value} OVR
  </span>;
}
// One lazy request per opened card; no hundreds of parallel per-card API calls.
export default function LiveBoostTrend({playerId,onClose}:{playerId:number;onClose:()=>void}){
  const {token}=useAuthStore();
  const [data,setData]=useState<BoostData|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    let active=true;
    setData(null);setError('');
    axios.get(`${API_URL}/live-boost/${playerId}`,{
      headers:{Authorization:`Bearer ${token}`},
      params:{t:Date.now()}
    }).then(r=>{if(active)setData(r.data.data);})
      .catch(e=>{if(active)setError(e.response?.data?.error||'라이브 OVR 기록을 읽을 수 없습니다.');});
    return ()=>{active=false;};
  },[playerId,token]);
  const chart=useMemo(()=>{
    if(!data)return null;
    const points=data.history.length
      ?[{ovr:data.history[0].before,label:'시작'},...data.history.map(h=>({
        ovr:h.after,label:new Date(h.date).toLocaleDateString('ko-KR')
      }))]
      :[{ovr:data.baseOverall,label:'기본'},{ovr:data.overall,label:'현재'}];
    const min=Math.max(50,Math.min(...points.map(x=>x.ovr))-5);
    const max=Math.min(160,Math.max(...points.map(x=>x.ovr))+5);
    const x=(i:number)=>40+i*(640/(points.length-1));
    const y=(ovr:number)=>215-((ovr-min)/Math.max(1,max-min))*170;
    const line=points.map((p,i)=>`${x(i)},${y(p.ovr)}`).join(' ');
    return {points,min,max,x,y,line};
  },[data]);
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
      role="dialog" aria-modal="true" aria-label="라이브 OVR 변화 그래프" onClick={onClose}>
    <section onClick={e=>e.stopPropagation()} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-600 bg-slate-900 p-5 text-white shadow-2xl">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black">라이브 OVR 변동 기록 {data?.name? `· ${data.name}`:''}</h2>
        <button type="button" aria-label="닫기" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-700"><X/></button>
      </div>
      {error?<p role="alert" className="mt-5 text-rose-300">{error}</p>:!data||!chart?
        <p className="mt-5 text-slate-400">기록을 불러오는 중...</p>:<>
        <p className="mt-3 text-sm text-slate-300">{data.team} · {data.season} · 기본 {data.baseOverall} OVR → 현재 <strong>{data.overall} OVR</strong></p>
        <div className="mt-2"><LiveBoostBadge boost={data.boost}/></div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-700 bg-slate-950 p-3">
          <svg viewBox="0 0 720 260" className="min-w-[320px] w-full" role="img" aria-label="시간에 따른 선수 OVR 등락 그래프">
            {[0,1,2,3,4].map(i=>{
              const value=chart.min+(chart.max-chart.min)*i/4;
              const yy=chart.y(value);
              return <g key={i}><line x1="35" x2="689" y1={yy} y2={yy} stroke="#334155" strokeDasharray="4 5"/>
                <text x="2" y={yy+4} fontSize="11" fill="#94a3b8">{Math.round(value)}</text></g>;
            })}
            <polyline points={chart.line} stroke="#38bdf8" strokeWidth="3" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
            {chart.points.map((p,i)=><g key={i}>
              <circle cx={chart.x(i)} cy={chart.y(p.ovr)} r="5" fill="#38bdf8" stroke="#0f172a" strokeWidth="2"/>
              <text x={chart.x(i)} y={Math.max(12,chart.y(p.ovr)-12)} fontSize="11" fill="#f8fafc" textAnchor="middle">{p.ovr}</text>
            </g>)}
            <text x="40" y="247" fill="#94a3b8" fontSize="11">{chart.points[0].label}</text>
            <text x="682" y="247" fill="#94a3b8" fontSize="11" textAnchor="end">{chart.points[chart.points.length-1].label}</text>
          </svg>
        </div>
        {data.history.length===0?<p className="mt-4 text-sm text-slate-400">아직 라이브 OVR 변경 이력이 없습니다. 현재 값만 표시합니다.</p>:
        <div className="mt-4 space-y-2">
          <h3 className="font-bold">변동 내역 ({data.history.length}건)</h3>
          {data.history.slice().reverse().map(h=><div key={h.id} className="flex items-start justify-between gap-3 rounded-lg bg-slate-800 p-3 text-sm">
            <div><div className="font-semibold">{h.before} → {h.after} OVR
              <span className={`ml-2 ${h.delta>0?'text-emerald-400':h.delta<0?'text-rose-400':'text-slate-400'}`}>
                ({h.delta>0?'+':''}{h.delta})
              </span></div>
              <p className="mt-1 text-slate-300">{h.reason}</p>
              {h.evidenceUrl?.startsWith('https://')&&<a href={h.evidenceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sky-400 underline">근거 자료</a>}
            </div>
            <time className="shrink-0 text-xs text-slate-400">{new Date(h.date).toLocaleDateString('ko-KR')}</time>
          </div>)}
        </div>}
      </>}
    </section>
  </div>;
}

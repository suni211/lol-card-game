import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getSeriesLogo } from '../utils/playerImage';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.PROD?'/api':(import.meta.env.VITE_API_URL || 'http://localhost:5000/api');
type Player2026 = {
  id:number; name:string; team:string; position:string; season:string;
  overall:number; base_overall:number; boost_amount:number;
  image_url?:string; achievement?:string; evidence_url?:string;
};
export default function Worlds2026Admin() {
  const {token}=useAuthStore();
  const [players,setPlayers]=useState<Player2026[]>([]);
  const [query,setQuery]=useState('');
  const [season,setSeason]=useState('26WRs');
  const [busy,setBusy]=useState<number|null>(null);
  const [boosts,setBoosts]=useState<Record<number,string>>({});
  const [evidence,setEvidence]=useState<Record<number,string>>({});
  const [achievements,setAchievements]=useState<Record<number,string>>({});
  const headers={Authorization:`Bearer ${token}`};
  const load=async()=>{
    try {
      const r=await axios.get(`${API_URL}/admin/worlds2026/players`,{headers});
      if(r.data.success){
        setPlayers(r.data.data);
        setBoosts(Object.fromEntries(r.data.data.map((p:Player2026)=>[p.id,String(p.boost_amount||0)])));
        setEvidence(Object.fromEntries(r.data.data.map((p:Player2026)=>[p.id,p.evidence_url||''])));
        setAchievements(Object.fromEntries(r.data.data.map((p:Player2026)=>[p.id,p.achievement||''])));
      }
    } catch(err:any){toast.error(err.response?.data?.error||'2026 선수 목록을 읽지 못했습니다. DB 마이그레이션을 확인하세요.');}
  };
  useEffect(()=>{void load();},[]);
  const visible=useMemo(()=>players.filter(p=>
    p.season===season && `${p.name} ${p.team} ${p.position}`.toLowerCase().includes(query.toLowerCase())
  ),[players,season,query]);
  const saveBoost=async(p:Player2026)=>{
    const boost=Number(boosts[p.id]);
    if (!Number.isInteger(boost)||boost< -15||boost>15){toast.error('부스트는 -15~+15 사이 정수입니다.');return;}
    try {
      setBusy(p.id);
      await axios.post(`${API_URL}/admin/worlds2026/boost/${p.id}`,{
        boost,achievement:achievements[p.id]||'',
        evidenceUrl:evidence[p.id]||null
      },{headers});
      toast.success(`${p.name} 라이브 OVR 반영 완료`);
      await load();
    } catch(err:any){toast.error(err.response?.data?.error||'부스트 반영 실패');}
    finally {setBusy(null);}
  };
  const uploadPhoto=async(p:Player2026,file?:File)=>{
    if(!file)return;
    if(!['image/png','image/webp'].includes(file.type)||file.size>2*1024*1024){
      toast.error('배경을 제거한 2MB 이하 PNG 또는 WebP 사진을 선택하세요.');return;
    }
    try{
      setBusy(p.id);
      const dataUrl=await new Promise<string>((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(String(reader.result));
        reader.onerror=()=>reject(new Error('파일 읽기 실패'));
        reader.readAsDataURL(file);
      });
      await axios.post(`${API_URL}/admin/worlds2026/photo/${p.id}`,{dataUrl},{headers});
      toast.success('선수 얼굴 사진 등록 완료');
      await load();
    } catch(err:any){toast.error(err.response?.data?.error||'사진 업로드 실패');}
    finally{setBusy(null);}
  };
  return <main className="min-h-screen bg-slate-950 text-white px-4 py-10">
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-black mb-3">2026 시즌 · 월즈 카드 관리</h1>
      <p className="text-slate-300 mb-7">시리즈별 로고 / 배경 투명 선수 사진 / 26WRs 경기 성적 라이브 부스트. 저장 시 기존 사용자 보유 카드에도 적용됩니다.</p>
      <div className="flex flex-wrap gap-3 mb-6">
        {(['26 LIVE','26WR','26WRs'] as const).map(s=><button key={s} onClick={()=>setSeason(s)}
          className={`rounded-xl border p-3 ${season===s?'border-yellow-400 bg-slate-700':'border-slate-700'}`}>
          <img className="h-12 w-36 object-contain" src={getSeriesLogo(s)} alt={s}/>
        </button>)}
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="선수 또는 팀 검색"
          className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 flex-1 min-w-48"/>
      </div>
      <p className="mb-4 text-sm text-slate-400">{visible.length}장 표시 · 경기 성적은 확인된 자료를 등록 후 적용하세요.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visible.map(p=><section key={p.id} className={`rounded-2xl border p-4 ${p.season==='26WRs'?'border-amber-500 bg-gradient-to-br from-slate-900 to-blue-950':'border-sky-700 bg-slate-900'}`}>
          <div className="flex gap-4">
            <div className="w-28 shrink-0">
              <img src={getSeriesLogo(p.season)} alt={p.season} className="h-10 w-full object-contain"/>
              <div className="h-28 bg-slate-800 rounded-lg overflow-hidden mt-2">
                {p.image_url?<img src={p.image_url} alt={p.name} className="w-full h-full object-contain"/>:<div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">사진 미등록</div>}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg">{p.name}</h2>
              <p className="text-sm text-slate-400">{p.team} · {p.position}</p>
              <div className="text-2xl font-black text-yellow-300 mt-2">{p.overall} <span className="text-sm font-normal text-slate-400">OVR</span></div>
              <p className="text-xs text-slate-400">기본 {p.base_overall} / 라이브 {p.boost_amount>0?'+':''}{p.boost_amount}</p>
              <label className="mt-3 block cursor-pointer rounded border border-slate-600 p-2 text-sm text-center">
                투명 사진 PNG/WebP 업로드
                <input className="hidden" type="file" accept="image/png,image/webp" disabled={busy===p.id} onChange={e=>{void uploadPhoto(p,e.target.files?.[0]);e.currentTarget.value='';}}/>
              </label>
            </div>
          </div>
          {p.season==='26WRs' && <div className="mt-4 grid gap-2">
            <label className="text-sm font-semibold">라이브 OVR 변동 (-15~+15)</label>
            <input type="number" min={-15} max={15} value={boosts[p.id]??'0'} onChange={e=>setBoosts({...boosts,[p.id]:e.target.value})} className="w-full rounded bg-slate-800 px-3 py-2"/>
            <input placeholder="경기 성과 (예: 8강 MVP, 승리 기여)" value={achievements[p.id]||''} onChange={e=>setAchievements({...achievements,[p.id]:e.target.value})} className="w-full rounded bg-slate-800 px-3 py-2"/>
            <input type="url" placeholder="성적 증빙 HTTPS 링크 (선택)" value={evidence[p.id]||''} onChange={e=>setEvidence({...evidence,[p.id]:e.target.value})} className="w-full rounded bg-slate-800 px-3 py-2"/>
            <button disabled={busy===p.id} onClick={()=>void saveBoost(p)} className="rounded-lg bg-amber-500 py-2 font-bold text-slate-950 disabled:opacity-50">라이브 부스트 적용</button>
          </div>}
        </section>)}
      </div>
    </div>
  </main>;
}

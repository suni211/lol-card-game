import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { getSeriesLogo } from '../utils/playerImage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
type Series = '26 LIVE' | '26WR' | '26WRs';
interface RosterCard {
  id:number; name:string; team:string; position:string; region:string; season:Series;
  overall:number; base_overall:number; boost_amount:number;
  image_url?:string; achievement?:string; evidence_url?:string;
}
export default function AdminWorlds2026() {
  const { token } = useAuthStore();
  const [cards,setCards]=useState<RosterCard[]>([]);
  const [query,setQuery]=useState('');
  const [selected,setSelected]=useState<number|null>(null);
  const [boost,setBoost]=useState(0);
  const [achievement,setAchievement]=useState('');
  const [evidenceUrl,setEvidenceUrl]=useState('');
  const [busy,setBusy]=useState(false);
  const [series,setSeries]=useState<Series|'ALL'>('ALL');
  const headers={Authorization:`Bearer ${token}`};
  async function refresh() {
    try {
      const response=await axios.get(`${API_URL}/admin/worlds2026/players`,{headers});
      setCards(response.data.data);
    } catch(e:any) { toast.error(e.response?.data?.error || '2026 선수 조회 실패'); }
  }
  useEffect(()=>{refresh();},[token]);
  const current=cards.find(c=>c.id===selected);
  const filtered=useMemo(()=>cards.filter(c=>
    (series==='ALL'||c.season===series)&&
    [c.name,c.team,c.position].join(' ').toLowerCase().includes(query.toLowerCase())
  ),[cards,series,query]);
  function choose(card:RosterCard) {
    setSelected(card.id);setBoost(card.boost_amount);setAchievement(card.achievement||'');
    setEvidenceUrl(card.evidence_url||'');
  }
  async function saveBoost() {
    if (!current || current.season!=='26WRs') return;
    try {
      setBusy(true);
      await axios.post(`${API_URL}/admin/worlds2026/boost/${current.id}`,
        {boost,achievement,evidenceUrl},{headers});
      toast.success('라이브 부스트가 보유 카드 전체에 반영되었습니다.');
      await refresh();
    } catch(e:any) {toast.error(e.response?.data?.error||'부스트 저장 실패');}
    finally {setBusy(false);}
  }
  async function uploadPhoto(file:File) {
    if(!current) return;
    if(!['image/png','image/webp'].includes(file.type)||file.size>2*1024*1024) {
      toast.error('2MB 이하 투명 PNG 또는 WebP를 선택하세요.');return;
    }
    const reader=new FileReader();
    reader.onload=async()=>{
      try {
        setBusy(true);
        const dataUrl=String(reader.result);
        await axios.post(`${API_URL}/admin/worlds2026/photo/${current.id}`,{dataUrl},{headers});
        toast.success('선수 사진 등록 완료');
        await refresh();
      }catch(e:any){toast.error(e.response?.data?.error||'사진 저장 실패');}
      finally{setBusy(false);}
    };
    reader.readAsDataURL(file);
  }
  return <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-cyan-500/30 text-gray-900 dark:text-gray-100">
    <h2 className="text-2xl font-bold mb-3">2026 시즌 · 월즈 LIVE 운영</h2>
    <p className="text-sm text-gray-500 dark:text-gray-300 mb-5">2026 월즈 8강 선수는 26WRs, 그 외 월즈 참가자는 26WR, 기본 카드는 26 LIVE입니다. 선수 실물 얼굴 사진은 투명 PNG/WebP로 직접 등록하세요.</p>
    <div className="flex flex-wrap gap-3 mb-4">
      {(['26 LIVE','26WR','26WRs'] as Series[]).map(s=><div className="w-32" key={s}>
        <img src={getSeriesLogo(s)} alt={s} className="w-32 h-12 object-contain"/>
        <p className="text-center text-xs">{cards.filter(c=>c.season===s).length}명</p>
      </div>)}
    </div>
    <div className="flex flex-col md:flex-row gap-3 mb-4">
      <input aria-label="선수 또는 팀 검색" className="flex-1 px-3 py-2 rounded border text-black" placeholder="선수명 / 팀명 검색" value={query} onChange={e=>setQuery(e.target.value)}/>
      <select aria-label="시리즈 선택" className="px-3 py-2 rounded border text-black" value={series} onChange={e=>setSeries(e.target.value as Series|'ALL')}>
        {['ALL','26 LIVE','26WR','26WRs'].map(s=><option key={s} value={s}>{s}</option>)}
      </select>
      <button className="rounded bg-slate-700 text-white px-4" onClick={refresh}>새로고침</button>
    </div>
    <div className="grid md:grid-cols-2 gap-5">
      <div className="max-h-96 overflow-auto border rounded">
        {filtered.map(c=><button type="button" key={c.id} onClick={()=>choose(c)}
          className={`w-full text-left p-2 border-b flex justify-between gap-2 hover:bg-cyan-100 dark:hover:bg-slate-700 ${selected===c.id?'bg-cyan-100 dark:bg-slate-700':''}`}>
          <span>{c.team} · {c.name} <small>({c.position})</small></span>
          <span className="text-xs shrink-0">{c.season} / {c.overall}{c.boost_amount>0?` (+${c.boost_amount})`:''}</span>
        </button>)}
      </div>
      <div className="border rounded p-4">
        {!current?<p>선수를 선택하면 사진과 라이브 부스트를 관리할 수 있습니다.</p>:<>
          <img src={getSeriesLogo(current.season)} alt={current.season} className="w-44 h-14 object-contain"/>
          <h3 className="font-bold text-lg">{current.name} ({current.team}) · OVR {current.overall}</h3>
          {current.image_url&&<img src={current.image_url} alt={current.name} className="h-32 object-contain my-3"/>}
          <label className="block mt-4 mb-2 text-sm font-bold">배경 투명 선수 사진 (PNG/WebP, 최대 2MB)</label>
          <input type="file" accept="image/png,image/webp" disabled={busy} onChange={e=>e.target.files?.[0]&&uploadPhoto(e.target.files[0])} className="text-sm w-full"/>
          {current.season==='26WRs'&&<>
            <label className="block mt-4 text-sm">라이브 부스트 (+0 ~ +15)</label>
            <input type="number" min="0" max="15" value={boost} onChange={e=>setBoost(Number(e.target.value))} className="w-full border p-2 rounded text-black"/>
            <label className="block mt-3 text-sm">실제 대회 성적 · 적용 사유</label>
            <textarea value={achievement} onChange={e=>setAchievement(e.target.value)} className="w-full border p-2 rounded text-black" rows={2} placeholder="예: 월즈 8강 MVP, 3세트 연속 우수한 경기력"/>
            <label className="block mt-3 text-sm">근거 링크 (HTTPS, 선택)</label>
            <input type="url" value={evidenceUrl} onChange={e=>setEvidenceUrl(e.target.value)} className="w-full border p-2 rounded text-black" placeholder="https://..."/>
            <p className="text-xs text-gray-500 my-3">기본 OVR {current.base_overall} + 라이브 부스트 {boost} = {current.base_overall+boost}</p>
            <button disabled={busy} onClick={saveBoost} className="rounded bg-blue-700 text-white px-5 py-2 disabled:opacity-40">라이브 부스트 저장</button>
          </>}
        </>}
      </div>
    </div>
  </section>;
}

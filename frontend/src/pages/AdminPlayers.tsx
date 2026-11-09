import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ImagePlus, ListFilter, Search, Save, RefreshCw, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import CountryFlag from '../components/CountryFlag';

const API_URL = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');
const statInputs = [
  {key:'cs',label:'CS'}, {key:'teamfight',label:'한타'},
  {key:'laning',label:'라인전'}, {key:'shotcalling',label:'오더'},
  {key:'mental',label:'멘탈'}, {key:'clutch',label:'클러치'}
] as const;
type StatKey = typeof statInputs[number]['key'];
type SixStats = Record<StatKey,number>;
const initialStats:SixStats = {cs:50,teamfight:50,laning:50,shotcalling:50,mental:50,clutch:50};
type Player = {
  id: number; name: string; team: string; position: string; region: string;
  season: string; overall: number; base_overall?: number; live_boost?: number; nationality: string | null; image_url: string | null;
  cs:number;teamfight:number;laning:number;shotcalling:number;mental:number;clutch:number;
};
type PhotoImportJob = {
  running:boolean; startedAt:string|null; finishedAt:string|null;
  saved:number; skipped:number; failed:number; last:string; error:string|null;
};
type Directory = {
  players: Player[]; page: number; total: number; totalPages: number;
  limit: number; missingCount: number; missingPhotoCount: number;
};
const seasons = ['ALL','26 LIVE','26WR','26WRs','12WR'];
const regions = ['ALL','LCK','LPL','LEC','LCS','CBLOL','LCP','LTA'];
const countryOptions = [
  ['KR','대한민국'],['CN','중국'],['TW','대만'],['VN','베트남'],['JP','일본'],
  ['US','미국'],['CA','캐나다'],['BR','브라질'],['AR','아르헨티나'],['CL','칠레'],
  ['PE','페루'],['CO','콜롬비아'],['AU','호주'],['FR','프랑스'],['ES','스페인'],
  ['DE','독일'],['DK','덴마크'],['SE','스웨덴'],['PL','폴란드'],['GR','그리스'],
  ['TR','튀르키예'],['CZ','체코'],['BE','벨기에'],['IT','이탈리아'],
  ['GB','영국'],['SI','슬로베니아'],['HR','크로아티아'],['LT','리투아니아'],
  ['UA','우크라이나'],['NO','노르웨이'],['HK','홍콩'],['PH','필리핀'],
  ['MY','말레이시아'],['LB','레바논'],['DZ','알제리'],
  ['VE','베네수엘라'],['RO','루마니아'],['RS','세르비아']
];
const apiError = (e: any, fallback: string) => e?.response?.data?.error || fallback;

export default function AdminPlayers() {
  const {user,token} = useAuthStore();
  const headers = useMemo(() => ({Authorization:`Bearer ${token}`}),[token]);
  const [data,setData] = useState<Directory | null>(null);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [searchDraft,setSearchDraft] = useState('');
  const [query,setQuery] = useState('');
  const [season,setSeason] = useState('ALL');
  const [region,setRegion] = useState('ALL');
  const [missingOnly,setMissingOnly] = useState(false);
  const [missingPhotoOnly,setMissingPhotoOnly] = useState(false);
  const [page,setPage] = useState(1);
  const [selected,setSelected] = useState<Player|null>(null);
  const editorRef = useRef<HTMLElement|null>(null);
  const [overall,setOverall] = useState('90');
  const [stats,setStats] = useState<SixStats>(initialStats);
  const [nationality,setNationality] = useState('');
  const [applyAll,setApplyAll] = useState(true);
  const [photoAll,setPhotoAll] = useState(true);
  const [autoPhotos,setAutoPhotos] = useState<PhotoImportJob|null>(null);
  const [photoStarting,setPhotoStarting] = useState(false);
  useEffect(()=>{
    let mounted=true;
    const check=async()=>{
      try{
        const r=await axios.get(`${API_URL}/admin/worlds2026/photos/auto-status`,{headers});
        if(mounted)setAutoPhotos(r.data.data);
      }catch(error){ console.warn('자동 사진 등록 상태 조회 실패',error); }
    };
    void check();
    const timer=setInterval(()=>{void check();},4000);
    return ()=>{mounted=false;clearInterval(timer);};
  },[headers]);
  const startAutoPhotoImport=async()=>{
    setPhotoStarting(true);
    try{
      const r=await axios.post(`${API_URL}/admin/worlds2026/photos/auto-import`,{},{headers});
      setAutoPhotos(r.data.data);
      toast.success('전체 선수 사진 자동 등록을 시작했습니다.');
    }catch(e:any){toast.error(apiError(e,'자동 사진 등록을 시작할 수 없습니다.'));}
    finally{setPhotoStarting(false);}
  };


  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await axios.get(`${API_URL}/admin/player-directory`,{
        headers,params:{page,limit:50,q:query,season,region,missing:missingOnly?'1':'0',missingPhoto:missingPhotoOnly?'1':'0'}
      });
      setData(r.data.data);
    } catch(e:any) {
      setError(apiError(e,'전체 선수 목록을 불러오지 못했습니다.'));
    } finally {setLoading(false);}
  },[headers,page,query,season,region,missingOnly,missingPhotoOnly]);
  useEffect(()=>{void load();},[load]);

  const choose = (p:Player) => {
    setSelected(p);
    setOverall(String(p.season === '26WRs' ? (p.base_overall ?? p.overall) : p.overall));
    setStats(Object.fromEntries(statInputs.map(x=>[x.key,Number(p[x.key])])) as SixStats);
    setNationality(p.nationality || '');
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      window.requestAnimationFrame(() => editorRef.current?.scrollIntoView({behavior:'smooth',block:'start'}));
    }
  };
  const reloadSelection = (p:Player) => {
    setSelected(p);
    setData(prev=>prev?{...prev,players:prev.players.map(x=>x.id===p.id?p:x)}:prev);
  };
  const saveOverall = async () => {
    if(!selected)return;
    const value = Number(overall);
    if(!Number.isSafeInteger(value)||value<50||value>160){
      return toast.error('OVR은 50~160 사이의 정수로 입력해주세요.');
    }
    setBusy(true);
    try {
      const r=await axios.put(`${API_URL}/admin/player-overall/${selected.id}`,{overall:value},{headers});
      reloadSelection({...selected,overall:Number(r.data.data?.overall ?? value),base_overall:value,live_boost:Number(r.data.data?.boost ?? 0)});
      toast.success(r.data.message || 'OVR 저장 완료');
      await load();
    } catch(e:any){toast.error(apiError(e,'OVR 저장 실패'));}
    finally{setBusy(false);}
  };
  const saveSixStats=async()=>{
    if(!selected)return;
    if(statInputs.some(x=>!Number.isSafeInteger(stats[x.key]) || stats[x.key]<0 || stats[x.key]>100)){
      return toast.error('6가지 능력치는 0~100 사이 정수로 입력해주세요.');
    }
    setBusy(true);
    try{
      const r=await axios.put(`${API_URL}/admin/player-six-stats/${selected.id}`,stats,{headers});
      reloadSelection({...selected,...stats});
      toast.success(r.data.message||'능력치 저장 완료');
      await load();
    }catch(e:any){toast.error(apiError(e,'능력치 저장 실패'));}
    finally{setBusy(false);}
  };

  const saveNationality = async () => {
    if(!selected)return;
    const code = nationality.trim().toUpperCase();
    if(!/^[A-Z]{2}$/.test(code))return toast.error('국가 코드 두 글자를 입력해주세요. (예: KR)');
    setBusy(true);
    try {
      const r=await axios.put(`${API_URL}/admin/player-nationality/${selected.id}`,
        {nationality:code,applyToAllSeasons:applyAll},{headers});
      reloadSelection({...selected,nationality:code});
      toast.success(r.data.message || '국적 저장 완료');
      await load();
    } catch(e:any){toast.error(apiError(e,'국적 저장 실패'));}
    finally{setBusy(false);}
  };
  const upload = async (file?:File) => {
    if(!file||!selected)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size>5*1024*1024) {
      toast.error('5MB 이하 PNG·JPG·WebP 파일만 업로드할 수 있습니다.');
      return;
    }
    setBusy(true);
    try {
      const r=await axios.post(`${API_URL}/admin/worlds2026/photo/${selected.id}?all=${photoAll?'1':'0'}`,file,{
        headers:{...headers,'Content-Type':file.type}
      });
      const imageUrl = String(r.data.data?.imageUrl || '');
      if (!imageUrl) throw new Error('서버가 이미지 저장 경로를 반환하지 않았습니다.');
      reloadSelection({...selected,image_url:imageUrl});
      toast.success('선수 사진 저장 완료');
      // Refresh directory rows from DB to avoid showing transient, unsaved images.
      await load();
    } catch(e:any){toast.error(apiError(e,'사진 업로드 실패. 서버 폴더 권한을 확인하세요.'));}
    finally{setBusy(false);}
  };

  return <main className="min-h-0 bg-slate-950 px-3 py-4 text-white sm:px-4 sm:py-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/admin" className="mb-2 inline-flex items-center gap-2 text-sm text-sky-300 hover:underline">
            <ArrowLeft size={15}/>관리자 패널
          </Link>
          <h1 className="text-2xl font-black sm:text-3xl">전체 선수 카드 관리</h1>
          <p className="mt-2 text-sm text-slate-400">전체 선수 목록 · OVR 및 6스탯 수정 · 국적 및 선수 사진 관리</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={()=>void startAutoPhotoImport()} disabled={photoStarting||!!autoPhotos?.running}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 font-bold hover:bg-emerald-600 disabled:opacity-50">
            <ImagePlus size={17}/>{autoPhotos?.running?'자동 등록 중':'전체 선수 사진 자동 등록'}
          </button>
          <button onClick={()=>void load()} disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 hover:bg-slate-800">
            <RefreshCw size={16}/>새로고침
          </button>
        </div>
      </header>
      {user && !user.isAdmin && <p className="rounded-lg border border-red-600 bg-red-950 p-4">관리자 권한이 필요합니다.</p>}
      {autoPhotos?.startedAt && <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm">
        <strong className="text-emerald-300">나무위키 사진 자동 등록 {autoPhotos.running?'진행 중':'작업 종료'}</strong>
        <p className="mt-2 text-slate-300">
          저장 {autoPhotos.saved}명 · 찾지 못함 {autoPhotos.skipped}명 · 오류 {autoPhotos.failed}명
        </p>
        <p className="mt-1 truncate text-xs text-slate-500">{autoPhotos.last}</p>
        {autoPhotos.error && <p role="alert" className="mt-2 text-red-300">{autoPhotos.error}</p>}
        <p className="mt-2 text-xs text-slate-400">사진이 확인되지 않은 선수는 기존 이미지 그대로 남습니다. 작업 종료 후 새로고침하세요.</p>
      </div>}
      {error && <p role="alert" className="rounded-lg border border-red-700 bg-red-950 p-4 text-red-200">{error}</p>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4"><p className="text-xs text-slate-400">전체 검색 결과</p><p className="mt-1 text-2xl font-black">{data?.total?.toLocaleString() ?? '-'}</p></div>
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4"><p className="text-xs text-slate-400">국적 미등록 카드</p><p className="mt-1 text-2xl font-black text-amber-300">{data?.missingCount?.toLocaleString() ?? '-'}</p></div>
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4"><p className="text-xs text-slate-400">사진 미등록 카드</p><p className="mt-1 text-2xl font-black text-rose-300">{data?.missingPhotoCount?.toLocaleString() ?? '-'}</p></div>
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4"><p className="text-xs text-slate-400">현재 페이지</p><p className="mt-1 text-2xl font-black">{page} / {data?.totalPages ?? 1}</p></div>
      </div>
      <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <ListFilter className="text-sky-400" size={20}/>
          <form onSubmit={e=>{e.preventDefault();setPage(1);setQuery(searchDraft.trim());}} className="flex min-w-0 basis-full flex-1 gap-2 sm:basis-auto">
            <input aria-label="선수, 팀, ID 검색" value={searchDraft}
              onChange={e=>setSearchDraft(e.target.value)} placeholder="선수명 / 팀 / 카드 ID 검색"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-sm"/>
            <button type="submit" className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-4 py-2 font-bold">
              <Search size={17}/>검색
            </button>
          </form>
          <select aria-label="시즌" value={season} onChange={e=>{setSeason(e.target.value);setPage(1);}}
            className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-800 p-3 text-base sm:text-sm">
            {seasons.map(s=><option value={s} key={s}>{s==='ALL'?'모든 시즌':s}</option>)}
          </select>
          <select aria-label="리그" value={region} onChange={e=>{setRegion(e.target.value);setPage(1);}}
            className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-800 p-3 text-base sm:flex-none sm:text-sm">
            {regions.map(r=><option value={r} key={r}>{r==='ALL'?'모든 리그':r}</option>)}
          </select>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-600 px-3 py-3 text-xs">
            <input type="checkbox" checked={missingOnly} onChange={e=>{setMissingOnly(e.target.checked);setPage(1);}}/>
            국적 미등록만
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-600 px-3 py-3 text-xs">
            <input type="checkbox" checked={missingPhotoOnly} onChange={e=>{setMissingPhotoOnly(e.target.checked);setPage(1);}}/>
            사진 미등록만
          </label>
        </div>
      </section>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_350px]">
        <section className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800 text-xs text-slate-300">
                <tr><th className="p-3">선수</th><th className="p-3">팀/리그</th><th className="p-3">시즌/포지션</th><th className="p-3">국적</th><th className="p-3">OVR</th><th className="p-3">편집</th></tr>
              </thead>
              <tbody>
                {loading?<tr><td colSpan={6} className="p-6 text-slate-400">전체 선수 목록 불러오는 중...</td></tr>:
                  !data?.players.length?<tr><td colSpan={6} className="p-6 text-slate-400">검색 결과가 없습니다.</td></tr>:
                  data.players.map(p=><tr key={p.id} className={`border-t border-slate-800 hover:bg-slate-800/60 ${selected?.id===p.id?'bg-sky-950/60':''}`}>
                    <td className="p-3"><div className="font-bold">{p.name}</div><div className="text-xs text-slate-500">ID #{p.id}</div></td>
                    <td className="p-3"><div>{p.team}</div><div className="text-xs text-slate-400">{p.region}</div></td>
                    <td className="p-3"><div>{p.season || '-'}</div><div className="text-xs text-slate-400">{p.position}</div></td>
                    <td className="p-3"><CountryFlag code={p.nationality} size="sm" showCode/></td>
                    <td className="p-3 font-black text-sky-300">{p.overall}</td>
                    <td className="p-3"><button onClick={()=>choose(p)}
                      className="rounded bg-sky-600 px-3 py-2 font-semibold hover:bg-sky-500">수정</button></td>
                  </tr>)}
              </tbody>
            </table>
          </div>
          <div className="grid gap-2 p-3 md:hidden" aria-label="모바일 선수 목록">
            {loading?<p className="p-4 text-slate-300">선수 목록 불러오는 중...</p>:
              !data?.players.length?<p className="p-4 text-slate-300">검색 결과가 없습니다.</p>:
              data.players.map(p=><button key={p.id} type="button" onClick={()=>choose(p)}
                className={`flex min-h-20 w-full items-center justify-between gap-3 rounded-xl border p-3 text-left active:scale-[0.99] ${selected?.id===p.id?'border-sky-400 bg-sky-950/60':'border-slate-700 bg-slate-800'}`}>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-base">{p.name}</strong>
                  <span className="block truncate text-xs text-slate-300">{p.team} · {p.season} · {p.position}</span>
                  <span className="text-xs text-slate-400">#{p.id} · {p.region}</span>
                </div>
                <div className="shrink-0 text-right">
                  <span className="block text-lg font-black text-sky-300">{p.overall} OVR</span>
                  <span className="text-xs font-semibold text-sky-300">편집하기 ›</span>
                </div>
              </button>)}
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 p-3 text-sm sm:p-4">
            <span className="text-slate-400">{data?.total?.toLocaleString() ?? 0}개 중 {data?.players.length ?? 0}개 표시</span>
            <div className="flex gap-2">
              <button disabled={page<=1 || loading} onClick={()=>setPage(p=>Math.max(1,p-1))}
                className="rounded border border-slate-700 px-3 py-2 disabled:opacity-40"><ChevronLeft size={18}/></button>
              <span className="self-center">{page} / {data?.totalPages || 1}</span>
              <button disabled={page>=(data?.totalPages || 1) || loading}
                onClick={()=>setPage(p=>p+1)}
                className="rounded border border-slate-700 px-3 py-2 disabled:opacity-40"><ChevronRight size={18}/></button>
            </div>
          </footer>
        </section>
        <aside ref={editorRef} className="scroll-mt-28 rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-5 lg:sticky lg:top-24">
          {!selected?<p className="text-sm text-slate-400">왼쪽 선수 목록에서 <strong>수정</strong>을 누르면 OVR·국적·사진 편집창이 열립니다.</p>:<>
            <div className="mb-3 flex items-center justify-between gap-2 lg:hidden">
              <strong className="text-sm text-sky-300">선수 편집</strong>
              <button type="button" onClick={()=>{setSelected(null);window.scrollTo({top:0,behavior:'smooth'});}}
                className="min-h-11 rounded-lg border border-slate-600 px-4 text-sm">목록으로</button>
            </div>
            <p className="text-xs text-sky-300">{selected.team} / {selected.region} / {selected.season}</p>
            <h2 className="my-2 text-xl font-black">{selected.name} <span className="text-sm font-normal text-slate-400">{selected.position}</span></h2>
            <div className="mb-4 flex items-center gap-3"><CountryFlag code={selected.nationality} showCode showName /></div>
            <div className="mb-4 flex min-h-36 items-center justify-center rounded-xl border border-slate-700 bg-slate-800">
              {selected.image_url?<img src={selected.image_url} alt={selected.name} className="h-40 max-w-full object-contain"/>:
                <span className="text-sm text-slate-400">등록된 선수 사진 없음</span>}
            </div>
            <div className="space-y-5">
              <div>
                <label htmlFor="edit-ovr" className="mb-1 block text-sm font-bold">{selected.season === '26WRs' ? '기준 OVR (라이브 부스트 제외)' : '카드 OVR (해당 시즌만 변경)'}</label>
                <div className="flex gap-2">
                  <input id="edit-ovr" type="number" min={50} max={160} step={1} value={overall}
                    onChange={e=>setOverall(e.target.value)}
                    className="w-full min-w-0 rounded border border-slate-600 bg-slate-800 p-3"/>
                  <button disabled={busy} onClick={()=>void saveOverall()}
                    className="inline-flex min-h-12 items-center gap-1 rounded bg-sky-600 px-4 font-bold disabled:opacity-50"><Save size={16}/>저장</button>
                </div>
                {selected.season === '26WRs' && <p className="mt-2 text-xs text-amber-300">현재 라이브 {Number(selected.live_boost || 0) > 0 ? '+' : ''}{Number(selected.live_boost || 0)} / 최종 OVR {Number(overall || 0) + Number(selected.live_boost || 0)}</p>}
              </div>
              <div>
                <p className="mb-3 text-sm font-bold">6가지 선수 능력치 (해당 시즌)</p>
                <div className="grid grid-cols-2 gap-3">
                  {statInputs.map(item=><label key={item.key} className="text-sm text-slate-300">
                    <span className="mb-1 block">{item.label}</span>
                    <input aria-label={item.label} type="number" min={0} max={100} step={1}
                      value={stats[item.key]}
                      onChange={e=>setStats(prev=>({...prev,[item.key]:Number(e.target.value)}))}
                      className="w-full rounded border border-slate-600 bg-slate-800 p-2 text-white"/>
                  </label>)}
                </div>
                <button onClick={()=>void saveSixStats()} disabled={busy}
                  className="mt-3 inline-flex items-center gap-2 rounded bg-violet-600 px-4 py-3 font-bold disabled:opacity-50">
                  <Save size={16}/>6스탯 저장
                </button>
              </div>
              <div>
                <label htmlFor="edit-nationality" className="mb-1 block text-sm font-bold">국적 코드</label>
                <div className="flex gap-2">
                  <input id="edit-nationality" value={nationality} maxLength={2}
                    list="directory-country-codes"
                    onChange={e=>setNationality(e.target.value.toUpperCase())}
                    placeholder="KR" className="w-full min-w-0 rounded border border-slate-600 bg-slate-800 p-3"/>
                  <datalist id="directory-country-codes">{countryOptions.map(([c,n])=><option key={c} value={c}>{n}</option>)}</datalist>
                  <button disabled={busy} onClick={()=>void saveNationality()}
                    className="inline-flex min-h-12 items-center gap-1 rounded bg-amber-600 px-4 font-bold disabled:opacity-50"><Save size={16}/>저장</button>
                </div>
                <label className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" checked={applyAll} onChange={e=>setApplyAll(e.target.checked)}/>
                  같은 선수·팀·포지션의 모든 시즌에 국적 적용
                </label>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold">선수 사진 업로드</p>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-sky-500 p-4 text-center text-sm hover:bg-slate-800">
                  <ImagePlus size={20}/>PNG / JPG / WebP (최대 5MB)
                  <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy}
                    className="sr-only" onChange={e=>{void upload(e.target.files?.[0]);e.target.value='';}}/>
                </label>
                <label className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" checked={photoAll} onChange={e=>setPhotoAll(e.target.checked)}/>
                  같은 선수·팀·포지션의 모든 시즌에 사진 적용 (12WR 포함)
                </label>
                <p className="mt-2 text-xs text-slate-400">저장 후 선수 카드 이미지가 갱신됩니다. 서버 uploads/players 쓰기 권한이 필요합니다.</p>
              </div>
            </div>
          </>}
        </aside>
      </div>
    </div>
  </main>;
}

import {useCallback,useEffect,useMemo,useState} from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {useAuthStore} from '../store/authStore';
import {getPlayerImageUrl} from '../utils/playerImage';
import LiveBoostTrend,{LiveBoostBadge} from './LiveBoostTrend';
import {Search,Star,History,TrendingUp,ArrowDownUp,RefreshCw,ShoppingCart,Medal,Filter} from 'lucide-react';

const API=import.meta.env.PROD?'/api':(import.meta.env.VITE_API_URL||'http://localhost:5000/api');
const grades=Array.from({length:11},(_,i)=>i);
const formatP=(n:number|null|undefined)=>n===null||n===undefined?'—':Number(n).toLocaleString('ko-KR')+'P';
type Player={id:number;player_id?:number;name:string;team:string;position:string;season:string;
  overall:number;salary?:number;image_url?:string|null;live_boost?:number;lowest_price?:number|null;listing_count?:number;
  sold_count?:number};
type Favorite=Player&{player_id:number;enhancement_level:number};
type Listing={listing_id:number;seller_id:number;listing_price:number;seller_username:string;level:number;listed_at:string};
type Trade={id:number;player_id:number;name:string;team:string;season:string;overall:number;
  enhancement_level:number;listing_price:number;sold_price:number|null;status:string;
  listed_at:string;sold_at:string|null;seller_id:number;buyer_id:number|null;
  seller_username:string;buyer_username?:string|null};
type GradeData={player:Player;grade:number;listings:Listing[];
  history:{id:number;price:number;date:string}[];lowestPrice:number|null;latestSold:number|null};

function PriceGraph({history}:{history:GradeData['history']}){
  if(history.length===0)return <p className="flex h-40 items-center justify-center rounded-lg border border-slate-700 text-sm text-slate-500">이 강화등급의 실제 거래 기록이 없습니다.</p>;
  const arr=history.slice(-30);
  const values=arr.map(x=>Number(x.price));
  const max=Math.max(...values),min=Math.min(...values);
  const y=(v:number)=>160-(v-min)/Math.max(1,max-min)*130;
  const x=(i:number)=>arr.length===1?260:20+i*480/(arr.length-1);
  const pts=arr.map((v,i)=>x(i)+','+y(v.price)).join(' ');
  return <div className="rounded-xl border border-slate-700 bg-slate-950/80 p-3">
    <svg viewBox="0 0 520 192" className="w-full" role="img" aria-label="강화 등급별 실제 거래 가격 추이">
      {[0,1,2].map(i=><line key={i} x1="15" x2="505" y1={30+i*65} y2={30+i*65} stroke="#334155" strokeDasharray="4 4"/>)}
      <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
      {arr.map((v,i)=><circle key={v.id} cx={x(i)} cy={y(v.price)} r={arr.length<25?3.5:2} fill="#fbbf24"><title>{formatP(v.price)}</title></circle>)}
      <text x="15" y="14" fontSize="10" fill="#94a3b8">{formatP(max)}</text>
      <text x="505" y="185" fontSize="10" textAnchor="end" fill="#94a3b8">{formatP(min)}</text>
    </svg>
    <p className="text-center text-xs text-slate-400">실제 체결된 최근 {arr.length}건 · 매물 등록가는 그래프에 포함되지 않습니다.</p>
  </div>;
}
export default function MarketExplorer({onPurchased}:{onPurchased?:()=>void}){
  const {token,user,updateUser}=useAuthStore();
  const headers=useMemo(()=>({Authorization:'Bearer '+token}),[token]);
  const [tab,setTab]=useState<'search'|'interest'|'history'>('search');
  const [search,setSearch]=useState('');
  const [season,setSeason]=useState('');
  const [team,setTeam]=useState('');
  const [grade,setGrade]=useState(0);
  const [sort,setSort]=useState('overall');
  const [teams,setTeams]=useState<string[]>([]);
  const [classes,setClasses]=useState<string[]>([]);
  const [players,setPlayers]=useState<Player[]>([]);
  const [popular,setPopular]=useState<Player[]>([]);
  const [favorites,setFavorites]=useState<Favorite[]>([]);
  const [trades,setTrades]=useState<Trade[]>([]);
  const [suggestions,setSuggestions]=useState<Player[]>([]);
  const [selected,setSelected]=useState<Player|null>(null);
  const [detail,setDetail]=useState<GradeData|null>(null);
  const [trendId,setTrendId]=useState<number|null>(null);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [detailError,setDetailError]=useState('');
  const [loadError,setLoadError]=useState('');
  const [refreshTick,setRefreshTick] = useState(0);
  useEffect(()=>{
    const refresh=()=>{ if(document.visibilityState==='visible') setRefreshTick(t=>t+1); };
    const timer=window.setInterval(refresh,15000);
    window.addEventListener('lcg:data-updated',refresh);
    return ()=>{window.clearInterval(timer);window.removeEventListener('lcg:data-updated',refresh);};
  },[]);
  const choose=(p:Player,nextGrade:number=grade)=>{
    setSelected(p);setGrade(nextGrade);setDetail(null);setDetailError('');
  };
  const refreshMeta=useCallback(async()=>{
    const out=await Promise.allSettled([
      axios.get(API+'/market/popular',{headers}),
      axios.get(API+'/market/teams',{headers}),
      axios.get(API+'/market/classes',{headers}),
      axios.get(API+'/market/favorites',{headers}),
      axios.get(API+'/market/transactions',{headers})
    ]);
    if(out[0].status==='fulfilled')setPopular(out[0].value.data.data||[]);
    if(out[1].status==='fulfilled')setTeams((out[1].value.data.data||[]).map((r:any)=>String(r.team)));
    if(out[2].status==='fulfilled')setClasses((out[2].value.data.data||[]).map((r:any)=>String(r.season)));
    if(out[3].status==='fulfilled')setFavorites(out[3].value.data.data||[]);
    if(out[4].status==='fulfilled')setTrades(out[4].value.data.data||[]);
  },[headers]);
  useEffect(()=>{void refreshMeta();},[refreshMeta,refreshTick]);
  useEffect(()=>{
    let active=true;
    const timer=setTimeout(async()=>{
      setLoading(true);setLoadError('');
      try{
        const r=await axios.get(API+'/market/browse',{
          headers,params:{name:search,team,season,grade,sort,limit:80}
        });
        if(active)setPlayers(r.data.data||[]);
      }catch(e:any){
        if(active){setPlayers([]);setLoadError(e.response?.data?.error||'선수 목록 조회에 실패했습니다.');}
      }finally{if(active)setLoading(false);}
    },250);
    return ()=>{active=false;clearTimeout(timer);};
  },[search,team,season,grade,sort,headers,refreshTick]);
  useEffect(()=>{
    let active=true;
    if(search.trim().length<1){setSuggestions([]);return;}
    const timer=setTimeout(async()=>{
      try{
        const r=await axios.get(API+'/market/autocomplete',{headers,params:{q:search}});
        if(active)setSuggestions(r.data.data||[]);
      }catch{if(active)setSuggestions([]);}
    },220);
    return ()=>{active=false;clearTimeout(timer);};
  },[search,headers]);
  useEffect(()=>{
    if(!selected){setDetail(null);return;}
    let active=true;
    setDetail(null);setDetailError('');
    axios.get(API+'/market/grade/'+(selected.player_id||selected.id)+'/'+grade,{headers})
      .then(r=>{if(active)setDetail(r.data.data);})
      .catch(e=>{if(active)setDetailError(e.response?.data?.error||'선수 시세를 불러오지 못했습니다.');});
    return ()=>{active=false;};
  },[selected,grade,headers,refreshTick]);
  const isFavorite=selected&&favorites.some(f=>Number(f.player_id)===Number(selected.player_id||selected.id)&&Number(f.enhancement_level)===grade);
  const favorite=async()=>{
    if(!selected)return;
    const id=selected.player_id||selected.id;
    setBusy(true);
    try{
      if(isFavorite)await axios.delete(API+'/market/favorites/'+id+'/'+grade,{headers});
      else await axios.post(API+'/market/favorites',{playerId:id,grade},{headers});
      toast.success(isFavorite?'관심 선수에서 제거했습니다.':'관심 선수에 등록했습니다.');
      await refreshMeta();
    }catch(e:any){toast.error(e.response?.data?.error||'관심 선수 저장 실패');}
    finally{setBusy(false);}
  };
  const purchase=async(l:Listing)=>{
    if(Number(l.seller_id)===Number(user?.id))return toast.error('내 매물은 구매할 수 없습니다.');
    if(!window.confirm((selected?.name||'선수')+' +'+grade+' 카드를 '+formatP(l.listing_price)+'에 구매하시겠습니까?'))return;
    setBusy(true);
    try{
      await axios.post(API+'/market/buy/'+l.listing_id,{}, {headers});
      toast.success('구매가 완료되었습니다.');
      const u=await axios.get(API+'/auth/me',{headers});
      if(u.data.success)updateUser(u.data.data);
      const r=await axios.get(API+'/market/grade/'+(selected?.player_id||selected?.id)+'/'+grade,{headers});
      setDetail(r.data.data);
      await refreshMeta();
      onPurchased?.();
    }catch(e:any){toast.error(e.response?.data?.error||'구매할 수 없습니다.');}
    finally{setBusy(false);}
  };
  return <section className="space-y-4" aria-label="선수 이적시장 검색과 시세">
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      {popular.map((p,i)=><button key={p.id} type="button"
        onClick={()=>{setTab('search');choose(p,0);}}
        className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 p-3 text-left hover:border-amber-500">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-600/25 text-xl font-black text-amber-300">{i+1}</span>
        <img src={getPlayerImageUrl(p.name,p.season,undefined,p.image_url||undefined)} alt="" className="h-14 w-12 shrink-0 object-contain"/>
        <div className="min-w-0"><div className="flex items-center gap-2"><Medal size={14} className="text-amber-300"/><strong className="truncate">{p.name}</strong></div>
          <p className="text-xs text-slate-400">{p.team} · {Number(p.overall) + grade} OVR · 급여 {p.salary ?? '—'}</p>
          <p className="text-xs text-sky-300">체결 {p.sold_count||0}건 · 매물 {p.listing_count||0}건</p></div>
      </button>)}
    </div>
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-700 pb-3">
      <button onClick={()=>setTab('search')} className={'rounded-lg px-4 py-2 text-sm font-bold '+(tab==='search'?'bg-sky-700 text-white':'bg-slate-800 text-slate-300')}><Search size={15} className="mr-1 inline"/>선수 검색</button>
      <button onClick={()=>setTab('interest')} className={'rounded-lg px-4 py-2 text-sm font-bold '+(tab==='interest'?'bg-sky-700 text-white':'bg-slate-800 text-slate-300')}><Star size={15} className="mr-1 inline"/>관심 선수 ({favorites.length})</button>
      <button onClick={()=>setTab('history')} className={'rounded-lg px-4 py-2 text-sm font-bold '+(tab==='history'?'bg-sky-700 text-white':'bg-slate-800 text-slate-300')}><History size={15} className="mr-1 inline"/>내 거래목록</button>
      <button onClick={()=>{void refreshMeta();setDetail(null);setSelected(null);}} className="ml-auto rounded-lg border border-slate-600 px-3 py-2 text-sm"><RefreshCw size={15} className="inline"/> 새로고침</button>
    </div>
    {tab==='history'?<div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900">
      <table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-slate-800 text-slate-300"><tr>
        <th className="p-3">선수 / 클래스</th><th className="p-3">강화</th><th className="p-3">상태</th><th className="p-3">가격</th><th className="p-3">구분</th><th className="p-3">일시</th>
      </tr></thead><tbody>{trades.map(t=><tr key={t.id} className="border-t border-slate-800">
        <td className="p-3">{t.name}<span className="ml-1 text-xs text-slate-400">{t.season}</span></td>
        <td className="p-3">+{t.enhancement_level??0}</td><td className="p-3">{t.status==='SOLD'?'거래 완료':t.status==='LISTED'?'판매 중':'취소'}</td>
        <td className="p-3 text-amber-300">{formatP(t.sold_price??t.listing_price)}</td>
        <td className="p-3">{Number(t.buyer_id)===Number(user?.id)?'구매':'판매'}</td>
        <td className="p-3 text-xs text-slate-400">{new Date(t.sold_at||t.listed_at).toLocaleString('ko-KR')}</td>
      </tr>)}</tbody></table>
      {!trades.length&&<p className="p-8 text-center text-slate-400">거래 내역이 없습니다.</p>}
    </div>:<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.18fr)]">
      <div className="min-w-0 space-y-3 rounded-xl border border-slate-700 bg-slate-900 p-4">
        {tab==='search'?<>
          <div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={17}/>
            <input aria-label="선수 이름 자동완성" value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="선수 이름 · 클래스 · 팀 검색" className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm"/>
            {suggestions.length>0&&<div className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-slate-600 bg-slate-800 shadow-xl">
              {suggestions.map((p,i)=><button key={p.player_id+'-'+i} type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-700"
                onClick={()=>{setSearch(p.name);setSuggestions([]);choose({...p,id:p.player_id||p.id},grade);}}>
                {p.name} <span className="text-xs text-slate-400">{p.team} · {p.season}</span>
              </button>)}
            </div>}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label className="space-y-1"><span className="text-xs text-slate-400">클래스</span>
              <select value={season} onChange={e=>setSeason(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 p-2">
                <option value="">전체 클래스</option>{classes.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="space-y-1"><span className="text-xs text-slate-400">팀컬러</span>
              <select value={team} onChange={e=>setTeam(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 p-2">
                <option value="">전체 팀</option>{teams.map(t=><option value={t} key={t}>{t}</option>)}
              </select>
            </label>
            <label className="space-y-1"><span className="text-xs text-slate-400">강화 등급</span>
              <select value={grade} onChange={e=>setGrade(Number(e.target.value))} className="w-full rounded border border-slate-700 bg-slate-950 p-2">
                {grades.map(v=><option key={v} value={v}>+{v}강</option>)}
              </select>
            </label>
            <label className="space-y-1"><span className="text-xs text-slate-400">정렬</span>
              <select value={sort} onChange={e=>setSort(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 p-2">
                <option value="overall">OVR 높은 순</option><option value="price_asc">최저가 순</option>
                <option value="price_desc">최고가 순</option><option value="sold">거래 많은 순</option>
                <option value="name">이름 순</option><option value="recent">신규 순</option>
              </select>
            </label>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400"><Filter size={13}/> 검색 결과 {players.length}명 (최대 80명)</div>
          {loadError&&<p role="alert" className="text-rose-300">{loadError}</p>}
        </>:<div className="text-sm text-slate-300">관심 선수는 선수와 강화 등급을 각각 저장합니다. 클릭하면 해당 등급의 매물과 거래 기록이 표시됩니다.</div>}
        <div className="max-h-[580px] overflow-auto rounded-lg border border-slate-800">
          {tab==='search'?(loading?<p className="p-5 text-slate-400">선수를 검색하고 있습니다...</p>:players.map(p=><button key={p.id}
            type="button" onClick={()=>choose(p,grade)}
            className={'grid w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2 border-b border-slate-800 p-2 text-left text-sm hover:bg-slate-800 '+(selected?.id===p.id?'bg-sky-950':'')}>
            <img src={getPlayerImageUrl(p.name,p.season,undefined,p.image_url||undefined)} alt="" className="h-12 w-10 object-contain"/>
            <div className="min-w-0"><strong className="block truncate">{p.name}</strong><span className="text-xs text-slate-400">{p.season} · {p.team} · +{grade} · 급여 {p.salary ?? '—'}</span>
              {p.season==='26WRs'&&<LiveBoostBadge boost={Number(p.live_boost)||0}/>}
            </div>
            <div className="text-right"><strong className="text-sky-300">{Number(p.overall) + grade}</strong><p className="text-xs text-amber-300">{formatP(p.lowest_price)}</p><p className="text-xs text-slate-500">{p.listing_count||0}매물</p></div>
          </button>)):favorites.map(f=><button key={f.player_id+'-'+f.enhancement_level}
            type="button" onClick={()=>choose({...f,id:f.player_id},Number(f.enhancement_level))}
            className="flex w-full items-center justify-between border-b border-slate-800 p-3 text-left text-sm hover:bg-slate-800">
            <div><strong>{f.name}</strong><p className="text-xs text-slate-400">{f.team} · {f.season} · 급여 {f.salary ?? '—'}</p></div>
            <span className="font-bold text-amber-300">+{f.enhancement_level}강</span>
          </button>)}
          {tab==='search'&&!loading&&players.length===0&&<p className="p-5 text-center text-slate-400">검색 결과가 없습니다.</p>}
          {tab==='interest'&&favorites.length===0&&<p className="p-5 text-center text-slate-400">등록한 관심 선수가 없습니다.</p>}
        </div>
      </div>
      <div className="min-w-0 space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
        {!selected?<div className="flex min-h-80 flex-col items-center justify-center gap-3 text-slate-400"><TrendingUp size={34}/><p>왼쪽에서 선수를 선택하면 시세·매물·그래프가 나옵니다.</p></div>:<>
          <div className="flex gap-4">
            <img src={getPlayerImageUrl(selected.name,selected.season,undefined,selected.image_url||undefined)} alt={selected.name} className="h-28 w-24 rounded-xl bg-slate-950 object-contain"/>
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-black">{selected.name}</h3>
              <p className="text-sm text-slate-400">{selected.team} · {selected.position} · {selected.season} · 급여 {detail?.player?.salary ?? selected.salary ?? '—'}</p>
              <p className="mt-2 text-xl font-bold text-sky-300">{Number(detail?.player?.overall ?? selected.overall) + grade} OVR <span className="text-sm text-amber-300">+{grade}강</span></p>
              {selected.season==='26WRs'&&<LiveBoostBadge boost={Number(detail?.player?.live_boost??selected.live_boost)||0}/>}
              <div className="mt-2 flex flex-wrap gap-2">
                <button disabled={busy} onClick={()=>void favorite()} className="rounded-lg border border-amber-500/50 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-950">
                  <Star size={14} className="mr-1 inline"/>{isFavorite?'관심 해제':'관심 등록'}
                </button>
                {selected.season==='26WRs'&&<button onClick={()=>setTrendId(selected.player_id||selected.id)} className="rounded-lg border border-sky-500/50 px-3 py-1.5 text-xs text-sky-300">라이브 OVR 그래프</button>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 border-y border-slate-700 py-3 text-sm">
            <span className="text-slate-400">조회 등급</span>
            <select aria-label="시세 강화 등급" value={grade} onChange={e=>setGrade(Number(e.target.value))}
              className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2">
              {grades.map(v=><option key={v} value={v}>+{v}강</option>)}
            </select>
            <span className="ml-auto text-amber-300">최저가 {formatP(detail?.lowestPrice)}</span>
          </div>
          {detailError&&<p role="alert" className="text-rose-300">{detailError}</p>}
          {!detail&&!detailError?<p className="py-8 text-center text-slate-400">실제 매물과 거래 기록 조회 중...</p>:detail&&<>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-bold"><ArrowDownUp size={16} className="mr-1 inline text-blue-400"/>실제 거래 가격 추이</h4>
              <span className="text-xs text-slate-400">최근 거래 {formatP(detail.latestSold)}</span>
            </div>
            <PriceGraph history={detail.history}/>
            <h4 className="font-bold">+{grade}강 판매 매물 ({detail.listings.length})</h4>
            <div className="max-h-64 overflow-auto rounded-lg border border-slate-800">
              {detail.listings.map(l=><div key={l.listing_id} className="flex items-center justify-between gap-3 border-b border-slate-800 p-3 text-sm">
                <div><p className="text-xs text-slate-400">판매자 {l.seller_username}</p><p className="font-bold text-amber-300">{formatP(l.listing_price)}</p></div>
                <button disabled={busy||Number(user?.id)===Number(l.seller_id)} onClick={()=>void purchase(l)}
                  className="rounded-lg bg-sky-700 px-4 py-2 font-bold hover:bg-sky-600 disabled:opacity-40">
                  <ShoppingCart className="mr-1 inline" size={14}/>{Number(user?.id)===Number(l.seller_id)?'내 매물':'구매'}
                </button>
              </div>)}
              {!detail.listings.length&&<p className="p-5 text-sm text-slate-400">이 강화등급에는 현재 판매 매물이 없습니다.</p>}
            </div>
          </>}
        </>}
      </div>
    </div>}
    {trendId!==null&&<LiveBoostTrend playerId={trendId} onClose={()=>setTrendId(null)}/>}
  </section>;
}

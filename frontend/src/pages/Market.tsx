import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { ShoppingCart, Search, RefreshCw, Tag, Trash2, UserRound } from 'lucide-react';
import CountryFlag from '../components/CountryFlag';
import LiveBoostTrend,{LiveBoostBadge} from '../components/LiveBoostTrend';
import MarketExplorer from '../components/MarketExplorer';
import {getPlayerImageUrl} from '../utils/playerImage';

const API_URL = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');

type Listing = {
  listing_id: number; player_id:number; card_id:number; seller_id:number;
  name:string; team:string; position:string; season:string;
  overall:number; salary:number; image_url?:string|null; level:number; listing_price:number; seller_username:string;
  live_boost?:number;base_overall?:number;
};
type MyCard = {
  id:number; level:number;
  player: { id:number; name:string; team:string; position:string; overall:number; salary?:number; season?:string; nationality?:string|null; image_url?:string|null; live_boost?:number; };
};
type OwnListing = Listing & { status:string };
const maxPrice = (level:number) => 50000 * (1 + Math.max(0, Math.min(10, Number(level)||0)));
const points = (n:number) => Number(n||0).toLocaleString('ko-KR') + 'P';

export default function Market() {
  const { user, token, updateUser } = useAuthStore();
  const headers = useMemo(()=>({Authorization:`Bearer ${token}`}),[token]);
  const [listings,setListings] = useState<Listing[]>([]);
  const [myCards,setMyCards] = useState<MyCard[]>([]);
  const [myListings,setMyListings] = useState<OwnListing[]>([]);
  const [search,setSearch] = useState('');
  const [inventorySearch,setInventorySearch] = useState('');
  const [busy,setBusy] = useState(false);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [sellCard,setSellCard] = useState<number|null>(null);
  const [trendId,setTrendId] = useState<number|null>(null);
  const [sellPrice,setSellPrice] = useState(1000);

  const load = useCallback(async()=>{
    setLoading(true);
    setError('');
    try{
      // Listings are independent of the user's card inventory; don't hide the
      // whole market if a secondary endpoint fails.
      const results=await Promise.allSettled([
        axios.get(`${API_URL}/market/listings?sort=date_desc`,{headers}),
        axios.get(`${API_URL}/deck/cards`,{headers}),
        axios.get(`${API_URL}/market/my-listings`,{headers}),
      ]);
      const [market, cards, mine]=results;
      if(market.status==='fulfilled') setListings(market.value.data?.data || []);
      else setError('판매 매물 목록을 불러오지 못했습니다.');
      if(cards.status==='fulfilled') setMyCards(cards.value.data?.data || []);
      if(mine.status==='fulfilled') setMyListings(mine.value.data?.data || []);
    }catch(e:any){setError(e.response?.data?.error||'이적시장을 불러오지 못했습니다.');}
    finally{setLoading(false);}
  },[headers]);
  useEffect(()=>{
    void load();
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener('lcg:data-updated', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('lcg:data-updated', refresh);
    };
  },[load]);

  const activeIds = useMemo(()=>new Set(myListings.filter(m=>m.status==='LISTED').map(m=>m.card_id)),[myListings]);
  const saleCards = myCards.filter(c=>!activeIds.has(c.id));
  const visibleSaleCards = saleCards.filter(c => [c.player.name,c.player.team,c.player.season,c.player.position]
    .some(v=>String(v||'').toLowerCase().includes(inventorySearch.trim().toLowerCase())));
  const selected = saleCards.find(c=>c.id===sellCard);
  const filtered = listings.filter(l=>[l.name,l.team,l.season,l.position].some(v=>
    String(v||'').toLowerCase().includes(search.trim().toLowerCase())));
  const activeOwn = myListings.filter(l=>l.status==='LISTED');

  const buy = async(l:Listing) => {
    if(Number(l.seller_id)===Number(user?.id)) return toast.error('본인의 매물은 구매할 수 없습니다.');
    if(!window.confirm(`${l.name} 카드를 ${points(l.listing_price)}에 구매하시겠습니까?`)) return;
    setBusy(true);
    try{
      await axios.post(`${API_URL}/market/buy/${l.listing_id}`,{},{headers});
      toast.success('카드 구매 완료');
      const r=await axios.get(`${API_URL}/auth/me`,{headers});
      if(r.data.success)updateUser(r.data.data);
      await load();
    }catch(e:any){toast.error(e.response?.data?.error||'구매 실패');}
    finally{setBusy(false);}
  };
  const list = async()=>{
    if(!selected)return toast.error('등록할 카드를 먼저 선택하세요.');
    if(!Number.isSafeInteger(sellPrice)||sellPrice<1||sellPrice>maxPrice(selected.level)){
      return toast.error(`판매가는 1P ~ ${points(maxPrice(selected.level))} 범위로 입력해주세요.`);
    }
    setBusy(true);
    try{
      await axios.post(`${API_URL}/market/list`,{cardId:selected.id,price:sellPrice},{headers});
      toast.success('판매 목록에 등록했습니다.');
      setSellCard(null);setSellPrice(1000);
      await load();
    }catch(e:any){toast.error(e.response?.data?.error||'판매 등록 실패');}
    finally{setBusy(false);}
  };
  const editPrice=async(l:OwnListing)=>{
    const raw=window.prompt(l.name+' +'+l.level+'강 새 판매가격 (P)',String(l.listing_price));
    if(raw===null)return;
    const amount=Number(raw.trim());
    if(!Number.isSafeInteger(amount)||amount<1||amount>maxPrice(l.level)){
      toast.error('판매 가격은 1P부터 '+points(maxPrice(l.level))+'까지 가능합니다.');return;
    }
    setBusy(true);
    try{
      await axios.patch(API_URL+'/market/listing/'+l.listing_id+'/price',{price:amount},{headers});
      toast.success('판매 가격을 변경했습니다.');
      await load();
    }catch(e:any){toast.error(e.response?.data?.error||'판매 가격 변경 실패');}
    finally{setBusy(false);}
  };
  const cancel = async(id:number)=>{
    if(!window.confirm('판매 등록을 취소하시겠습니까?'))return;
    setBusy(true);
    try{
      await axios.delete(`${API_URL}/market/listing/${id}`,{headers});
      toast.success('판매 등록 취소 완료');
      await load();
    }catch(e:any){toast.error(e.response?.data?.error||'매물 취소 실패');}
    finally{setBusy(false);}
  };

  return <main className="min-h-screen bg-gray-950 px-4 py-8 text-white">
    <div className="mx-auto max-w-6xl space-y-7">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-black"><ShoppingCart className="h-8 w-8 text-sky-400"/>이적시장</h1>
          <p className="mt-2 text-sm text-slate-400">유저가 실제 등록한 매물만 표시 · 예약 매수 없이 직접 거래합니다.</p>
        </div>
        <button onClick={()=>void load()} disabled={busy} className="flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 hover:bg-slate-800 disabled:opacity-40">
          <RefreshCw className="h-4 w-4"/>새로고침
        </button>
      </header>
      {error&&<div role="alert" className="rounded-lg border border-red-700 bg-red-950 p-4 text-red-200">
        {error}<button className="ml-3 underline" onClick={()=>void load()}>다시 시도</button>
      </div>}
      <MarketExplorer onPurchased={()=>{void load();}}/>
      <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
        <h2 className="mb-2 flex items-center gap-2 text-xl font-bold"><Tag className="h-5 w-5 text-amber-400"/>보유 카드 선택</h2>
        <p className="mb-4 text-sm text-slate-400">판매할 선수를 목록에서 선택하세요. 0강 상한 50,000P, 강화 +1마다 상한 50,000P 증가.</p>
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3">
          <Search className="h-4 w-4 text-slate-400"/>
          <input value={inventorySearch} onChange={e=>setInventorySearch(e.target.value)}
            aria-label="보유 카드 검색" placeholder="선수명, 팀, 시즌 검색"
            className="w-full bg-transparent p-3 text-sm outline-none"/>
        </div>
        {visibleSaleCards.length===0?
          <p className="rounded-lg border border-slate-700 p-5 text-sm text-slate-400">
            {saleCards.length?'검색된 보유 카드가 없습니다.':'판매할 수 있는 보유 카드가 없습니다.'}
          </p>:
          <div className="grid max-h-[32rem] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {visibleSaleCards.map(c=>{
              const selectedCard = c.id===sellCard;
              return <button key={c.id} type="button" aria-pressed={selectedCard}
                onClick={()=>{setSellCard(c.id);setSellPrice(1000);}}
                className={`overflow-hidden rounded-xl border p-3 text-left transition ${selectedCard?
                  'border-amber-400 bg-amber-950/40 ring-2 ring-amber-400/60':
                  'border-slate-700 bg-slate-800 hover:border-slate-500'}`}>
                <div className="relative mb-2 flex h-28 items-center justify-center overflow-hidden rounded-lg bg-slate-900">
                  <UserRound className="absolute h-12 w-12 text-slate-600"/>
                  <img src={getPlayerImageUrl(c.player.name,c.player.season||'26 LIVE',undefined,c.player.image_url||undefined)}
                    alt={c.player.name} loading="lazy"
                    onError={e=>{e.currentTarget.style.display='none';}}
                    className="relative z-10 h-full max-w-full object-contain"/>
                </div>
                <div className="mb-1 flex items-center justify-between gap-1">
                  <span className="truncate text-sm font-black">{c.player.name}</span>
                  <CountryFlag code={c.player.nationality} size="sm"/>
                </div>
                <div className="truncate text-xs text-slate-400">{c.player.team}</div>
                <div className="mt-1 text-xs text-slate-400">{c.player.season||'26'} · {c.player.position}</div>
                <div className="mt-2 flex justify-between text-sm font-bold">
                  <span className="text-sky-300">{c.player.overall} OVR · 급여 {c.player.salary ?? '—'}</span>
                  <span className="text-amber-300">+{c.level}</span>
                </div>
                {c.player.season==='26WRs'&&<LiveBoostBadge boost={Number(c.player.live_boost)||0}/>}
              </button>;
            })}
          </div>}
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
          <div className="min-w-[170px] flex-1">
            <strong>{selected?selected.player.name:'선택된 선수 없음'}</strong>
            {selected?.player.season==='26WRs'&&<button type="button" onClick={()=>setTrendId(selected.player.id)}
              className="ml-3 text-xs font-bold text-sky-300 underline">OVR 변동 그래프</button>}
            {selected&&<p className="mt-1 text-xs text-slate-300">+{selected.level}강 · 급여 {selected.player.salary ?? '—'} · 판매 상한 {points(maxPrice(selected.level))}</p>}
          </div>
          <label className="flex items-center gap-2 text-sm">
            판매 가격
            <input aria-label="판매 가격" type="number" min={1} max={selected?maxPrice(selected.level):50000}
              step={1} value={sellPrice} onChange={e=>setSellPrice(Number(e.target.value))}
              className="w-36 rounded-lg border border-slate-600 bg-slate-900 p-3"/>
          </label>
          <button disabled={busy||!selected} onClick={()=>void list()}
            className="rounded-lg bg-amber-600 px-6 py-3 font-bold hover:bg-amber-500 disabled:opacity-40">판매 등록</button>
        </div>
        <p className="mt-2 text-xs text-slate-500">덱에 포함된 카드는 먼저 덱에서 제외해야 판매할 수 있습니다.</p>
      </section>
      <details className="rounded-xl border border-slate-700 bg-slate-900 p-4">
        <summary className="cursor-pointer text-sm font-bold text-slate-300">전체 매물 빠른 보기 (기존 목록)</summary>
        <div className="mt-4">      <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">판매 중인 카드 <span className="text-sky-300">{filtered.length}개</span></h2>
          <label className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3">
            <Search className="h-4 w-4 text-slate-400"/>
            <input aria-label="선수 검색" value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="선수명 / 팀 / 시즌 검색" className="min-w-[160px] bg-transparent p-3 text-sm outline-none"/>
          </label>
        </div>
        {loading?<p className="text-slate-400">판매 목록을 불러오는 중...</p>:
          filtered.length===0?<p className="rounded-lg border border-slate-700 p-8 text-center text-slate-400">현재 등록된 매물이 없습니다. 유저가 판매 등록하면 여기에 표시됩니다.</p>:
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(l=><article key={l.listing_id} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
              <div className="flex items-start justify-between gap-3">
                <div><strong className="text-lg">{l.name}</strong>
                  <p className="mt-1 text-xs text-slate-300">{l.team} · {l.position} · {l.season}</p>
                  <p className="mt-2 text-xs text-slate-400">급여 {l.salary ?? '—'} · 판매자: {l.seller_username}</p>
                </div>
                <div className="text-right"><strong className="text-xl text-sky-300">{l.overall}</strong>
                  <p className="text-xs text-slate-400">OVR · +{l.level}강</p>
                  {l.season==='26WRs'&&<LiveBoostBadge boost={Number(l.live_boost)||0}/>}
                </div>
              </div>
              {l.season==='26WRs'&&<button type="button" onClick={()=>setTrendId(l.player_id)} className="mt-3 rounded border border-sky-500/40 px-3 py-1.5 text-xs font-bold text-sky-300 hover:bg-sky-950">OVR 변동 그래프 보기</button>}
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-lg font-black text-amber-300">{points(l.listing_price)}</span>
                <button disabled={busy||Number(l.seller_id)===Number(user?.id)}
                  onClick={()=>void buy(l)} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold disabled:opacity-40">
                  {Number(l.seller_id)===Number(user?.id)?'내 매물':'구매'}
                </button>
              </div>
            </article>)}
          </div>}
      </section>
        </div>
      </details>
      <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
        <h2 className="mb-3 text-xl font-bold">내 판매 중인 카드 ({activeOwn.length})</h2>
        {activeOwn.length===0?<p className="text-sm text-slate-400">현재 판매 중인 카드가 없습니다.</p>:
          <div className="space-y-2">{activeOwn.map(l=><div key={l.listing_id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-800 p-3 text-sm">
            <span>{l.name} · {l.overall} OVR · 급여 {l.salary ?? '—'} · +{l.level}강</span>
            <div className="flex items-center gap-3"><strong className="text-amber-300">{points(l.listing_price)}</strong>
              <button onClick={()=>void editPrice(l)} disabled={busy} className="rounded bg-sky-700 px-3 py-2 disabled:opacity-40">가격 수정</button>
              <button onClick={()=>void cancel(l.listing_id)} disabled={busy} className="flex items-center gap-1 rounded bg-red-800 px-3 py-2 disabled:opacity-40">
                <Trash2 className="h-4 w-4"/>판매 취소</button></div>
          </div>)}</div>}
      </section>
    </div>
    {trendId!==null&&<LiveBoostTrend playerId={trendId} onClose={()=>setTrendId(null)}/>}
  </main>;
}

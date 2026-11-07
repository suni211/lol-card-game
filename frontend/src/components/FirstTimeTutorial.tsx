import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {BookOpen,ChevronLeft,ChevronRight,X} from 'lucide-react';
import {useAuthStore} from '../store/authStore';

const steps=[
  {title:'LCG 시작하기',path:'/packs',action:'팩 인벤토리 열기',
    detail:'처음 가입하면 일반팩 1개를 받습니다. 일반팩을 열면 선수 카드 5장을 획득할 수 있습니다.'},
  {title:'선수 카드 수집',path:'/card-collection',action:'카드 도감 열기',
    detail:'팩을 개봉한 후 보유 카드와 선수 국적, OVR을 확인하세요. 국적이 등록된 선수는 국기가 자동 표시됩니다.'},
  {title:'덱 편성',path:'/deck',action:'덱 편성 열기',
    detail:'보유한 선수 카드 5장으로 팀을 구성하세요. 선수 본래 포지션이 달라도 출전할 수 있습니다.'},
  {title:'AI 매치',path:'/ai-match',action:'AI 매치 열기',
    detail:'먼저 AI와 연습할 수 있습니다. 운영·한타·오브젝트 전술을 선택해 3판 중 2승을 먼저 달성하세요.'},
  {title:'경쟁전',path:'/competitive',action:'경쟁전 열기',
    detail:'경쟁전에서는 다른 실제 유저와 매칭됩니다. 매 판 운영·한타·오브젝트를 선택하고 3판 2선승제로 승부합니다.'},
  {title:'이적시장',path:'/market',action:'이적시장 열기',
    detail:'보유 카드를 목록에서 선택하고 직접 판매 가격을 입력하세요. 다른 유저가 등록한 카드도 구매할 수 있습니다.'},
] as const;

export default function FirstTimeTutorial(){
  const {user,isAuthenticated}=useAuthStore();
  const navigate=useNavigate();
  const [open,setOpen]=useState(false);
  const [step,setStep]=useState(0);
  const key=user?.id?`lcg-first-tutorial-v2-${user.id}`:null;
  useEffect(()=>{
    if(!isAuthenticated || !key){setOpen(false);return;}
    const completed=window.localStorage.getItem(key)==='done';
    setOpen(!completed);
    setStep(0);
  },[isAuthenticated,key]);
  if(!isAuthenticated||!key)return null;
  const done=window.localStorage.getItem(key)==='done';
  const complete=()=>{
    window.localStorage.setItem(key,'done');
    setOpen(false);
  };
  const item=steps[step];
  return <>
    {!open&&!done&&<button type="button"
      className="fixed bottom-6 right-5 z-[70] rounded-full bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-xl"
      onClick={()=>setOpen(true)}>튜토리얼 이어하기</button>}
    {open&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4">
      <div role="dialog" aria-modal="true" aria-label="처음 시작 튜토리얼"
        className="w-full max-w-xl rounded-2xl border border-sky-500/40 bg-slate-900 p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm text-sky-300"><BookOpen size={17}/>튜토리얼 · {step+1}/{steps.length}</p>
          <button type="button" aria-label="튜토리얼 나중에 보기" onClick={()=>setOpen(false)}
            className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"><X size={19}/></button>
        </div>
        <div className="mt-4 flex gap-1.5">{steps.map((_,i)=>
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i<=step?'bg-sky-400':'bg-slate-700'}`}/>)}</div>
        <h2 className="mt-7 text-2xl font-black">{item.title}</h2>
        <p className="mt-4 min-h-24 text-base leading-7 text-slate-300">{item.detail}</p>
        <div className="mt-3 flex flex-wrap justify-between gap-2">
          <button onClick={()=>{setOpen(false);navigate(item.path);}}
            className="rounded-lg border border-sky-500 px-4 py-3 text-sm font-semibold text-sky-300">
            {item.action}
          </button>
          <button onClick={()=>step===steps.length-1?complete():setStep(step+1)}
            className="flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-3 text-sm font-bold">
            {step===steps.length-1?'튜토리얼 완료':<>다음 <ChevronRight size={16}/></>}
          </button>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <button disabled={step===0} onClick={()=>setStep(step-1)}
            className="flex items-center gap-1 text-xs text-slate-400 disabled:opacity-30">
            <ChevronLeft size={14}/>이전
          </button>
          <button onClick={complete} className="text-xs text-slate-400 hover:text-white">튜토리얼 건너뛰기</button>
        </div>
      </div>
    </div>}
  </>;
}

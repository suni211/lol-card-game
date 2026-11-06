import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Player } from '../types';
import { getPlayerImageUrl, getSeriesLogo, getTeamLogoUrl } from '../utils/playerImage';

const LABELS: Record<string,string> = {
  KR:'대한민국',CN:'중국',TW:'대만',VN:'베트남',BR:'브라질',US:'미국',CA:'캐나다',
  FR:'프랑스',DE:'독일',TR:'튀르키예',ES:'스페인',DK:'덴마크',SE:'스웨덴',
  GR:'그리스',PL:'폴란드',AU:'호주',AR:'아르헨티나',JP:'일본',GB:'영국',
  BE:'벨기에',CZ:'체코',HR:'크로아티아',SI:'슬로베니아',NO:'노르웨이',
};
const STEPS=['국적','포지션','소속팀','시즌','선수 공개'];
function flag(code?: string): string {
  const c=(code||'').toUpperCase();
  return /^[A-Z]{2}$/.test(c)
    ? String.fromCodePoint(...Array.from(c).map(x=>0x1F1E6+x.charCodeAt(0)-65))
    : '🌐';
}
export function cardLight(overall: number): 'rainbow' | 'gold' | 'silver' | 'normal' {
  if(overall>=91) return 'rainbow';
  if(overall>=80) return 'gold';
  if(overall>=70) return 'silver';
  return 'normal';
}
function TeamEmblem({team}: {team:string}) {
  const [missing,setMissing]=useState(false);
  return missing
    ? <div className="w-36 h-36 flex items-center justify-center font-black text-3xl rounded-xl bg-white/10 border border-white/25">{team}</div>
    : <img src={getTeamLogoUrl(team)} alt={team+' 로고'} className="w-36 h-36 object-contain"
        onError={()=>setMissing(true)}/>;
}
export default function GachaReveal({
  card, count, onClose
}: {card:Player;count:1|10;onClose:()=>void}) {
  const [step,setStep]=useState(0);
  const [photoMissing,setPhotoMissing]=useState(false);
  useEffect(()=>{
    if(step>=4)return;
    const timer=window.setTimeout(()=>setStep(s=>s+1),step===2?1650:1350);
    return ()=>window.clearTimeout(timer);
  },[step]);
  const color=cardLight(card.overall);
  const nationality=(card.nationality||'').toUpperCase();
  const glow:Record<typeof color,string>={
    normal:'from-slate-500/20 via-blue-900/15 to-slate-500/20',
    silver:'from-slate-100/80 via-gray-300/60 to-blue-200/80',
    gold:'from-amber-200/90 via-yellow-400/70 to-orange-300/90',
    rainbow:'from-red-400/85 via-yellow-300/80 to-purple-400/85',
  };
  const badge=card.season==='26WRs'?'26WRs':card.season==='26WR'?'26WR':'26';
  const photo=getPlayerImageUrl(card.name,card.season,card.tier,card.imageUrl);
  return <motion.div role="dialog" aria-modal="true" aria-label="선수 카드 뽑기 연출"
      className="fixed inset-0 z-[110] bg-[#030711] text-white overflow-y-auto"
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <motion.div className={`absolute inset-[-25%] bg-gradient-to-r ${glow[color]} blur-[95px]`}
        initial={{opacity:0}} animate={{opacity:step===4?.65:.12,rotate:[0,90,180,270,360]}}
        transition={{opacity:{duration:1},rotate:{duration:color==='rainbow'?10:20,repeat:Infinity,ease:'linear'}}}/>
      {step===4&&<motion.div className={`absolute left-1/2 top-1/2 h-[32rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 blur-[55px] bg-gradient-to-b ${glow[color]}`}
        initial={{opacity:0,scale:.4}} animate={{opacity:.7,scale:1.3}}
        transition={{duration:1.3,repeat:Infinity,repeatType:'reverse'}}/>}
    </div>
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-10">
      <p className="tracking-[.32em] text-xs sm:text-sm text-cyan-200 font-bold mb-3">
        {count===10?'10장 뽑기 · 최고 OVR 선수':'1장 뽑기'}
      </p>
      <div className="flex gap-2 mb-5" aria-label="공개 진행률">
        {STEPS.map((t,i)=><div key={t} title={t}
          className={`h-1.5 rounded-full transition-all ${step>=i?'w-9 bg-cyan-200':'w-5 bg-white/20'}`}/>)}
      </div>
      <AnimatePresence mode="wait">
        {step===0&&<motion.div key="country" initial={{opacity:0,scale:.7,filter:'blur(12px)'}}
          animate={{opacity:1,scale:1,filter:'blur(0px)'}} exit={{opacity:0,scale:1.2,filter:'blur(12px)'}}
          className="text-center flex flex-col items-center justify-center min-h-[340px]">
          <p className="text-lg font-bold text-sky-200 tracking-[.3em] mb-6">국적</p>
          <p className="text-8xl mb-7">{flag(nationality)}</p>
          <p className="font-black text-4xl sm:text-6xl">{LABELS[nationality]||nationality||'국적 미등록'}</p>
        </motion.div>}
        {step===1&&<motion.div key="position" initial={{opacity:0,y:80,scale:.8}}
          animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-60}}
          className="text-center flex flex-col items-center justify-center min-h-[340px]">
          <p className="text-lg font-bold text-sky-200 tracking-[.3em] mb-8">포지션</p>
          <p className="font-black text-7xl sm:text-8xl">{card.position}</p>
        </motion.div>}
        {step===2&&<motion.div key="team" initial={{opacity:0,scale:.7}}
          animate={{opacity:1,scale:1}} exit={{opacity:0,scale:1.15}}
          className="text-center flex flex-col items-center justify-center min-h-[340px]">
          <p className="text-lg font-bold text-sky-200 tracking-[.3em] mb-6">소속팀</p>
          <TeamEmblem team={card.team}/>
          <p className="font-black text-4xl sm:text-5xl mt-6">{card.team}</p>
        </motion.div>}
        {step===3&&<motion.div key="season" initial={{opacity:0,scale:.7,rotateX:45}}
          animate={{opacity:1,scale:1,rotateX:0}} exit={{opacity:0,scale:1.15}}
          className="text-center flex flex-col items-center justify-center min-h-[340px]">
          <p className="text-lg font-bold text-sky-200 tracking-[.3em] mb-7">시즌</p>
          <img src={getSeriesLogo(card.season)} alt={badge} className="w-64 sm:w-80 h-32 object-contain"/>
        </motion.div>}
        {step===4&&<motion.div key="card" initial={{opacity:0,scale:.5,rotateY:90}}
          animate={{opacity:1,scale:1,rotateY:0}} transition={{type:'spring',damping:18,stiffness:100}}
          className="relative w-full max-w-[350px] flex flex-col items-center">
          <div className={`relative w-full bg-gradient-to-br p-[3px] rounded-xl ${color==='rainbow'?'from-red-400 via-yellow-300 to-violet-400':color==='gold'?'from-yellow-200 via-amber-400 to-yellow-600':color==='silver'?'from-slate-100 via-slate-400 to-blue-200':'from-slate-500 to-slate-700'}`}
            style={{boxShadow:color==='rainbow'?'0 0 52px rgba(189,123,255,.85),0 0 95px rgba(255,201,78,.38)':color==='gold'?'0 0 75px rgba(251,191,36,.72)':color==='silver'?'0 0 75px rgba(226,232,240,.64)':'0 0 35px rgba(100,116,139,.30)'}}>
            <div className="bg-gradient-to-b from-[#163559] via-[#0c193b] to-[#050b22] rounded-lg p-5 text-center">
              <div className="flex justify-between items-center gap-4">
                <p className="font-black text-5xl sm:text-6xl">{card.overall}<span className="text-xs ml-1 text-white/65">OVR</span></p>
                <img src={getSeriesLogo(card.season)} alt={badge} className="w-28 h-12 object-contain"/>
              </div>
              <div className="flex items-center justify-center gap-3 mt-3">
                <span className="text-2xl">{flag(nationality)}</span>
                <span className="text-sm font-bold">{card.position}</span>
                <img src={getTeamLogoUrl(card.team)} alt={card.team} className="w-10 h-10 object-contain"
                  onError={e=>{e.currentTarget.style.display='none';}}/>
              </div>
              <div className="h-56 sm:h-64 flex justify-center items-end mt-1 relative">
                {photoMissing?<span className="text-slate-400 text-sm mb-16">선수 사진을 등록해주세요</span>:
                  <img src={photo} alt={card.name} className="w-full h-full object-contain object-bottom"
                    onError={()=>setPhotoMissing(true)}/>}
              </div>
              <h2 className="text-3xl font-black mt-2">{card.name}</h2>
              <p className="text-sm text-white/70 mt-1">{card.team} · {card.position} · {badge}</p>
            </div>
          </div>
          <p className="mt-6 font-medium text-slate-200 text-center">
            {count===10?'최고 선수 공개 완료 · 10장 모두 인벤토리에 지급되었습니다.':'선수 카드 획득 완료'}
          </p>
          <button type="button" onClick={onClose}
            className="w-full mt-4 rounded-lg bg-white text-slate-950 font-bold py-3 hover:bg-cyan-100">확인</button>
        </motion.div>}
      </AnimatePresence>
      {step<4&&<button type="button" className="mt-7 text-sm text-white/60 hover:text-white underline underline-offset-4"
        onClick={()=>setStep(4)}>연출 건너뛰기</button>}
    </div>
  </motion.div>;
}

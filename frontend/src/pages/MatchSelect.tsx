import { Link } from 'react-router-dom';
import { Bot, Trophy, Swords, Layers3 } from 'lucide-react';

export default function MatchSelect() {
  return <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
    <div className="mx-auto max-w-4xl space-y-7">
      <header className="text-center">
        <Swords className="mx-auto mb-3 h-12 w-12 text-sky-400"/>
        <h1 className="text-3xl font-black">OVR 가위바위보 대전</h1>
        <p className="mt-3 text-slate-300">포지션 상관없이 선수 카드 5명만 보유하면 출전 가능 · 랜덤 OVR 상대와 3판 2선승제</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-sky-600 bg-slate-900 p-6">
          <Bot className="mb-3 h-8 w-8 text-sky-400"/>
          <h2 className="text-xl font-bold">AI 매치</h2>
          <p className="my-3 text-sm text-slate-300">랜덤 OVR AI와 가위·바위·보 승부. 2승을 먼저 달성하세요.</p>
          <Link to="/ovr-match?mode=AI" className="block rounded-lg bg-sky-600 p-3 text-center font-bold hover:bg-sky-500">AI 매치 시작</Link>
        </section>
        <section className="rounded-xl border border-amber-500 bg-slate-900 p-6">
          <Trophy className="mb-3 h-8 w-8 text-amber-400"/>
          <h2 className="text-xl font-bold">경쟁전</h2>
          <p className="my-3 text-sm text-slate-300">랜덤 OVR 경쟁 상대와 최대 3판. 최종 승패로 랭크 점수가 바뀝니다.</p>
          <Link to="/ovr-match?mode=RANKED" className="block rounded-lg bg-amber-600 p-3 text-center font-bold hover:bg-amber-500">경쟁전 시작</Link>
        </section>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
        <Layers3 className="h-5 w-5 text-slate-300"/>
        <Link to="/deck" className="rounded-lg border border-slate-600 px-5 py-3 font-semibold">덱 편성</Link>
        <span className="text-slate-400">덱이 비어 있으면 보유한 서로 다른 선수 5명을 자동 선택합니다.</span>
      </div>
      <p className="text-center text-xs text-slate-500">Python 리프트 시뮬레이션 및 챔피언 밴픽은 더 이상 사용하지 않습니다.</p>
    </div>
  </main>;
}

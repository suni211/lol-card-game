import { Link } from 'react-router-dom';
import { BrainCircuit, Swords, ShieldCheck, Target } from 'lucide-react';

export default function MatchSelect() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="text-center">
          <Swords className="mx-auto mb-4 h-12 w-12 text-cyan-400" />
          <h1 className="text-3xl font-bold">MOBA 대전 · AI 매치</h1>
          <p className="mt-3 text-slate-300">선수 카드 5장으로 팀을 만들고, 전술과 밴픽을 결정해 AI와 리프트 경기를 진행합니다.</p>
        </header>
        <div className="grid gap-4 md:grid-cols-3">
          <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
            <ShieldCheck className="mb-3 h-7 w-7 text-cyan-400" />
            <h2 className="font-bold">1. 덱 편성</h2>
            <p className="mt-2 text-sm text-slate-300">탑·정글·미드·원딜·서포터 5개 포지션에 선수를 배치합니다.</p>
          </section>
          <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
            <BrainCircuit className="mb-3 h-7 w-7 text-cyan-400" />
            <h2 className="font-bold">2. AI 전술</h2>
            <p className="mt-2 text-sm text-slate-300">라인 운영, 한타 전술, 운영 목표를 선택하고 챔피언 밴픽을 진행합니다.</p>
          </section>
          <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
            <Target className="mb-3 h-7 w-7 text-cyan-400" />
            <h2 className="font-bold">3. 결과 확인</h2>
            <p className="mt-2 text-sm text-slate-300">경기는 서버 시뮬레이션으로 처리됩니다. 높은 오버롤은 전투 기회와 판단에 영향을 주며, 체력이나 피해량을 직접 올리지 않습니다.</p>
          </section>
        </div>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/deck" className="rounded-lg border border-slate-500 px-8 py-3 text-center font-bold hover:bg-slate-800">덱 편성</Link>
          <Link to="/rift-prep?mode=AI" className="rounded-lg bg-cyan-600 px-8 py-3 text-center font-bold hover:bg-cyan-500">AI 매치 · 전술 설정</Link>
        </div>
      </div>
    </div>
  );
}

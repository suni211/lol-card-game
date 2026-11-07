import { Link } from 'react-router-dom';
import { BookOpen, BrainCircuit, ShieldCheck, Trophy, Target } from 'lucide-react';

const sections = [
  {
    title: '1. 2026 선수 카드 모으기',
    content: '선수 카드 시리즈는 26 LIVE(2026 시즌), 26WR(월즈 참가), 26WRs(월즈 8강)로 나뉩니다. 카드 뽑기에서 선수 카드를 얻고 덱에 넣을 수 있습니다.',
  },
  {
    title: '2. 선수 카드 5명 모으기',
    content: '포지션에 관계없이 서로 다른 선수 카드 5명이 있으면 AI 매치와 경쟁전을 시작할 수 있습니다. 덱을 편성해두면 해당 카드를 우선 출전시키고, 비어 있는 자리는 보유 카드로 자동 충원됩니다.',
  },
  {
    title: '3. AI 매치와 경쟁전',
    content: 'AI 매치 또는 경쟁전을 선택하고 매 판 가위·바위·보를 냅니다. 서버가 무작위로 상대 선택을 정하며, 먼저 2승을 거두면 최종 승리합니다. 최대 3판 진행합니다.',
  },
  {
    title: '4. 승패 판정과 보상',
    content: '출전 선수 5명의 OVR과 카드 강화 수치를 합산해 전력을 정합니다. 가위바위보 승자는 해당 판의 전력에 25% 보너스, 패자는 25% 페널티를 받습니다. 이후 서버 무작위 보정이 더해져 높은 OVR로 불리한 가위바위보 결과도 뒤집을 수 있습니다. 경쟁전은 시리즈 종료 후 랭크 점수에 반영됩니다.',
  },
  {
    title: '5. 캠페인과 무한도전',
    content: '캠페인과 무한도전은 별도의 게임 모드입니다. 가위바위보 방식은 AI 매치와 경쟁전에만 적용됩니다.',
  },
] as const;

export default function HowToPlay() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-cyan-500" />
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">LOL 카드 게임 안내</h1>
          <p className="mt-3 text-gray-600 dark:text-gray-300">현재 구현된 2026 시즌 모드를 기준으로 안내합니다.</p>
        </header>
        <div className="grid gap-4">
          {sections.map(section => (
            <section key={section.title} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-3 text-lg font-bold text-gray-900 dark:text-white">{section.title}</h2>
              <p className="leading-7 text-gray-600 dark:text-gray-300">{section.content}</p>
            </section>
          ))}
        </div>
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-50 p-5 dark:bg-cyan-950/30">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-gray-900 dark:text-white">
            <BrainCircuit className="h-5 w-5 text-cyan-500" /> 바로 시작하기
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link to="/deck" className="flex items-center justify-center gap-2 rounded-lg bg-slate-700 p-3 text-center font-semibold text-white hover:bg-slate-600">
              <ShieldCheck className="h-4 w-4" /> 덱 편성
            </Link>
            <Link to="/match-select" className="flex items-center justify-center gap-2 rounded-lg bg-cyan-600 p-3 text-center font-semibold text-white hover:bg-cyan-500">
              <Target className="h-4 w-4" /> 경쟁전
            </Link>
            <Link to="/campaign" className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 p-3 text-center font-semibold text-white hover:bg-indigo-500">
              <Trophy className="h-4 w-4" /> 캠페인
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

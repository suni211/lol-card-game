import { Link } from 'react-router-dom';
import { BookOpen, BrainCircuit, ShieldCheck, Trophy, Target } from 'lucide-react';

const sections = [
  {
    title: '1. 2026 선수 카드 모으기',
    content: '선수 카드 시리즈는 26 LIVE(2026 시즌), 26WR(월즈 참가), 26WRs(월즈 8강)로 나뉩니다. 카드 뽑기에서 선수 카드를 얻고 덱에 넣을 수 있습니다.',
  },
  {
    title: '2. 포지션별로 덱 편성하기',
    content: '탑, 정글, 미드, 원딜, 서포터 선수 카드를 한 장씩 배치해 5인 덱을 완성하세요. 대전 시작 전에 다섯 포지션이 모두 채워졌는지 확인합니다.',
  },
  {
    title: '3. AI MOBA 매치와 전술',
    content: '현재 MOBA 매치 화면에서는 AI 상대를 선택합니다. 라인 운영(안정적/압박/후반 성장), 한타 전술(보호/선제 교전/거리 유지), 운영 목표(오브젝트/시야/사이드 운영)를 결정하고 챔피언 밴픽을 진행합니다.',
  },
  {
    title: '4. 경기 결과와 오버롤',
    content: 'MOBA 경기는 서버의 리프트 시뮬레이션 엔진에서 진행됩니다. 높은 오버롤은 갱킹·한타·운영의 좋은 기회를 포착할 가능성을 높이지만 체력이나 공격 피해량에 직접 더해지지는 않습니다.',
  },
  {
    title: '5. 캠페인과 무한도전',
    content: '캠페인은 지역별 단계를 순서대로 클리어하는 별도의 진행 모드입니다. 무한도전은 단계마다 강해지는 AI를 상대합니다. 두 모드는 MOBA 리프트 시뮬레이션과 별개의 기존 전투 규칙을 사용합니다.',
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
              <Target className="h-4 w-4" /> AI MOBA 전술
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

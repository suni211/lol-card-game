import { BookOpen, Lightbulb, Trophy, Swords, Shield, Gem, Users, MapPin } from 'lucide-react';
import PremiumCard from '../components/ui/PremiumCard';

export default function HowToPlay() {
  const sections = [
    {
      icon: <BookOpen className="w-8 h-8 text-primary-500" />,
      title: '게임의 기본',
      content: [
        'LOL 카드 게임은 전략적인 카드 수집 및 배틀 게임입니다. 플레이어는 리그 오브 레전드 챔피언 카드를 수집하고, 덱을 구성하여 다른 플레이어와 대결합니다.',
        '각 챔피언 카드는 고유한 능력치(공격력, 방어력, 체력 등)와 스킬을 가지고 있습니다. 덱 구성 시 시너지 효과를 고려하는 것이 중요합니다.',
        '주요 목표는 상대방의 넥서스를 파괴하는 것입니다. 이를 위해 라인전, 오브젝트 컨트롤, 한타 싸움 등 MOBA 게임의 핵심 요소를 카드 게임으로 재해석했습니다.',
      ],
    },
    {
      icon: <Lightbulb className="w-8 h-8 text-yellow-500" />,
      title: '카드 종류 및 능력치',
      content: [
        '챔피언 카드: 게임의 핵심 유닛입니다. 각 챔피언은 고유한 포지션(탑, 정글, 미드, 원딜, 서포터)과 팀, 그리고 오버롤(Overall) 능력치를 가집니다.',
        '아이템 카드: 챔피언 카드에 장착하여 능력치를 강화하거나 특별한 효과를 부여합니다.',
        '스킬 카드: 전투 중 사용할 수 있는 일회성 효과를 제공합니다. 적절한 타이밍에 사용하여 전세를 역전시킬 수 있습니다.',
        '오버롤(Overall): 카드의 종합적인 강함을 나타내는 수치입니다. 강화, 코치 버프 등을 통해 상승시킬 수 있습니다.',
      ],
    },
    {
      icon: <Swords className="w-8 h-8 text-red-500" />,
      title: '전투 시스템',
      content: [
        '밴픽(Ban-Pick): MOBA 매치 시작 전, 상대방과 번갈아 가며 챔피언을 밴하고 픽합니다. 전략적인 선택이 승패를 좌우합니다.',
        '라인전: 챔피언 카드를 라인에 배치하여 상대방과 대결합니다. 미니언 웨이브를 관리하고 상대 챔피언을 견제하세요.',
        '오브젝트 컨트롤: 드래곤, 바론 등 주요 오브젝트를 차지하여 팀 전체에 강력한 버프를 부여할 수 있습니다.',
        '한타: 여러 챔피언 카드를 한 곳에 모아 대규모 전투를 벌입니다. 스킬 카드와 아이템 효과를 최대한 활용하세요.',
      ],
    },
    {
      icon: <Trophy className="w-8 h-8 text-gold-500" />,
      title: '게임 진행 방식',
      content: [
        '초반 (라인전 단계): 게임 시작 후 첫 몇 턴 동안은 주로 라인에 챔피언 카드를 배치하고 미니언을 처리하여 골드와 경험치를 획득합니다. 상대방 챔피언을 견제하고, 자신의 챔피언을 성장시키는 데 집중하세요.',
        '중반 (오브젝트 및 소규모 교전 단계): 라인전이 끝나면 드래곤이나 바론과 같은 주요 오브젝트를 두고 소규모 교전이 발생합니다. 팀원들과 협력하여 오브젝트를 확보하고, 상대방의 타워를 파괴하여 이득을 취하세요.',
        '후반 (한타 및 넥서스 공략 단계): 게임 후반에는 챔피언 카드의 레벨과 아이템이 거의 완성되어 대규모 한타 싸움이 자주 발생합니다. 승리한 한타를 바탕으로 상대방의 억제기와 넥서스를 파괴하여 게임을 끝내세요.',
        '각 단계별로 적절한 챔피언 카드와 스킬 카드, 아이템 사용 전략이 중요합니다.',
      ],
    },
    {
      icon: <Shield className="w-8 h-8 text-green-500" />,
      title: '성장 및 강화',
      content: [
        '카드 강화: 같은 챔피언 카드를 재료로 사용하여 카드의 레벨을 올리고 오버롤을 상승시킬 수 있습니다. 강화 성공률이 존재합니다.',
        '코치 시스템: 코치를 고용하여 특정 포지션, 팀, 또는 전체 카드에 버프를 부여할 수 있습니다. 코치마다 고유한 버프 효과를 가집니다.',
        '아이템 장착: 챔피언 카드에 아이템을 장착하여 추가 능력치를 얻을 수 있습니다.',
      ],
    },
    {
      icon: <Trophy className="w-8 h-8 text-gold-500" />,
      title: '다양한 게임 모드',
      content: [
        'AI 대전: 인공지능을 상대로 실력을 연마하고 보상을 획득하세요.',
        '캠페인: 스토리 모드를 진행하며 다양한 스테이지를 클리어하고 희귀 카드를 얻으세요.',
        '랭크전: 다른 플레이어와 경쟁하여 랭크를 올리고 시즌 보상을 획득하세요.',
        '친선전: 친구와 함께 부담 없이 대결하며 전략을 시험해볼 수 있습니다.',
        '무한의 탑: 끝없이 몰려오는 적들을 물리치고 자신의 한계를 시험하세요.',
      ],
    },
    {
      icon: <Gem className="w-8 h-8 text-purple-500" />,
      title: '경제 시스템',
      content: [
        '가챠: 게임 내 재화를 사용하여 새로운 챔피언 카드를 획득합니다.',
        '마켓: 다른 플레이어와 카드를 거래하거나, 필요한 카드를 구매할 수 있습니다.',
        '카드 분해/정리: 불필요한 카드를 분해하여 재화를 얻거나, 특정 오버롤 미만의 카드를 일괄 정리할 수 있습니다.',
        '미션/업적: 게임 플레이를 통해 다양한 미션과 업적을 달성하고 보상을 받으세요.',
      ],
    },
    {
      icon: <Users className="w-8 h-8 text-blue-500" />,
      title: '커뮤니티',
      content: [
        '길드: 길드에 가입하여 길드원들과 함께 플레이하고 길드 전용 보상을 획득하세요.',
        '채팅: 다른 플레이어와 실시간으로 소통하며 정보를 공유하고 친목을 다질 수 있습니다.',
      ],
    },
    {
      icon: <MapPin className="w-8 h-8 text-gray-500" />,
      title: '팁 & 전략',
      content: [
        '다양한 챔피언 조합을 실험하여 자신만의 강력한 덱을 만드세요.',
        '상대방의 덱과 전략을 파악하고 카운터 픽을 준비하세요.',
        '매치 상황에 따라 유연하게 전략을 변경하는 것이 중요합니다.',
        '꾸준히 미션과 업적을 달성하여 재화를 모으고 카드를 성장시키세요.',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 py-12 px-4 sm:px-6 lg:px-8">
      <div
        className="max-w-4xl mx-auto"
      >
        <h1 className="text-5xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 mb-12">
          LOL 카드 게임 플레이 가이드
        </h1>

        <div className="space-y-12">
          {sections.map((section, index) => (
            <PremiumCard key={index} gradient="blue" glow hover3D>
              <div
                className="p-8 rounded-xl shadow-lg"
              >
                <div className="flex items-center mb-6">
                  {section.icon}
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white ml-4">
                    {section.title}
                  </h2>
                </div>
                <ul className="space-y-3 text-lg text-gray-700 dark:text-gray-300">
                  {section.content.map((item, itemIndex) => (
                    <li
                      key={itemIndex}
                      className="flex items-start"
                    >
                      <span className="mr-3 text-primary-500 dark:text-primary-300 text-xl">
                        •
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </PremiumCard>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { BookOpen, Users, Swords, Shield } from 'lucide-react';
import PremiumCard from '../components/ui/PremiumCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Champion {
  id: number;
  name: string;
  skillName: string;
  skillDescription: string;
  cooldown: number;
  scalingType: 'AD' | 'AP';
  championClass: string;
}

export default function Champions() {
  const { token } = useAuthStore();
  const [champions, setChampions] = useState<Champion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChampions = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await axios.get(`${API_URL}/strategy-stats/champions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.success) {
          setChampions(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch champions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChampions();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mb-4">
            <BookOpen className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            챔피언 소개
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            게임에 등장하는 모든 챔피언의 정보와 스킬을 확인하세요.
          </p>
        </div>

        {/* General Champion Introduction Section */}
        <PremiumCard gradient="purple" glow hover3D className="mb-12">
          <div className="p-8 rounded-xl shadow-lg">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              챔피언 유형 및 역할 가이드
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-lg text-gray-700 dark:text-gray-300">
              <div>
                <h3 className="text-xl font-semibold text-primary-600 dark:text-primary-400 mb-3 flex items-center">
                  <Users className="w-6 h-6 mr-2" /> 주요 역할 (포지션)
                </h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>**탑 (Top):** 주로 탱커나 브루저 챔피언이 배치되어 라인전을 담당하고 팀의 전방을 책임집니다.</li>
                  <li>**정글 (Jungle):** 몬스터 사냥을 통해 성장하며, 각 라인에 개입(갱킹)하여 아군을 돕고 오브젝트를 관리합니다.</li>
                  <li>**미드 (Mid):** 마법사나 암살자 챔피언이 주로 배치되며, 높은 대미지로 게임의 흐름을 주도합니다.</li>
                  <li>**원딜 (ADC):** 원거리 공격 챔피언으로, 게임 후반에 팀의 주요 대미지 딜러 역할을 수행합니다.</li>
                  <li>**서포터 (Support):** 아군 챔피언을 보호하고 보조하며, 시야 확보와 이니시에이팅을 담당합니다.</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-3 flex items-center">
                  <Swords className="w-6 h-6 mr-2" /> 챔피언 클래스 및 특성
                </h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>**탱커 (Tank):** 높은 체력과 방어력으로 아군을 보호하고 적의 공격을 받아냅니다.</li>
                  <li>**브루저 (Bruiser/Fighter):** 공격과 방어의 균형을 갖춰 전방에서 지속적인 전투를 수행합니다.</li>
                  <li>**마법사 (Mage):** 강력한 마법 스킬로 광역 대미지나 군중 제어 효과를 부여합니다.</li>
                  <li>**암살자 (Assassin):** 높은 기동성과 순간 대미지로 적의 핵심 챔피언을 빠르게 처치합니다.</li>
                  <li>**원거리 딜러 (Marksman):** 원거리에서 지속적인 물리 대미지를 입히는 데 특화되어 있습니다.</li>
                  <li>**서포터 (Enchanter/Catcher):** 아군에게 버프, 힐, 보호막을 제공하거나 적을 속박하여 아군을 돕습니다.</li>
                </ul>
              </div>
              <div className="md:col-span-2">
                <h3 className="text-xl font-semibold text-yellow-600 dark:text-yellow-400 mb-3 flex items-center">
                  <Shield className="w-6 h-6 mr-2" /> 스케일링 타입 및 오버롤
                </h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>**AD (Attack Damage):** 물리 공격력 기반으로 스킬 및 기본 공격 대미지가 증가합니다.</li>
                  <li>**AP (Ability Power):** 주문력 기반으로 마법 스킬 대미지가 증가합니다.</li>
                  <li>**오버롤 (Overall):** 챔피언 카드의 종합적인 강함을 나타내는 수치입니다. 강화, 코치 버프 등을 통해 상승하며, 팀의 전투력에 큰 영향을 미칩니다.</li>
                </ul>
              </div>
            </div>
          </div>
        </PremiumCard>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {champions.map((champion) => (
            <div
              key={champion.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{champion.name}</h2>
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                    champion.scalingType === 'AD'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                      : 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
                  }`}>
                    {champion.scalingType}
                  </span>
                </div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-primary-600 dark:text-primary-400 mb-1">{champion.skillName}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {champion.skillDescription}
                  </p>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-300">
                  <span>
                    <strong>클래스:</strong> {champion.championClass}
                  </span>
                  <span>
                    <strong>쿨타임:</strong> {champion.cooldown}턴
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

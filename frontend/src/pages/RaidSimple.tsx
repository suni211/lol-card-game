import { useState, useEffect } from 'react';
import { Shield, Sword, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function RaidSimple() {
  const { token, user } = useAuthStore();
  const [raid, setRaid] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRaid();
  }, []);

  const fetchRaid = async () => {
    try {
      const response = await axios.get(`${API_URL}/raid/current`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Raid data:', response.data);
      if (response.data.success) {
        setRaid(response.data.data);
      }
    } catch (error) {
      console.error('Fetch raid error:', error);
    } finally {
      setLoading(false);
    }
  };

  const startRaid = async () => {
    if (!window.confirm('레이드를 시작하시겠습니까?')) return;

    try {
      console.log('Starting raid...');
      const response = await axios.post(
        `${API_URL}/raid/admin/start`,
        {
          name: 'ICON, KING IS BACK',
          maxHp: 1000000,
          rewardMultiplier: 1.0,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Start raid response:', response.data);

      if (response.data.success) {
        toast.success('레이드가 시작되었습니다!');
        fetchRaid();
      } else {
        toast.error('레이드 시작 실패');
      }
    } catch (error: any) {
      console.error('Start raid error:', error);
      console.error('Error response:', error.response);
      toast.error(error.response?.data?.error || '레이드 시작 실패');
    }
  };

  const attack = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/raid/attack`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        fetchRaid();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '공격 실패');
    }
  };

  if (loading) {
    return <div className="p-8 text-center">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">
          레이드 시스템 (Simple)
        </h1>

        {user?.isAdmin && (
          <button
            onClick={startRaid}
            className="mb-8 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold"
          >
            <Plus className="inline w-5 h-5 mr-2" />
            레이드 시작 (테스트)
          </button>
        )}

        {!raid ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center">
            <Shield className="w-24 h-24 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">활성화된 레이드가 없습니다</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              {raid.name}
            </h2>
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span>HP</span>
                <span>
                  {raid.current_hp?.toLocaleString()} / {raid.max_hp?.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                <div
                  className="bg-red-600 h-4 rounded-full"
                  style={{ width: `${(raid.current_hp / raid.max_hp) * 100}%` }}
                ></div>
              </div>
            </div>

            <button
              onClick={attack}
              disabled={raid.current_hp === 0}
              className="w-full px-6 py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-bold"
            >
              <Sword className="inline w-5 h-5 mr-2" />
              공격하기
            </button>

            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              <p>참여자: {raid.totalParticipants}명</p>
              <p>총 데미지: {raid.totalDamage?.toLocaleString()}</p>
            </div>
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            디버그 모드 - Console을 확인하세요 (F12)
          </p>
        </div>
      </div>
    </div>
  );
}

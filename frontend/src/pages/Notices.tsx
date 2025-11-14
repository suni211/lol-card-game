import { motion } from 'framer-motion';
import { Bell, Pin, Calendar, Eye } from 'lucide-react';
import { useState } from 'react';
import { Notice } from '../types';

export default function Notices() {
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  // Mock data
  const mockNotices: Notice[] = [
    {
      id: 1,
      title: '[공지] 2025 시즌 시작 이벤트',
      content: `안녕하세요, LOL Card Game 운영팀입니다.

2025 시즌 시작을 기념하여 대규모 이벤트를 진행합니다!

## 이벤트 내용
1. 신규 가입 시 1000 포인트 지급
2. 일일 무료 뽑기 2회로 증가 (이벤트 기간 중)
3. 레전드 카드 확률 2배
4. 주간 미션 보상 50% 증가

## 이벤트 기간
2025년 1월 1일 ~ 2025년 1월 31일

많은 참여 부탁드립니다!`,
      type: 'EVENT',
      isPinned: true,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    },
    {
      id: 2,
      title: '[패치] 밸런스 패치 노트 v1.2',
      content: `## 선수 능력치 변경

### 상향
- Faker: 98 → 99 OVR
- Zeus: 92 → 93 OVR

### 하향
- Bin: 94 → 93 OVR

## 버그 수정
- 덱 편성 시 간헐적으로 카드가 사라지는 버그 수정
- 트레이드 알림이 오지 않는 버그 수정

자세한 내용은 공식 디스코드를 참고해주세요.`,
      type: 'PATCH',
      isPinned: true,
      createdAt: '2025-01-05T12:00:00Z',
      updatedAt: '2025-01-05T12:00:00Z',
    },
    {
      id: 3,
      title: '[점검] 정기 점검 안내',
      content: `정기 점검이 예정되어 있습니다.

## 점검 시간
2025년 1월 10일 02:00 ~ 06:00 (4시간)

## 점검 내용
- 서버 안정화 작업
- 신규 카드 추가
- 성능 최적화

점검 시간 동안 게임 접속이 불가능합니다.
양해 부탁드립니다.`,
      type: 'MAINTENANCE',
      isPinned: false,
      createdAt: '2025-01-08T18:00:00Z',
      updatedAt: '2025-01-08T18:00:00Z',
    },
    {
      id: 4,
      title: '[공지] 신규 시스템 추가 예정',
      content: `다음 업데이트에 새로운 시스템이 추가됩니다!

## 추가 예정 기능
1. 카드 강화 시스템
2. 길드/클랜 시스템
3. 토너먼트 모드
4. 시즌 패스

자세한 일정은 추후 공지하겠습니다.`,
      type: 'NOTICE',
      isPinned: false,
      createdAt: '2025-01-07T10:00:00Z',
      updatedAt: '2025-01-07T10:00:00Z',
    },
  ];

  const getNoticeTypeColor = (type: Notice['type']) => {
    switch (type) {
      case 'EVENT':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'PATCH':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      case 'MAINTENANCE':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      default:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
    }
  };

  const getNoticeTypeLabel = (type: Notice['type']) => {
    switch (type) {
      case 'EVENT':
        return '이벤트';
      case 'PATCH':
        return '패치';
      case 'MAINTENANCE':
        return '점검';
      default:
        return '공지';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full mb-4">
            <Bell className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            공지사항
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            게임 소식과 업데이트를 확인하세요
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Notice List */}
          <div className="lg:col-span-1 space-y-4">
            {mockNotices.map((notice, index) => (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedNotice(notice)}
                className={`bg-white dark:bg-gray-800 rounded-lg p-4 cursor-pointer transition-all border-2 hover:shadow-lg ${
                  selectedNotice?.id === notice.id
                    ? 'border-primary-500 dark:border-primary-400'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {notice.isPinned && (
                    <Pin className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getNoticeTypeColor(notice.type)}`}>
                        {getNoticeTypeLabel(notice.type)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
                      {notice.title}
                    </h3>
                    <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(notice.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Notice Detail */}
          <div className="lg:col-span-2">
            {selectedNotice ? (
              <motion.div
                key={selectedNotice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700"
              >
                {/* Header */}
                <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getNoticeTypeColor(selectedNotice.type)}`}>
                      {getNoticeTypeLabel(selectedNotice.type)}
                    </span>
                    {selectedNotice.isPinned && (
                      <span className="px-3 py-1 rounded-full text-sm font-semibold bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 flex items-center space-x-1">
                        <Pin className="w-4 h-4" />
                        <span>고정됨</span>
                      </span>
                    )}
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    {selectedNotice.title}
                  </h2>

                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(selectedNotice.createdAt)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>조회수 {Math.floor(Math.random() * 1000)}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="prose dark:prose-invert max-w-none">
                  <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                    {selectedNotice.content}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700">
                <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  공지사항을 선택해주세요
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

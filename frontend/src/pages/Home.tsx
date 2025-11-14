import { Link } from 'react-router-dom';
import { Trophy, Users, Sparkles, Swords, TrendingUp, Gift } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';

export default function Home() {
  const { isAuthenticated, user } = useAuthStore();

  const features = [
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: '카드 수집',
      description: '전세계 프로 선수 카드를 수집하고 강화하세요',
      link: '/gacha',
      gradient: 'from-yellow-400 to-orange-500',
    },
    {
      icon: <Swords className="w-8 h-8" />,
      title: '전략 대전',
      description: '5포지션 덱을 구성하여 실시간 대전에 도전하세요',
      link: '/match',
      gradient: 'from-red-400 to-pink-500',
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: '팀 시너지',
      description: '같은 팀 선수들로 시너지 보너스를 획득하세요',
      link: '/collection',
      gradient: 'from-blue-400 to-cyan-500',
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: '랭킹 경쟁',
      description: '최고의 랭커가 되어 명예를 획득하세요',
      link: '/ranking',
      gradient: 'from-purple-400 to-pink-500',
    },
    {
      icon: <Gift className="w-8 h-8" />,
      title: '미션 보상',
      description: '일일/주간 미션을 완료하고 보상을 받으세요',
      link: '/missions',
      gradient: 'from-green-400 to-emerald-500',
    },
    {
      icon: <Trophy className="w-8 h-8" />,
      title: '트레이드',
      description: '다른 유저와 카드를 교환하세요',
      link: '/trade',
      gradient: 'from-indigo-400 to-purple-500',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-purple-600 to-pink-600 dark:from-primary-900 dark:via-purple-900 dark:to-pink-900">
        <div className="absolute inset-0 bg-black/10"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-4xl sm:text-6xl font-bold text-white mb-6 text-shadow">
              LCG
              <br />
              <span className="text-3xl sm:text-4xl">LOL Trading Card Game</span>
            </h1>
            <p className="text-xl sm:text-2xl text-white/90 mb-8 text-shadow">
              전세계 프로 선수 카드를 수집하고 최강 팀을 만들어보세요!
            </p>

            {isAuthenticated && user ? (
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  to="/gacha"
                  className="px-8 py-4 bg-white text-primary-600 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
                >
                  카드 뽑기
                </Link>
                <Link
                  to="/match"
                  className="px-8 py-4 bg-primary-600 text-white rounded-lg font-bold text-lg hover:bg-primary-700 transition-all transform hover:scale-105 shadow-lg border-2 border-white"
                >
                  대전 시작
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  to="/register"
                  className="px-8 py-4 bg-white text-primary-600 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
                >
                  지금 시작하기
                </Link>
                <Link
                  to="/login"
                  className="px-8 py-4 bg-transparent text-white rounded-lg font-bold text-lg hover:bg-white/10 transition-all transform hover:scale-105 border-2 border-white"
                >
                  로그인
                </Link>
              </div>
            )}

            {/* Stats */}
            {isAuthenticated && user && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto"
              >
                <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                  <div className="text-3xl font-bold text-white mb-2">
                    {user.points.toLocaleString()}
                  </div>
                  <div className="text-white/80">보유 포인트</div>
                </div>
                <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                  <div className="text-3xl font-bold text-white mb-2">
                    {user.tier}
                  </div>
                  <div className="text-white/80">현재 티어</div>
                </div>
                <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                  <div className="text-3xl font-bold text-white mb-2">
                    {user.rating}
                  </div>
                  <div className="text-white/80">레이팅</div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              게임 특징
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              다양한 게임 모드와 기능을 즐겨보세요
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Link to={feature.link}>
                  <div className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700">
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity`}></div>

                    <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${feature.gradient} text-white mb-4`}>
                      {feature.icon}
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary-600 to-purple-600 dark:from-primary-900 dark:to-purple-900">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              지금 바로 시작하세요!
            </h2>
            <p className="text-xl text-white/90 mb-8">
              무료로 가입하고 첫 카드팩을 받아보세요
            </p>
            <Link
              to="/register"
              className="inline-block px-8 py-4 bg-white text-primary-600 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
            >
              무료 회원가입
            </Link>
          </motion.div>
        </section>
      )}
    </div>
  );
}

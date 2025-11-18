import { Link } from 'react-router-dom';
import { Trophy, Users, Sparkles, Swords, TrendingUp, Gift, Zap, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import PremiumButton from '../components/ui/PremiumButton';
import PremiumCard from '../components/ui/PremiumCard';

export default function Home() {
  const { isAuthenticated, user } = useAuthStore();

  const features = [
    {
      icon: <Sparkles className="w-10 h-10" />,
      title: '카드 수집',
      description: '전세계 프로 선수 카드를 수집하고 강화하세요',
      link: '/gacha',
      gradient: 'from-yellow-400 via-amber-500 to-orange-500',
      bgGlow: 'shadow-yellow-500/50',
    },
    {
      icon: <Swords className="w-10 h-10" />,
      title: '전략 대전',
      description: '5포지션 덱을 구성하여 실시간 대전에 도전하세요',
      link: '/match',
      gradient: 'from-red-500 via-rose-600 to-pink-600',
      bgGlow: 'shadow-red-500/50',
    },
    {
      icon: <Users className="w-10 h-10" />,
      title: '팀 시너지',
      description: '같은 팀 선수들로 시너지 보너스를 획득하세요',
      link: '/collection',
      gradient: 'from-blue-500 via-cyan-500 to-teal-500',
      bgGlow: 'shadow-blue-500/50',
    },
    {
      icon: <TrendingUp className="w-10 h-10" />,
      title: '랭킹 경쟁',
      description: '최고의 랭커가 되어 명예를 획득하세요',
      link: '/ranking',
      gradient: 'from-purple-500 via-pink-500 to-rose-500',
      bgGlow: 'shadow-purple-500/50',
    },
    {
      icon: <Gift className="w-10 h-10" />,
      title: '미션 보상',
      description: '일일/주간 미션을 완료하고 보상을 받으세요',
      link: '/missions',
      gradient: 'from-green-500 via-emerald-500 to-teal-600',
      bgGlow: 'shadow-green-500/50',
    },
    {
      icon: <Trophy className="w-10 h-10" />,
      title: '트레이드',
      description: '다른 유저와 카드를 교환하세요',
      link: '/trade',
      gradient: 'from-indigo-500 via-purple-600 to-pink-600',
      bgGlow: 'shadow-indigo-500/50',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated Background */}
        <motion.div
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
          className="absolute inset-0 bg-gradient-to-br from-primary-600 via-purple-600 via-pink-600 to-primary-600 dark:from-primary-900 dark:via-purple-900 dark:to-pink-900 bg-[length:200%_200%]"
        />

        {/* Floating Particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [-20, -100, -20],
              x: [0, Math.random() * 50 - 25, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
            className="absolute text-white/20 text-2xl"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: 0,
            }}
          >
            ⭐
          </motion.div>
        ))}

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-center"
          >
            {/* Logo */}
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                rotate: [0, 2, -2, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
              }}
              className="inline-flex items-center justify-center mb-8"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-pink-500 blur-3xl opacity-50 animate-pulse" />
                <Trophy className="w-20 h-20 text-white relative z-10 drop-shadow-2xl" />
              </div>
            </motion.div>

            <motion.h1
              animate={{
                textShadow: [
                  '0 0 20px rgba(255,255,255,0.5)',
                  '0 0 40px rgba(255,255,255,0.8)',
                  '0 0 20px rgba(255,255,255,0.5)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-5xl sm:text-7xl font-black text-white mb-4"
            >
              LCG
            </motion.h1>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl sm:text-4xl font-bold text-white/90 mb-6"
            >
              LOL Trading Card Game
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-xl sm:text-2xl text-white/80 mb-12 drop-shadow-lg"
            >
              전세계 프로 선수 카드를 수집하고 최강 팀을 만들어보세요!
            </motion.p>

            {isAuthenticated && user ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              >
                <Link to="/gacha">
                  <PremiumButton variant="gold" size="lg" icon={<Sparkles className="w-6 h-6" />}>
                    카드 뽑기
                  </PremiumButton>
                </Link>
                <Link to="/match">
                  <PremiumButton variant="primary" size="lg" icon={<Swords className="w-6 h-6" />}>
                    대전 시작
                  </PremiumButton>
                </Link>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              >
                <Link to="/register">
                  <PremiumButton variant="gold" size="lg" icon={<Star className="w-6 h-6" />}>
                    지금 시작하기
                  </PremiumButton>
                </Link>
                <Link to="/login">
                  <PremiumButton variant="secondary" size="lg" icon={<Zap className="w-6 h-6" />}>
                    로그인
                  </PremiumButton>
                </Link>
              </motion.div>
            )}

            {/* Stats */}
            {isAuthenticated && user && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.9 }}
                className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto"
              >
                {[
                  { label: '보유 포인트', value: user.points.toLocaleString(), gradient: 'gold' },
                  { label: '현재 티어', value: user.tier, gradient: 'purple' },
                  { label: '레이팅', value: user.rating, gradient: 'blue' },
                ].map((stat, idx) => (
                  <PremiumCard key={idx} gradient={stat.gradient as any} glow hover3D>
                    <div className="p-6">
                      <div className="text-4xl font-black text-gray-900 dark:text-white mb-2 bg-gradient-to-r from-primary-600 to-purple-600 dark:from-primary-400 dark:to-purple-400 bg-clip-text text-transparent">
                        {stat.value}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 font-medium">{stat.label}</div>
                    </div>
                  </PremiumCard>
                ))}
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.h2
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{ duration: 5, repeat: Infinity }}
              className="text-4xl sm:text-5xl font-black mb-4 bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 dark:from-primary-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent bg-[length:200%_100%]"
            >
              게임 특징
            </motion.h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              다양한 게임 모드와 기능을 즐겨보세요
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Link to={feature.link}>
                  <div className="group relative h-full">
                    {/* Glow Effect */}
                    <div className={`absolute -inset-1 bg-gradient-to-r ${feature.gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-75 transition-all duration-500`} />

                    {/* Card */}
                    <motion.div
                      whileHover={{
                        scale: 1.05,
                        rotateY: 5,
                        rotateX: 5,
                        z: 50,
                      }}
                      transition={{ type: 'spring', stiffness: 300 }}
                      className="relative h-full bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl transform-gpu"
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      {/* Shimmer */}
                      <motion.div
                        animate={{
                          x: ['-100%', '200%'],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          repeatDelay: 5,
                        }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
                      />

                      {/* Icon */}
                      <motion.div
                        whileHover={{ rotate: 360, scale: 1.2 }}
                        transition={{ duration: 0.6 }}
                        className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} text-white mb-6 shadow-lg ${feature.bgGlow}`}
                      >
                        {feature.icon}
                      </motion.div>

                      {/* Content */}
                      <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        {feature.description}
                      </p>

                      {/* Arrow */}
                      <motion.div
                        className="mt-4 text-transparent bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text font-bold flex items-center gap-2"
                        whileHover={{ x: 5 }}
                      >
                        자세히 보기 →
                      </motion.div>
                    </motion.div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="relative overflow-hidden py-24 px-4 sm:px-6 lg:px-8">
          {/* Animated Background */}
          <motion.div
            animate={{
              backgroundPosition: ['0% 0%', '100% 100%'],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
            className="absolute inset-0 bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 dark:from-primary-900 dark:via-purple-900 dark:to-pink-900 bg-[length:200%_200%]"
          />

          {/* Floating Stars */}
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -30, 0],
                rotate: [0, 360],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
              className="absolute text-white text-3xl"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            >
              ✨
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative max-w-4xl mx-auto text-center"
          >
            <motion.h2
              animate={{
                scale: [1, 1.02, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-4xl sm:text-5xl font-black text-white mb-6 drop-shadow-2xl"
            >
              지금 바로 시작하세요!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-xl sm:text-2xl text-white/90 mb-10 drop-shadow-lg"
            >
              무료로 가입하고 첫 카드팩을 받아보세요
            </motion.p>
            <Link to="/register">
              <PremiumButton variant="gold" size="lg" icon={<Gift className="w-6 h-6" />} className="text-xl">
                무료 회원가입
              </PremiumButton>
            </Link>
          </motion.div>
        </section>
      )}
    </div>
  );
}

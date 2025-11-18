import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Gift } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Google Client ID (환경변수에서 가져오기)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';

declare global {
  interface Window {
    google: any;
  }
}

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    // Load Google Sign-In script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleSignIn,
        });

        window.google.accounts.id.renderButton(
          document.getElementById('googleSignInButton'),
          {
            theme: 'outline',
            size: 'large',
            width: 400,
            text: 'signup_with',
            logo_alignment: 'left',
          }
        );
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleGoogleSignIn = async (response: any) => {
    try {
      const result = await axios.post(`${API_URL}/auth/google`, {
        credential: response.credential,
        referralCode: referralCode || undefined,
      });

      if (result.data.success) {
        const { user, token } = result.data.data;
        login(user, token);
        toast.success(result.data.message);
        navigate('/');
      } else {
        toast.error(result.data.error || '회원가입 실패');
      }
    } catch (error: any) {
      console.error('Google 회원가입 오류:', error);
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('회원가입 실패. 다시 시도해주세요.');
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primary-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-2">
              <div className="p-3 bg-gradient-to-br from-primary-500 to-purple-500 rounded-xl">
                <Trophy className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              회원가입
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Google 계정으로 간편하게 시작하세요!
            </p>
            <p className="text-sm text-primary-600 dark:text-primary-400 mt-2">
              가입하면 1000 포인트를 드립니다!
            </p>
          </div>

          {/* Referral Code Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-purple-500" />
                추천인 코드 (선택사항)
              </div>
            </label>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="추천인 코드를 입력하세요"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              maxLength={12}
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              추천인 코드를 입력하면 양측 모두 5,000P를 받습니다!
            </p>
          </div>

          {/* Google Sign-In Button */}
          <div className="mb-6">
            <div id="googleSignInButton" className="flex justify-center"></div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 dark:text-blue-200 text-center">
              2024년부터는 Google 계정을 통해서만 회원가입이 가능합니다.
              <br />
              기존 회원은 아이디/비밀번호로 로그인할 수 있습니다.
            </p>
          </div>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
            <span className="px-4 text-sm text-gray-500 dark:text-gray-400">OR</span>
            <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              이미 계정이 있으신가요?{' '}
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                로그인
              </Link>
            </p>
          </div>
        </div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-8 grid grid-cols-3 gap-4 text-center"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl mb-2">🎴</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">카드 수집</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl mb-2">⚔️</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">PvP 대전</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl mb-2">🏆</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">랭킹 경쟁</div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

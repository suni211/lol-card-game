#!/bin/bash

# PM2로 프론트엔드와 백엔드 시작 스크립트

echo "🚀 LOL Card Game PM2 시작 스크립트"
echo "=================================="

# 로그 디렉토리 생성
mkdir -p logs

# 백엔드 빌드
echo ""
echo "📦 백엔드 빌드 중..."
cd backend
if [ ! -d "dist" ]; then
  echo "  → TypeScript 컴파일 중..."
  npm run build
else
  echo "  → dist 폴더가 이미 존재합니다. 빌드를 건너뜁니다."
fi
cd ..

# 프론트엔드 빌드
echo ""
echo "📦 프론트엔드 빌드 중..."
cd frontend
if [ ! -d "dist" ]; then
  echo "  → Vite 빌드 중..."
  npm run build
else
  echo "  → dist 폴더가 이미 존재합니다. 빌드를 건너뜁니다."
fi
cd ..

# serve 패키지 확인 및 설치
echo ""
echo "🔍 serve 패키지 확인 중..."
if ! command -v serve &> /dev/null; then
  echo "  → serve 패키지가 없습니다. 전역 설치 중..."
  npm install -g serve
else
  echo "  → serve 패키지가 이미 설치되어 있습니다."
fi

# PM2 프로세스 중지 (이미 실행 중인 경우)
echo ""
echo "🛑 기존 PM2 프로세스 중지 중..."
pm2 delete all 2>/dev/null || true

# PM2로 앱 시작
echo ""
echo "▶️  PM2로 앱 시작 중..."
pm2 start ecosystem.config.js

# PM2 저장 (재부팅 시 자동 시작)
echo ""
echo "💾 PM2 설정 저장 중..."
pm2 save

# 상태 확인
echo ""
echo "✅ 시작 완료!"
echo ""
echo "📊 현재 실행 중인 프로세스:"
pm2 list

echo ""
echo "📝 유용한 명령어:"
echo "  - 로그 확인: pm2 logs"
echo "  - 백엔드 로그: pm2 logs lol-backend"
echo "  - 프론트엔드 로그: pm2 logs lol-frontend"
echo "  - 상태 확인: pm2 status"
echo "  - 재시작: pm2 restart all"
echo "  - 중지: pm2 stop all"
echo "  - 삭제: pm2 delete all"
echo ""


#!/bin/bash

# PM2로 프론트엔드와 백엔드 중지 스크립트

echo "🛑 LOL Card Game PM2 중지 스크립트"
echo "=================================="

# PM2 프로세스 중지
echo ""
echo "⏹️  PM2 프로세스 중지 중..."
pm2 stop all

# PM2 프로세스 삭제
echo ""
echo "🗑️  PM2 프로세스 삭제 중..."
pm2 delete all

echo ""
echo "✅ 중지 완료!"


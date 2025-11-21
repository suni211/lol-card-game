#!/bin/bash

echo "=================================="
echo "  Nginx 500 에러 진단 스크립트"
echo "=================================="
echo ""

# 1. PM2 프로세스 확인
echo "1️⃣ PM2 프로세스 상태:"
pm2 list
echo ""

# 2. 포트 확인
echo "2️⃣ 포트 사용 상태:"
echo "포트 3000 (프론트엔드):"
sudo netstat -tlnp | grep :3000 || echo "  ❌ 포트 3000이 열려있지 않습니다"
echo ""
echo "포트 5000 (백엔드):"
sudo netstat -tlnp | grep :5000 || echo "  ❌ 포트 5000이 열려있지 않습니다"
echo ""

# 3. 직접 연결 테스트
echo "3️⃣ 직접 연결 테스트:"
echo "프론트엔드 (localhost:3000):"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|301\|302"; then
    echo "  ✅ 프론트엔드가 응답합니다"
else
    echo "  ❌ 프론트엔드가 응답하지 않습니다"
    curl -v http://localhost:3000 2>&1 | head -20
fi
echo ""

echo "백엔드 (localhost:5000/health):"
if curl -s http://localhost:5000/health | grep -q "ok"; then
    echo "  ✅ 백엔드가 응답합니다"
    curl -s http://localhost:5000/health
else
    echo "  ❌ 백엔드가 응답하지 않습니다"
    curl -v http://localhost:5000/health 2>&1 | head -20
fi
echo ""

# 4. Nginx 상태 확인
echo "4️⃣ Nginx 상태:"
sudo systemctl status nginx --no-pager -l | head -15
echo ""

# 5. Nginx 설정 확인
echo "5️⃣ Nginx 설정 테스트:"
if sudo nginx -t 2>&1; then
    echo "  ✅ Nginx 설정이 올바릅니다"
else
    echo "  ❌ Nginx 설정에 오류가 있습니다"
fi
echo ""

# 6. Nginx 에러 로그 확인
echo "6️⃣ 최근 Nginx 에러 로그 (마지막 20줄):"
if [ -f /var/log/nginx/lol-card-game-error.log ]; then
    sudo tail -20 /var/log/nginx/lol-card-game-error.log
elif [ -f /var/log/nginx/error.log ]; then
    sudo tail -20 /var/log/nginx/error.log
else
    echo "  ⚠️  에러 로그 파일을 찾을 수 없습니다"
fi
echo ""

# 7. 백엔드 로그 확인
echo "7️⃣ 최근 백엔드 로그 (PM2):"
pm2 logs lol-backend --lines 10 --nostream 2>&1 | tail -15
echo ""

# 8. 프론트엔드 로그 확인
echo "8️⃣ 최근 프론트엔드 로그 (PM2):"
pm2 logs lol-frontend --lines 10 --nostream 2>&1 | tail -15
echo ""

echo "=================================="
echo "  진단 완료"
echo "=================================="
echo ""
echo "💡 다음 단계:"
echo "  1. PM2 프로세스가 실행 중인지 확인"
echo "  2. 포트 3000, 5000이 열려있는지 확인"
echo "  3. 직접 연결 테스트 결과 확인"
echo "  4. Nginx 에러 로그 확인"
echo ""


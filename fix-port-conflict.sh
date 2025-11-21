#!/bin/bash

echo "=================================="
echo "  포트 충돌 해결 스크립트"
echo "=================================="
echo ""

# 1. 포트 5000 사용 중인 프로세스 확인
echo "1️⃣ 포트 5000 사용 중인 프로세스 확인:"
PORT_5000_PID=$(sudo lsof -ti:5000)
if [ -z "$PORT_5000_PID" ]; then
    echo "  ✅ 포트 5000이 비어있습니다"
else
    echo "  ⚠️  포트 5000을 사용 중인 프로세스:"
    sudo lsof -i:5000
    echo ""
    echo "  프로세스 ID: $PORT_5000_PID"
fi
echo ""

# 2. 포트 3000 사용 중인 프로세스 확인
echo "2️⃣ 포트 3000 사용 중인 프로세스 확인:"
PORT_3000_PID=$(sudo lsof -ti:3000)
if [ -z "$PORT_3000_PID" ]; then
    echo "  ✅ 포트 3000이 비어있습니다"
else
    echo "  ⚠️  포트 3000을 사용 중인 프로세스:"
    sudo lsof -i:3000
    echo ""
    echo "  프로세스 ID: $PORT_3000_PID"
fi
echo ""

# 3. PM2 프로세스 확인
echo "3️⃣ PM2 프로세스 확인:"
pm2 list
echo ""

# 4. PM2 프로세스 중지 및 삭제
echo "4️⃣ PM2 프로세스 중지 및 삭제:"
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
echo "  ✅ PM2 프로세스가 중지되었습니다"
echo ""

# 5. 포트 사용 중인 프로세스 종료
echo "5️⃣ 포트 사용 중인 프로세스 종료:"
if [ ! -z "$PORT_5000_PID" ]; then
    echo "  포트 5000 프로세스 종료 중: $PORT_5000_PID"
    sudo kill -9 $PORT_5000_PID 2>/dev/null || true
    sleep 1
    # 다시 확인
    if sudo lsof -ti:5000 > /dev/null 2>&1; then
        echo "  ⚠️  프로세스가 여전히 실행 중입니다. 강제 종료 시도..."
        sudo kill -9 $(sudo lsof -ti:5000) 2>/dev/null || true
    else
        echo "  ✅ 포트 5000이 해제되었습니다"
    fi
fi

if [ ! -z "$PORT_3000_PID" ]; then
    echo "  포트 3000 프로세스 종료 중: $PORT_3000_PID"
    sudo kill -9 $PORT_3000_PID 2>/dev/null || true
    sleep 1
    # 다시 확인
    if sudo lsof -ti:3000 > /dev/null 2>&1; then
        echo "  ⚠️  프로세스가 여전히 실행 중입니다. 강제 종료 시도..."
        sudo kill -9 $(sudo lsof -ti:3000) 2>/dev/null || true
    else
        echo "  ✅ 포트 3000이 해제되었습니다"
    fi
fi
echo ""

# 6. 포트 확인
echo "6️⃣ 포트 상태 최종 확인:"
if sudo lsof -ti:5000 > /dev/null 2>&1; then
    echo "  ❌ 포트 5000이 여전히 사용 중입니다"
    sudo lsof -i:5000
else
    echo "  ✅ 포트 5000이 비어있습니다"
fi

if sudo lsof -ti:3000 > /dev/null 2>&1; then
    echo "  ❌ 포트 3000이 여전히 사용 중입니다"
    sudo lsof -i:3000
else
    echo "  ✅ 포트 3000이 비어있습니다"
fi
echo ""

# 7. PM2 재시작
echo "7️⃣ PM2 재시작:"
pm2 start ecosystem.config.js
echo ""

# 8. 잠시 대기
echo "8️⃣ 서버 시작 대기 중 (3초)..."
sleep 3
echo ""

# 9. 상태 확인
echo "9️⃣ PM2 상태 확인:"
pm2 list
echo ""

# 10. 로그 확인
echo "🔟 최근 로그 확인:"
pm2 logs --lines 10 --nostream 2>&1 | tail -20
echo ""

echo "=================================="
echo "  완료"
echo "=================================="
echo ""
echo "💡 다음 단계:"
echo "  1. pm2 list 로 프로세스 상태 확인"
echo "  2. pm2 logs 로 로그 확인"
echo "  3. curl http://localhost:5000/health 로 백엔드 확인"
echo "  4. curl http://localhost:3000 로 프론트엔드 확인"
echo ""


#!/bin/bash

echo "=================================="
echo "  데이터베이스 연결 수정 스크립트"
echo "=================================="
echo ""

# 1. .env 파일 확인
echo "1️⃣ 백엔드 .env 파일 확인:"
if [ -f "backend/.env" ]; then
    echo "✅ .env 파일이 존재합니다"
    echo ""
    echo "현재 설정 (비밀번호는 마스킹):"
    cat backend/.env | sed 's/DB_PASSWORD=.*/DB_PASSWORD=***/' | sed 's/JWT_SECRET=.*/JWT_SECRET=***/'
else
    echo "❌ .env 파일이 없습니다!"
    echo "backend/.env 파일을 생성해야 합니다."
    exit 1
fi
echo ""

# 2. 데이터베이스 연결 테스트
echo "2️⃣ 데이터베이스 연결 테스트:"
DB_HOST=$(grep DB_HOST backend/.env | cut -d '=' -f2 | tr -d ' ')
DB_PORT=$(grep DB_PORT backend/.env | cut -d '=' -f2 | tr -d ' ')
DB_USER=$(grep DB_USER backend/.env | cut -d '=' -f2 | tr -d ' ')
DB_PASSWORD=$(grep DB_PASSWORD backend/.env | cut -d '=' -f2 | tr -d ' ')
DB_NAME=$(grep DB_NAME backend/.env | cut -d '=' -f2 | tr -d ' ')

if [ -z "$DB_PASSWORD" ]; then
    echo "⚠️  DB_PASSWORD가 비어있습니다. MariaDB root 비밀번호를 확인하세요."
    echo ""
    echo "MariaDB root 비밀번호 확인 방법:"
    echo "  sudo mysql -u root -p"
    echo ""
    read -p "MariaDB root 비밀번호를 입력하세요 (없으면 Enter): " MYSQL_PASSWORD
    if [ ! -z "$MYSQL_PASSWORD" ]; then
        # .env 파일 업데이트
        if grep -q "DB_PASSWORD=" backend/.env; then
            sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$MYSQL_PASSWORD/" backend/.env
        else
            echo "DB_PASSWORD=$MYSQL_PASSWORD" >> backend/.env
        fi
        DB_PASSWORD=$MYSQL_PASSWORD
        echo "✅ .env 파일이 업데이트되었습니다"
    fi
fi

# MySQL 연결 테스트
if [ -z "$DB_PASSWORD" ]; then
    echo "MySQL 연결 테스트 (비밀번호 없음):"
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -e "SELECT 1;" 2>&1 | head -5
else
    echo "MySQL 연결 테스트:"
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" 2>&1 | head -5
fi
echo ""

# 3. PM2 재시작 (환경 변수 다시 로드)
echo "3️⃣ PM2 재시작 (환경 변수 다시 로드):"
pm2 delete all
pm2 start ecosystem.config.js
echo ""

# 4. 잠시 대기
echo "4️⃣ 서버 시작 대기 중 (5초)..."
sleep 5
echo ""

# 5. 백엔드 로그 확인
echo "5️⃣ 백엔드 로그 확인 (데이터베이스 연결 메시지):"
pm2 logs lol-backend --lines 20 --nostream | grep -E "(Database|connected|failed|error)" || echo "로그를 확인할 수 없습니다"
echo ""

# 6. Health check
echo "6️⃣ Health check:"
curl -s http://localhost:5000/health
echo ""
echo ""

echo "=================================="
echo "  완료"
echo "=================================="
echo ""
echo "💡 다음 단계:"
echo "  1. 백엔드 로그 확인: pm2 logs lol-backend"
echo "  2. 데이터베이스 연결이 성공했는지 확인"
echo "  3. 여전히 오류가 있으면 MariaDB 비밀번호를 확인하세요"
echo ""


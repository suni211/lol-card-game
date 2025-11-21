#!/bin/bash

# Nginx 설정 스크립트

echo "=================================="
echo "  Nginx 설정 스크립트"
echo "=================================="
echo ""

# Nginx 설치 확인
if ! command -v nginx &> /dev/null; then
    echo "📦 Nginx 설치 중..."
    sudo apt update
    sudo apt install -y nginx
else
    echo "✅ Nginx가 이미 설치되어 있습니다."
fi

# 프로젝트 루트 디렉토리 확인
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
NGINX_CONF="$SCRIPT_DIR/nginx.conf"

if [ ! -f "$NGINX_CONF" ]; then
    echo "❌ nginx.conf 파일을 찾을 수 없습니다: $NGINX_CONF"
    exit 1
fi

echo ""
echo "📝 Nginx 설정 파일 복사 중..."
sudo cp "$NGINX_CONF" /etc/nginx/sites-available/lol-card-game

echo ""
echo "🔗 심볼릭 링크 생성 중..."
# 기존 링크가 있으면 제거
if [ -L /etc/nginx/sites-enabled/lol-card-game ]; then
    sudo rm /etc/nginx/sites-enabled/lol-card-game
fi

# 기본 설정 비활성화 (충돌 방지)
if [ -L /etc/nginx/sites-enabled/default ]; then
    echo "⚠️  기본 설정 비활성화 중..."
    sudo rm /etc/nginx/sites-enabled/default
fi

# 새 설정 활성화
sudo ln -s /etc/nginx/sites-available/lol-card-game /etc/nginx/sites-enabled/lol-card-game

echo ""
echo "🧪 Nginx 설정 테스트 중..."
if sudo nginx -t; then
    echo "✅ Nginx 설정이 올바릅니다."
    echo ""
    echo "🔄 Nginx 재시작 중..."
    sudo systemctl restart nginx
    echo "✅ Nginx가 재시작되었습니다."
    echo ""
    echo "📊 Nginx 상태 확인:"
    sudo systemctl status nginx --no-pager -l
else
    echo "❌ Nginx 설정에 오류가 있습니다. 위의 오류 메시지를 확인하세요."
    exit 1
fi

echo ""
echo "=================================="
echo "  설정 완료!"
echo "=================================="
echo ""
echo "📝 다음 명령어로 확인하세요:"
echo "  - Nginx 상태: sudo systemctl status nginx"
echo "  - Nginx 로그: sudo tail -f /var/log/nginx/lol-card-game-error.log"
echo "  - 접속 테스트: curl http://localhost"
echo ""


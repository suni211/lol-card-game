#!/bin/bash

DOMAIN="berrple.com"
NGINX_SITE="/etc/nginx/sites-available/lol-card-game"
NGINX_MAIN="/etc/nginx/nginx.conf"

echo "=================================="
echo "  Nginx SSL 설정 완전 수정"
echo "=================================="
echo ""

# 1. 모든 SSL 참조 찾기
echo "1️⃣ SSL 인증서 참조 검색:"
echo "  sites-available/lol-card-game:"
sudo grep -n "ssl_certificate\|listen 443" $NGINX_SITE || echo "  없음"
echo ""
echo "  sites-enabled/lol-card-game:"
sudo grep -n "ssl_certificate\|listen 443" /etc/nginx/sites-enabled/lol-card-game 2>/dev/null || echo "  없음"
echo ""
echo "  nginx.conf (메인):"
sudo grep -n "ssl_certificate\|listen 443" $NGINX_MAIN || echo "  없음"
echo ""

# 2. sites-enabled의 다른 파일들 확인
echo "2️⃣ sites-enabled의 다른 파일 확인:"
for file in /etc/nginx/sites-enabled/*; do
    if [ -f "$file" ]; then
        echo "  파일: $file"
        sudo grep -n "ssl_certificate\|listen 443" "$file" || echo "    SSL 설정 없음"
    fi
done
echo ""

# 3. sites-available/lol-card-game 완전히 재작성
echo "3️⃣ sites-available/lol-card-game 완전히 재작성:"
sudo tee $NGINX_SITE > /dev/null <<'EOF'
server {
    listen 80;
    server_name berrple.com;

    # 클라이언트 최대 업로드 크기
    client_max_body_size 10M;

    # 프론트엔드 (정적 파일)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 타임아웃 설정
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 백엔드 API
    location /api {
        proxy_pass http://localhost:5000/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 타임아웃 설정
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Socket.IO WebSocket 연결
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket 타임아웃 설정 (더 길게)
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:5000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # 로그 설정
    access_log /var/log/nginx/lol-card-game-access.log;
    error_log /var/log/nginx/lol-card-game-error.log;
}
EOF

echo "  ✅ 설정 파일이 재작성되었습니다"
echo ""

# 4. sites-enabled 링크 확인 및 재생성
echo "4️⃣ sites-enabled 링크 확인:"
if [ -L /etc/nginx/sites-enabled/lol-card-game ]; then
    echo "  ✅ 심볼릭 링크가 존재합니다"
    sudo rm /etc/nginx/sites-enabled/lol-card-game
fi
sudo ln -s $NGINX_SITE /etc/nginx/sites-enabled/lol-card-game
echo "  ✅ 심볼릭 링크가 재생성되었습니다"
echo ""

# 5. 다른 활성화된 사이트 확인 (default 등)
echo "5️⃣ 다른 활성화된 사이트 확인:"
for file in /etc/nginx/sites-enabled/*; do
    if [ -f "$file" ] && [ "$(basename $file)" != "lol-card-game" ]; then
        echo "  발견: $file"
        read -p "  이 파일을 비활성화하시겠습니까? (y/n): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo rm "$file"
            echo "  ✅ 비활성화되었습니다"
        fi
    fi
done
echo ""

# 6. nginx.conf 메인 파일에서 SSL 참조 제거 (있다면)
echo "6️⃣ nginx.conf 메인 파일 확인:"
if sudo grep -q "ssl_certificate.*berrple.com" $NGINX_MAIN; then
    echo "  ⚠️  메인 nginx.conf에 SSL 참조가 있습니다"
    echo "  백업 후 수정합니다..."
    sudo cp $NGINX_MAIN ${NGINX_MAIN}.backup.$(date +%Y%m%d_%H%M%S)
    sudo sed -i '/ssl_certificate.*berrple.com/d' $NGINX_MAIN
    echo "  ✅ 메인 파일이 수정되었습니다"
else
    echo "  ✅ 메인 파일에 SSL 참조가 없습니다"
fi
echo ""

# 7. Nginx 설정 테스트
echo "7️⃣ Nginx 설정 테스트:"
if sudo nginx -t 2>&1; then
    echo ""
    echo "  ✅ Nginx 설정이 올바릅니다!"
    sudo systemctl restart nginx
    echo "  ✅ Nginx가 재시작되었습니다"
else
    echo ""
    echo "  ❌ 여전히 오류가 있습니다"
    echo ""
    echo "  상세 오류 확인:"
    sudo nginx -t 2>&1 | grep -A 5 "error\|emerg"
    echo ""
    echo "  수동으로 확인이 필요합니다:"
    echo "  sudo nginx -T | grep -i ssl"
    exit 1
fi
echo ""

# 8. HTTP 접속 테스트
echo "8️⃣ HTTP 접속 테스트:"
sleep 2
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN 2>&1)
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
    echo "  ✅ HTTP 접속이 정상입니다 (상태 코드: $HTTP_STATUS)"
else
    echo "  ⚠️  HTTP 접속에 문제가 있습니다 (상태 코드: $HTTP_STATUS)"
fi
echo ""

# 9. SSL 인증서 발급
echo "9️⃣ SSL 인증서 발급:"
echo "  Certbot을 실행합니다..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

if [ $? -eq 0 ]; then
    echo ""
    echo "  ✅ SSL 인증서가 성공적으로 발급되었습니다!"
    echo ""
    echo "  🌐 HTTPS 접속 테스트:"
    curl -I https://$DOMAIN 2>&1 | head -10
else
    echo ""
    echo "  ❌ SSL 인증서 발급에 실패했습니다"
    echo ""
    echo "  수동으로 다시 시도:"
    echo "  sudo certbot --nginx -d $DOMAIN"
fi
echo ""

echo "=================================="
echo "  완료"
echo "=================================="
echo ""


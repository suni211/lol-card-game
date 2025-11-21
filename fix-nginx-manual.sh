#!/bin/bash

DOMAIN="berrple.com"
NGINX_CONF="/etc/nginx/sites-available/lol-card-game"

echo "=================================="
echo "  Nginx SSL 설정 수정 (수동)"
echo "=================================="
echo ""

# 1. 현재 설정 백업
echo "1️⃣ 설정 백업:"
sudo cp $NGINX_CONF ${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)
echo "  ✅ 백업 완료"
echo ""

# 2. 깨끗한 HTTP 설정으로 교체
echo "2️⃣ 깨끗한 HTTP 설정으로 교체:"
sudo tee $NGINX_CONF > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    # 클라이언트 최대 업로드 크기
    client_max_body_size 10M;

    # 프론트엔드 (정적 파일)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 타임아웃 설정
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 백엔드 API
    location /api {
        proxy_pass http://localhost:5000/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 타임아웃 설정
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Socket.IO WebSocket 연결
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket 타임아웃 설정 (더 길게)
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:5000/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }

    # 로그 설정
    access_log /var/log/nginx/lol-card-game-access.log;
    error_log /var/log/nginx/lol-card-game-error.log;
}
EOF

echo "  ✅ 설정 파일이 업데이트되었습니다"
echo ""

# 3. Nginx 설정 테스트
echo "3️⃣ Nginx 설정 테스트:"
if sudo nginx -t; then
    echo "  ✅ Nginx 설정이 올바릅니다"
    sudo systemctl restart nginx
    echo "  ✅ Nginx가 재시작되었습니다"
else
    echo "  ❌ Nginx 설정에 오류가 있습니다"
    exit 1
fi
echo ""

# 4. HTTP 접속 테스트
echo "4️⃣ HTTP 접속 테스트:"
sleep 2
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN)
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
    echo "  ✅ HTTP 접속이 정상입니다 (상태 코드: $HTTP_STATUS)"
else
    echo "  ⚠️  HTTP 접속에 문제가 있습니다 (상태 코드: $HTTP_STATUS)"
    echo "  로그 확인: sudo tail -f /var/log/nginx/error.log"
fi
echo ""

# 5. SSL 인증서 발급
echo "5️⃣ SSL 인증서 발급:"
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


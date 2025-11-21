#!/bin/bash

DOMAIN="berrple.com"
NGINX_CONF="/etc/nginx/sites-available/lol-card-game"

echo "=================================="
echo "  Nginx SSL 설정 수정 스크립트"
echo "=================================="
echo ""

# 1. 현재 Nginx 설정 백업
echo "1️⃣ Nginx 설정 백업:"
sudo cp $NGINX_CONF ${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)
echo "  ✅ 백업 완료"
echo ""

# 2. 현재 설정 확인
echo "2️⃣ 현재 설정 확인:"
echo "  SSL 관련 설정:"
sudo grep -n "ssl_certificate\|listen 443" $NGINX_CONF || echo "  SSL 설정이 없습니다"
echo ""

# 3. SSL 설정 제거 (HTTP만 사용하도록)
echo "3️⃣ SSL 설정 제거 중..."
# 임시 파일 생성
sudo cp $NGINX_CONF ${NGINX_CONF}.tmp

# SSL 관련 블록 제거 및 HTTP만 남기기
sudo awk '
BEGIN { in_ssl_block = 0; skip_line = 0 }
/^[[:space:]]*server[[:space:]]*\{/ { 
    if (in_ssl_block) { in_ssl_block = 0 }
    print
    next
}
/^[[:space:]]*listen[[:space:]]*443/ { 
    skip_line = 1
    next
}
/^[[:space:]]*ssl_certificate/ { skip_line = 1; next }
/^[[:space:]]*ssl_certificate_key/ { skip_line = 1; next }
/^[[:space:]]*ssl_protocols/ { skip_line = 1; next }
/^[[:space:]]*ssl_ciphers/ { skip_line = 1; next }
/^[[:space:]]*ssl_prefer_server_ciphers/ { skip_line = 1; next }
/^[[:space:]]*ssl_session/ { skip_line = 1; next }
/^[[:space:]]*if.*\$scheme.*http/ { skip_line = 1; next }
/^[[:space:]]*return.*https/ { skip_line = 1; next }
skip_line == 0 { print }
/^[[:space:]]*\}/ { skip_line = 0 }
' ${NGINX_CONF}.tmp > ${NGINX_CONF}.new

# server_name 업데이트
sudo sed -i "s/server_name .*/server_name $DOMAIN;/" ${NGINX_CONF}.new

# 새 설정 적용
sudo mv ${NGINX_CONF}.new $NGINX_CONF
sudo rm -f ${NGINX_CONF}.tmp

echo "  ✅ SSL 설정이 제거되었습니다"
echo ""

# 4. Nginx 설정 테스트
echo "4️⃣ Nginx 설정 테스트:"
if sudo nginx -t; then
    echo "  ✅ Nginx 설정이 올바릅니다"
    sudo systemctl reload nginx
    echo "  ✅ Nginx가 재시작되었습니다"
else
    echo "  ❌ Nginx 설정에 오류가 있습니다"
    echo "  백업에서 복원합니다..."
    sudo cp ${NGINX_CONF}.backup.* $NGINX_CONF 2>/dev/null || true
    exit 1
fi
echo ""

# 5. HTTP 접속 테스트
echo "5️⃣ HTTP 접속 테스트:"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN)
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
    echo "  ✅ HTTP 접속이 정상입니다 (상태 코드: $HTTP_STATUS)"
else
    echo "  ⚠️  HTTP 접속에 문제가 있습니다 (상태 코드: $HTTP_STATUS)"
fi
echo ""

# 6. SSL 인증서 발급 준비
echo "6️⃣ SSL 인증서 발급 준비:"
echo "  다음 명령어로 SSL 인증서를 발급받을 수 있습니다:"
echo ""
echo "  sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect"
echo ""

read -p "지금 SSL 인증서를 발급받으시겠습니까? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "7️⃣ SSL 인증서 발급 중..."
    sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect
    
    if [ $? -eq 0 ]; then
        echo "  ✅ SSL 인증서가 성공적으로 발급되었습니다"
        echo ""
        echo "  🌐 HTTPS 접속 테스트:"
        curl -I https://$DOMAIN 2>&1 | head -5
    else
        echo "  ❌ SSL 인증서 발급에 실패했습니다"
        echo "  수동으로 다시 시도하세요"
    fi
else
    echo "  SSL 인증서 발급을 건너뜁니다"
fi
echo ""

echo "=================================="
echo "  완료"
echo "=================================="
echo ""


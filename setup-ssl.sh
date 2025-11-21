#!/bin/bash

DOMAIN="berrple.com"

echo "=================================="
echo "  SSL 인증서 설정 스크립트"
echo "  도메인: $DOMAIN"
echo "=================================="
echo ""

# 1. Certbot 설치 확인
echo "1️⃣ Certbot 설치 확인:"
if ! command -v certbot &> /dev/null; then
    echo "  Certbot 설치 중..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
else
    echo "  ✅ Certbot가 이미 설치되어 있습니다"
fi
echo ""

# 2. 기존 인증서 확인
echo "2️⃣ 기존 인증서 확인:"
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "  ⚠️  기존 인증서가 있습니다"
    echo "  인증서 정보:"
    sudo certbot certificates | grep -A 10 "$DOMAIN" || true
    echo ""
    read -p "기존 인증서를 삭제하고 새로 발급받으시겠습니까? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "  기존 인증서 삭제 중..."
        sudo certbot delete --cert-name $DOMAIN --non-interactive 2>/dev/null || true
        echo "  ✅ 기존 인증서가 삭제되었습니다"
    fi
else
    echo "  ✅ 기존 인증서가 없습니다"
fi
echo ""

# 3. Nginx 설정 확인
echo "3️⃣ Nginx 설정 확인:"
if [ -f "/etc/nginx/sites-available/lol-card-game" ]; then
    echo "  ✅ Nginx 설정 파일이 있습니다"
    echo ""
    echo "  현재 server_name 설정:"
    grep "server_name" /etc/nginx/sites-available/lol-card-game || echo "  server_name이 설정되지 않았습니다"
else
    echo "  ❌ Nginx 설정 파일이 없습니다"
    echo "  nginx.conf를 복사해야 합니다"
    exit 1
fi
echo ""

# 4. DNS 확인
echo "4️⃣ DNS 확인:"
DOMAIN_IP=$(dig +short $DOMAIN | tail -1)
CURRENT_IP=$(curl -s ifconfig.me)
echo "  도메인 IP: $DOMAIN_IP"
echo "  현재 서버 IP: $CURRENT_IP"
if [ "$DOMAIN_IP" = "$CURRENT_IP" ]; then
    echo "  ✅ DNS가 올바르게 설정되어 있습니다"
else
    echo "  ⚠️  DNS가 서버 IP와 일치하지 않습니다"
    echo "  도메인의 A 레코드가 $CURRENT_IP를 가리키도록 설정하세요"
    read -p "계속하시겠습니까? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo ""

# 5. Nginx 설정 업데이트 (server_name)
echo "5️⃣ Nginx 설정 업데이트:"
sudo sed -i "s/server_name .*/server_name $DOMAIN;/" /etc/nginx/sites-available/lol-card-game
echo "  ✅ server_name이 $DOMAIN으로 업데이트되었습니다"
echo ""

# 6. Nginx 설정 테스트
echo "6️⃣ Nginx 설정 테스트:"
if sudo nginx -t; then
    echo "  ✅ Nginx 설정이 올바릅니다"
    sudo systemctl reload nginx
else
    echo "  ❌ Nginx 설정에 오류가 있습니다"
    exit 1
fi
echo ""

# 7. SSL 인증서 발급
echo "7️⃣ SSL 인증서 발급:"
echo "  Certbot을 실행합니다..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

if [ $? -eq 0 ]; then
    echo "  ✅ SSL 인증서가 성공적으로 발급되었습니다"
else
    echo "  ❌ SSL 인증서 발급에 실패했습니다"
    echo "  수동으로 실행: sudo certbot --nginx -d $DOMAIN"
    exit 1
fi
echo ""

# 8. 자동 갱신 설정
echo "8️⃣ 자동 갱신 설정:"
sudo certbot renew --dry-run
if [ $? -eq 0 ]; then
    echo "  ✅ 자동 갱신이 올바르게 설정되었습니다"
else
    echo "  ⚠️  자동 갱신 테스트에 실패했습니다"
fi
echo ""

# 9. 최종 확인
echo "9️⃣ 최종 확인:"
echo "  인증서 정보:"
sudo certbot certificates | grep -A 10 "$DOMAIN"
echo ""
echo "  Nginx 상태:"
sudo systemctl status nginx --no-pager -l | head -10
echo ""

echo "=================================="
echo "  완료!"
echo "=================================="
echo ""
echo "✅ SSL 인증서가 설정되었습니다"
echo ""
echo "🌐 접속 테스트:"
echo "  https://$DOMAIN"
echo "  https://$DOMAIN/health"
echo ""
echo "💡 유용한 명령어:"
echo "  - 인증서 확인: sudo certbot certificates"
echo "  - 인증서 갱신: sudo certbot renew"
echo "  - Nginx 재시작: sudo systemctl restart nginx"
echo ""


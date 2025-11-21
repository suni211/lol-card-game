# Nginx 설정 가이드

## 📋 사전 준비

1. **PM2로 백엔드와 프론트엔드가 실행 중이어야 합니다**
   ```bash
   pm2 list
   # lol-backend와 lol-frontend가 running 상태여야 함
   ```

2. **포트 확인**
   - 백엔드: 5000
   - 프론트엔드: 3000

## 🚀 빠른 설정 (스크립트 사용)

```bash
# 실행 권한 부여
chmod +x setup-nginx.sh

# 스크립트 실행
./setup-nginx.sh
```

## 📝 수동 설정

### 1. Nginx 설치

```bash
sudo apt update
sudo apt install -y nginx
```

### 2. 설정 파일 복사

```bash
# 프로젝트 루트에서
sudo cp nginx.conf /etc/nginx/sites-available/lol-card-game
```

### 3. 설정 활성화

```bash
# 기본 설정 제거 (충돌 방지)
sudo rm /etc/nginx/sites-enabled/default

# 새 설정 활성화
sudo ln -s /etc/nginx/sites-available/lol-card-game /etc/nginx/sites-enabled/lol-card-game
```

### 4. 설정 테스트 및 재시작

```bash
# 설정 테스트
sudo nginx -t

# 재시작
sudo systemctl restart nginx

# 상태 확인
sudo systemctl status nginx
```

## 🔍 문제 해결

### Nginx가 시작되지 않는 경우

```bash
# 설정 파일 문법 확인
sudo nginx -t

# 에러 로그 확인
sudo tail -f /var/log/nginx/error.log

# Nginx 상태 확인
sudo systemctl status nginx
```

### 502 Bad Gateway 오류

```bash
# PM2 프로세스 확인
pm2 list

# 백엔드/프론트엔드가 실행 중인지 확인
curl http://localhost:5000/health
curl http://localhost:3000

# 포트 확인
sudo netstat -tlnp | grep -E ':(3000|5000)'
```

### Socket.IO 연결 실패

```bash
# Socket.IO 경로가 올바르게 프록시되는지 확인
# nginx.conf에서 /socket.io/ location 블록 확인

# Nginx 재시작
sudo systemctl restart nginx
```

### 포트 80이 이미 사용 중인 경우

```bash
# 포트 80 사용 중인 프로세스 확인
sudo lsof -i :80

# Apache가 실행 중이면 중지
sudo systemctl stop apache2
sudo systemctl disable apache2
```

## 📊 로그 확인

```bash
# 접근 로그
sudo tail -f /var/log/nginx/lol-card-game-access.log

# 에러 로그
sudo tail -f /var/log/nginx/lol-card-game-error.log

# 전체 Nginx 에러 로그
sudo tail -f /var/log/nginx/error.log
```

## 🔧 설정 커스터마이징

### 도메인/IP 설정

`nginx.conf` 파일에서 `server_name` 수정:

```nginx
server_name your-domain.com;  # 도메인 사용 시
# 또는
server_name 123.456.789.012;  # IP 주소 사용 시
```

### HTTPS 설정 (Let's Encrypt)

```bash
# Certbot 설치
sudo apt install -y certbot python3-certbot-nginx

# SSL 인증서 발급
sudo certbot --nginx -d your-domain.com

# 자동 갱신 테스트
sudo certbot renew --dry-run
```

## ✅ 확인 사항

설정 완료 후 다음을 확인하세요:

1. **프론트엔드 접속**
   ```bash
   curl http://localhost
   # 또는 브라우저에서 http://YOUR_IP
   ```

2. **백엔드 API 접속**
   ```bash
   curl http://localhost/api/health
   ```

3. **Socket.IO 연결**
   - 브라우저 개발자 도구에서 WebSocket 연결 확인
   - Network 탭 → WS 필터

## 🔄 Nginx 관리 명령어

```bash
# 시작
sudo systemctl start nginx

# 중지
sudo systemctl stop nginx

# 재시작
sudo systemctl restart nginx

# 리로드 (무중단)
sudo systemctl reload nginx

# 상태 확인
sudo systemctl status nginx

# 부팅 시 자동 시작
sudo systemctl enable nginx

# 부팅 시 자동 시작 해제
sudo systemctl disable nginx
```

## 📝 주요 설정 설명

### 프론트엔드 프록시 (`location /`)
- 모든 요청을 `http://localhost:3000`으로 프록시
- WebSocket 업그레이드 지원

### 백엔드 API 프록시 (`location /api`)
- `/api/*` 경로를 `http://localhost:5000`으로 프록시
- API 요청 처리

### Socket.IO 프록시 (`location /socket.io/`)
- WebSocket 연결을 위한 특별 설정
- 긴 타임아웃 설정 (7일)으로 연결 유지

## 🚨 주의사항

1. **방화벽 설정**: GCP 방화벽에서 포트 80, 443 허용 확인
2. **PM2 실행 확인**: Nginx 설정 전에 PM2로 앱이 실행 중이어야 함
3. **포트 충돌**: 다른 웹 서버(Apache 등)가 실행 중이면 중지 필요


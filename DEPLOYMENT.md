# GCP Compute Engine 배포 가이드

## 1. 로컬 데이터베이스 설정 (개발용)

### Windows에서 MariaDB 설치

#### 방법 1: XAMPP 사용 (권장 - 가장 쉬움)
1. [XAMPP 다운로드](https://www.apachefriends.org/download.html)
2. 설치 후 XAMPP Control Panel 실행
3. MySQL 시작 버튼 클릭
4. "Shell" 버튼 클릭하여 터미널 열기
5. 아래 명령어 실행:

```bash
# MySQL 접속
mysql -u root -p
# (비밀번호가 없으면 그냥 Enter)

# 데이터베이스 생성 및 설정
source C:/Users/hisam/OneDrive/바탕\ 화면/lol-card-game/backend/database/schema.sql
source C:/Users/hisam/OneDrive/바탕\ 화면/lol-card-game/backend/database/seed_players.sql
source C:/Users/hisam/OneDrive/바탕\ 화면/lol-card-game/backend/database/seed_missions.sql

# 확인
USE lol_card_game;
SHOW TABLES;
SELECT COUNT(*) FROM players;
```

#### 방법 2: MariaDB 직접 설치
1. [MariaDB 다운로드](https://mariadb.org/download/)
2. 설치 시 root 비밀번호 설정
3. 명령 프롬프트(CMD)에서:

```bash
# MySQL 서비스 시작
net start MySQL

# MySQL 접속
mysql -u root -p
# 설치 시 설정한 비밀번호 입력

# SQL 파일 실행
source C:/Users/hisam/OneDrive/바탕\ 화면/lol-card-game/backend/database/schema.sql
source C:/Users/hisam/OneDrive/바탕\ 화면/lol-card-game/backend/database/seed_players.sql
source C:/Users/hisam/OneDrive/바탕\ 화면/lol-card-game/backend/database/seed_missions.sql
```

### .env 파일 설정

`backend/.env` 파일에서 데이터베이스 비밀번호 설정:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=여기에_비밀번호_입력  # XAMPP는 기본적으로 비밀번호 없음 (빈 문자열)
DB_NAME=lol_card_game
```

---

## 2. GCP Compute Engine 배포

### 사전 준비
- Google Cloud Platform 계정
- 결제 정보 등록
- GCP 프로젝트 생성

### Step 1: GCP Compute Engine VM 인스턴스 생성

1. **GCP Console 접속**
   - https://console.cloud.google.com
   - Compute Engine → VM 인스턴스로 이동

2. **인스턴스 만들기**
   ```
   이름: lol-card-game
   리전: asia-northeast3 (서울)
   영역: asia-northeast3-a

   머신 구성:
   - 시리즈: E2
   - 머신 유형: e2-medium (2 vCPU, 4GB 메모리)

   부팅 디스크:
   - 운영체제: Ubuntu
   - 버전: Ubuntu 22.04 LTS
   - 디스크 크기: 30GB

   방화벽:
   ✅ HTTP 트래픽 허용
   ✅ HTTPS 트래픽 허용
   ```

3. **만들기** 클릭

### Step 2: 방화벽 규칙 설정

1. **VPC 네트워크** → **방화벽** 이동
2. **방화벽 규칙 만들기**

```
이름: allow-app-ports
대상: 네트워크의 모든 인스턴스
소스 IPv4 범위: 0.0.0.0/0
프로토콜 및 포트:
  ✅ 지정된 프로토콜 및 포트
  tcp: 3000,5000,5173,80,443,3306
```

### Step 3: VM 접속 및 환경 설정

1. **SSH로 VM 접속**
   - GCP Console에서 VM 인스턴스 옆 "SSH" 버튼 클릭

2. **기본 패키지 업데이트**
```bash
sudo apt update && sudo apt upgrade -y
```

3. **Node.js 설치**
```bash
# Node.js 20.x 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 확인
node -v
npm -v
```

4. **MariaDB 설치**
```bash
sudo apt install -y mariadb-server

# MariaDB 보안 설정
sudo mysql_secure_installation
# Enter current password: (Enter - 비밀번호 없음)
# Set root password? Y
# 새 비밀번호 입력 (예: your_strong_password)
# Remove anonymous users? Y
# Disallow root login remotely? N (원격 접속 허용)
# Remove test database? Y
# Reload privilege tables? Y
```

5. **MariaDB 원격 접속 설정**
```bash
sudo nano /etc/mysql/mariadb.conf.d/50-server.cnf
# bind-address 줄 찾아서 주석 처리:
# bind-address = 127.0.0.1

sudo systemctl restart mariadb

# Root 계정 원격 접속 허용
sudo mysql -u root -p
```

MariaDB 내에서:
```sql
USE mysql;
UPDATE user SET host='%' WHERE user='root';
FLUSH PRIVILEGES;
EXIT;
```

6. **PM2 설치 (프로세스 관리)**
```bash
sudo npm install -g pm2
```

### Step 4: 프로젝트 배포

1. **프로젝트 업로드**

로컬에서:
```bash
cd "C:\Users\hisam\OneDrive\바탕 화면\lol-card-game"

# Git 초기화
git init
git add .
git commit -m "Initial commit"

# GitHub에 푸시 (먼저 GitHub에서 repository 생성)
git remote add origin https://github.com/YOUR_USERNAME/lol-card-game.git
git push -u origin main
```

VM에서:
```bash
cd ~
git clone https://github.com/YOUR_USERNAME/lol-card-game.git
cd lol-card-game
```

2. **데이터베이스 설정**
```bash
# MariaDB 접속
mysql -u root -p
# 비밀번호 입력

# 데이터베이스 생성
source ~/lol-card-game/backend/database/schema.sql
source ~/lol-card-game/backend/database/seed_players.sql
source ~/lol-card-game/backend/database/seed_missions.sql

# 확인
USE lol_card_game;
SHOW TABLES;
SELECT COUNT(*) FROM players;
EXIT;
```

3. **백엔드 설정 및 실행**
```bash
cd ~/lol-card-game/backend

# .env 파일 생성
nano .env
```

`.env` 내용:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_strong_password  # MariaDB 설치 시 설정한 비밀번호
DB_NAME=lol_card_game

JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRE=7d

PORT=5000
NODE_ENV=production

CORS_ORIGIN=http://YOUR_VM_EXTERNAL_IP:3000
```

```bash
# 의존성 설치 및 빌드
npm install
npm run build

# PM2로 실행
pm2 start dist/server.js --name "lol-backend"
pm2 save
pm2 startup
```

4. **프론트엔드 설정 및 실행**
```bash
cd ~/lol-card-game/frontend

# API 엔드포인트 설정
nano .env
```

`.env` 내용:
```env
VITE_API_URL=http://YOUR_VM_EXTERNAL_IP:5000/api
```

```bash
# 의존성 설치
npm install

# 프로덕션 빌드
npm run build

# Serve를 사용하여 배포
sudo npm install -g serve
pm2 start "serve -s dist -l 3000" --name "lol-frontend"
pm2 save
```

### Step 5: Nginx 설정 (선택사항 - 프로덕션 권장)

```bash
# Nginx 설치
sudo apt install -y nginx

# Nginx 설정 파일 생성
sudo nano /etc/nginx/sites-available/lol-card-game
```

설정 파일 내용:
```nginx
server {
    listen 80;
    server_name YOUR_VM_EXTERNAL_IP;

    # 프론트엔드
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 백엔드 API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/lol-card-game /etc/nginx/sites-enabled/

# Nginx 테스트 및 재시작
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: SSL 인증서 설정 (선택사항 - HTTPS)

```bash
# Certbot 설치
sudo apt install -y certbot python3-certbot-nginx

# 도메인이 있는 경우
sudo certbot --nginx -d yourdomain.com

# 자동 갱신 설정
sudo certbot renew --dry-run
```

### Step 7: 접속 확인

1. **VM External IP 확인**
   - GCP Console → Compute Engine → VM 인스턴스
   - External IP 복사

2. **브라우저에서 접속**
   ```
   http://YOUR_VM_EXTERNAL_IP
   또는 (Nginx 사용 시)
   http://YOUR_VM_EXTERNAL_IP:3000
   ```

---

## 3. 유용한 명령어

### PM2 관리
```bash
# 프로세스 상태 확인
pm2 list

# 로그 확인
pm2 logs lol-backend
pm2 logs lol-frontend

# 프로세스 재시작
pm2 restart lol-backend
pm2 restart lol-frontend

# 프로세스 중지
pm2 stop lol-backend
pm2 stop lol-frontend

# 프로세스 삭제
pm2 delete lol-backend
pm2 delete lol-frontend
```

### 데이터베이스 백업
```bash
# 백업
mysqldump -u root -p lol_card_game > backup.sql

# 복원
mysql -u root -p lol_card_game < backup.sql
```

### 시스템 모니터링
```bash
# 시스템 리소스 확인
htop

# 디스크 사용량
df -h

# 메모리 사용량
free -h
```

---

## 4. 문제 해결

### 포트가 이미 사용 중인 경우
```bash
# 포트 사용 중인 프로세스 확인
sudo lsof -i :5000
sudo lsof -i :3000

# 프로세스 종료
sudo kill -9 PID
```

### 방화벽 문제
```bash
# UFW 방화벽 설정 (Ubuntu)
sudo ufw allow 3000
sudo ufw allow 5000
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 데이터베이스 연결 오류
```bash
# MariaDB 상태 확인
sudo systemctl status mariadb

# 재시작
sudo systemctl restart mariadb

# 연결 테스트
mysql -u root -p -h localhost
```

---

## 5. 비용 최적화

- **자동 종료 설정**: 사용하지 않을 때 VM 중지
- **예약 VM**: 장기 사용 시 비용 절감
- **부하 분산**: 트래픽 증가 시 Load Balancer 고려

---

## 6. 보안 권장사항

1. ✅ 방화벽 규칙 최소화 (필요한 포트만 열기)
2. ✅ SSH 키 기반 인증 사용
3. ✅ 정기적인 보안 업데이트
4. ✅ 강력한 데이터베이스 비밀번호
5. ✅ HTTPS 사용 (SSL 인증서)
6. ✅ 환경 변수(.env) 파일 보안 관리

---

**배포 완료!** 🚀

문제가 발생하면 로그를 확인하세요:
- 백엔드: `pm2 logs lol-backend`
- 프론트엔드: `pm2 logs lol-frontend`
- Nginx: `sudo tail -f /var/log/nginx/error.log`

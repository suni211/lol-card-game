# 완전히 다른 서버로 이전하기 (데이터베이스 포함)

현재 GCP 서버에서 완전히 새로운 GCP 계정/서버로 모든 데이터를 이전하는 가이드입니다.

## 📋 목차
1. [기존 서버에서 백업](#1-기존-서버에서-백업)
2. [새 서버 설정](#2-새-서버-설정)
3. [데이터 복원](#3-데이터-복원)
4. [확인 및 테스트](#4-확인-및-테스트)

---

## 1. 기존 서버에서 백업

### Step 1-1: 기존 서버에 SSH 접속

```bash
# GCP Console에서 기존 VM의 SSH 버튼 클릭
```

### Step 1-2: 데이터베이스 백업

```bash
# 백업 디렉토리 생성
mkdir -p ~/backup
cd ~/backup

# 전체 데이터베이스 백업 (모든 테이블 + 데이터)
mysqldump -u root -p lol_card_game > lol_card_game_backup.sql

# 비밀번호 입력 후 백업 완료
# 백업 파일 확인
ls -lh lol_card_game_backup.sql
```

### Step 1-3: 코드 및 설정 파일 백업

```bash
cd ~

# 전체 프로젝트 압축
tar -czf lol-card-game-backup.tar.gz \
  lol-card-game/backend/.env \
  lol-card-game/frontend/.env \
  backup/lol_card_game_backup.sql

# 백업 파일 확인
ls -lh lol-card-game-backup.tar.gz
```

### Step 1-4: 백업 파일 다운로드

**방법 1: GCP Console 사용 (권장)**
```bash
# 백업 파일을 홈 디렉토리로 이동
mv lol-card-game-backup.tar.gz ~/

# GCP Console에서:
# 1. VM 인스턴스 페이지의 SSH 드롭다운 메뉴
# 2. "gcloud 명령어 보기" 클릭
# 3. 로컬 터미널에서 다음 명령어 실행:
```

로컬 컴퓨터(Windows)에서:
```bash
# gcloud 설치되어 있다면
gcloud compute scp [VM_NAME]:~/lol-card-game-backup.tar.gz C:\Users\hisam\Downloads\

# 또는 GCP Console의 "파일 업로드/다운로드" 메뉴 사용
```

**방법 2: Google Cloud Storage 사용**
```bash
# 기존 서버에서
# Cloud Storage bucket에 업로드
gsutil mb gs://lol-card-game-backup
gsutil cp ~/lol-card-game-backup.tar.gz gs://lol-card-game-backup/
gsutil cp ~/backup/lol_card_game_backup.sql gs://lol-card-game-backup/

# 새 서버에서 나중에 다운로드 가능
```

---

## 2. 새 서버 설정

### Step 2-1: 새 GCP 계정에서 VM 생성

새 GCP 계정 로그인 후:

1. **Compute Engine → VM 인스턴스 만들기**
   ```
   이름: lol-card-game-new
   리전: asia-northeast3 (서울) 또는 원하는 리전
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

2. **방화벽 규칙 설정**
   - VPC 네트워크 → 방화벽 → 방화벽 규칙 만들기
   ```
   이름: allow-app-ports
   대상: 네트워크의 모든 인스턴스
   소스 IPv4 범위: 0.0.0.0/0
   프로토콜 및 포트:
     tcp: 3000,5000,80,443
   ```

### Step 2-2: 새 서버에 기본 환경 설정

```bash
# SSH로 새 VM 접속 후

# 1. 패키지 업데이트
sudo apt update && sudo apt upgrade -y

# 2. Node.js 20 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 확인
node -v  # v20.x.x
npm -v   # 10.x.x

# 3. MariaDB 설치
sudo apt install -y mariadb-server

# 4. MariaDB 보안 설정
sudo mysql_secure_installation
```

**MariaDB 설정 시:**
```
Enter current password for root: [Enter]
Set root password? Y
New password: [강력한 비밀번호 입력]
Re-enter new password: [비밀번호 재입력]
Remove anonymous users? Y
Disallow root login remotely? N
Remove test database? Y
Reload privilege tables? Y
```

```bash
# 5. PM2 설치
sudo npm install -g pm2 serve

# 6. Git 설치 (이미 설치되어 있을 수 있음)
sudo apt install -y git
```

---

## 3. 데이터 복원

### Step 3-1: 백업 파일 업로드

**방법 1: Google Cloud Storage 사용**
```bash
# 새 서버에서
cd ~

# Cloud Storage에서 다운로드
gsutil cp gs://lol-card-game-backup/lol-card-game-backup.tar.gz ~/
gsutil cp gs://lol-card-game-backup/lol_card_game_backup.sql ~/
```

**방법 2: gcloud scp 사용**
```bash
# 로컬 컴퓨터에서 새 서버로 업로드
gcloud compute scp C:\Users\hisam\Downloads\lol-card-game-backup.tar.gz [NEW_VM_NAME]:~/
```

**방법 3: GitHub 사용 (코드만)**
```bash
# 새 서버에서
cd ~
git clone https://github.com/YOUR_USERNAME/lol-card-game.git
```

### Step 3-2: 백업 압축 해제

```bash
cd ~

# 압축 해제
tar -xzf lol-card-game-backup.tar.gz

# 또는 GitHub에서 클론한 경우
# .env 파일만 복원
```

### Step 3-3: 데이터베이스 복원

```bash
# MySQL 접속
sudo mysql -u root -p
# 설정한 비밀번호 입력
```

**MySQL 내에서:**
```sql
-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS lol_card_game CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 데이터베이스 선택
USE lol_card_game;

-- 백업 파일 복원
source ~/backup/lol_card_game_backup.sql;

-- 또는 압축 해제한 파일 사용
-- source ~/lol_card_game_backup.sql;

-- 데이터 확인
SHOW TABLES;
SELECT COUNT(*) FROM players;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM user_cards;

-- 종료
EXIT;
```

**또는 터미널에서 직접 복원:**
```bash
# 데이터베이스가 이미 생성되어 있다면
mysql -u root -p lol_card_game < ~/backup/lol_card_game_backup.sql
```

### Step 3-4: 백엔드 설정

```bash
cd ~/lol-card-game/backend

# .env 파일 수정 (새 서버 정보로 업데이트)
nano .env
```

**`.env` 내용 (새 서버에 맞게 수정):**
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=새서버에서_설정한_MariaDB_비밀번호
DB_NAME=lol_card_game

JWT_SECRET=lol-card-game-super-secret-2025-gcp
JWT_EXPIRE=7d

PORT=5000
NODE_ENV=production

CORS_ORIGIN=*
```

```bash
# 의존성 설치
npm install

# 빌드
npm run build

# PM2로 실행
pm2 start dist/server.js --name "lol-backend"

# 로그 확인
pm2 logs lol-backend --lines 50
```

### Step 3-5: 프론트엔드 설정

```bash
cd ~/lol-card-game/frontend

# .env 파일 수정
nano .env
```

**`.env` 내용 (새 VM의 External IP 사용):**
```env
VITE_API_URL=http://새_VM_EXTERNAL_IP:5000/api
```

```bash
# 의존성 설치
npm install

# 프로덕션 빌드
npm run build

# PM2로 실행
pm2 start "serve -s dist -l 3000" --name "lol-frontend"

# PM2 자동 시작 설정
pm2 save
pm2 startup
# 출력되는 명령어 복사해서 실행

# 프로세스 확인
pm2 list
```

---

## 4. 확인 및 테스트

### Step 4-1: 서비스 상태 확인

```bash
# PM2 프로세스 확인
pm2 list

# 백엔드 로그
pm2 logs lol-backend --lines 20

# 프론트엔드 로그
pm2 logs lol-frontend --lines 20

# MariaDB 상태
sudo systemctl status mariadb
```

### Step 4-2: 데이터베이스 데이터 확인

```bash
mysql -u root -p
```

```sql
USE lol_card_game;

-- 사용자 수 확인
SELECT COUNT(*) FROM users;

-- 카드 데이터 확인
SELECT COUNT(*) FROM user_cards;

-- 플레이어 데이터 확인
SELECT COUNT(*) FROM players;

-- 최근 사용자 확인
SELECT id, username, email, created_at FROM users ORDER BY created_at DESC LIMIT 5;

EXIT;
```

### Step 4-3: 브라우저 테스트

1. **새 VM의 External IP 확인**
   - GCP Console → Compute Engine → VM 인스턴스
   - External IP 복사

2. **접속 테스트**
   ```
   Frontend: http://새_VM_EXTERNAL_IP:3000
   Backend Health Check: http://새_VM_EXTERNAL_IP:5000/health
   ```

3. **기능 테스트**
   - ✅ 기존 계정으로 로그인
   - ✅ 기존 카드 보유 확인
   - ✅ 뽑기 기능 테스트
   - ✅ 전투 기능 테스트
   - ✅ 코치 시스템 테스트

### Step 4-4: 방화벽 확인

```bash
# Ubuntu 방화벽 설정
sudo ufw allow 3000
sudo ufw allow 5000
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22
sudo ufw enable
sudo ufw status
```

---

## 5. (선택) Nginx 설정

프로덕션 환경이라면 Nginx 사용 권장:

```bash
# Nginx 설치
sudo apt install -y nginx

# 설정 파일 생성
sudo nano /etc/nginx/sites-available/lol-card-game
```

**Nginx 설정:**
```nginx
server {
    listen 80;
    server_name 새_VM_EXTERNAL_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

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

# 기본 설정 제거
sudo rm /etc/nginx/sites-enabled/default

# Nginx 테스트 및 재시작
sudo nginx -t
sudo systemctl restart nginx
```

---

## 6. 기존 서버 정리

새 서버가 정상적으로 작동하는 것을 확인한 후:

```bash
# 기존 서버에 SSH 접속

# PM2 프로세스 중지
pm2 stop all
pm2 delete all

# (선택) 백업 파일 삭제
rm -rf ~/backup
rm ~/lol-card-game-backup.tar.gz
```

**GCP Console에서:**
1. 기존 VM 인스턴스 선택
2. "중지" 클릭 (완전 삭제 전 테스트)
3. 모든 것이 정상이면 "삭제" 클릭

---

## 📝 체크리스트

### 백업 단계
- [ ] 데이터베이스 백업 완료
- [ ] .env 파일 백업 완료
- [ ] 백업 파일 다운로드/저장 완료

### 새 서버 설정
- [ ] 새 GCP VM 생성 완료
- [ ] 방화벽 규칙 설정 완료
- [ ] Node.js 설치 완료
- [ ] MariaDB 설치 및 보안 설정 완료
- [ ] PM2 설치 완료

### 데이터 복원
- [ ] 백업 파일 업로드 완료
- [ ] 데이터베이스 복원 완료
- [ ] 데이터 무결성 확인 완료
- [ ] 백엔드 .env 설정 및 실행 완료
- [ ] 프론트엔드 .env 설정 및 실행 완료

### 테스트
- [ ] 브라우저 접속 확인
- [ ] 기존 계정 로그인 테스트
- [ ] 기존 데이터 확인
- [ ] 모든 기능 정상 작동 확인

### 정리
- [ ] 기존 서버 중지/삭제

---

## ⚠️ 주의사항

1. **데이터 백업은 필수!**
   - 이전 작업 전 반드시 백업
   - 백업 파일 다운로드 확인

2. **External IP 변경**
   - 새 서버의 IP가 다르므로 프론트엔드 .env 수정 필수
   - 사용자들에게 새 주소 안내 필요

3. **비밀번호 관리**
   - MariaDB 비밀번호 안전하게 보관
   - JWT_SECRET은 기존과 동일하게 유지 (기존 토큰 호환성)

4. **방화벽 설정**
   - GCP 방화벽과 Ubuntu UFW 모두 설정

5. **PM2 자동 시작**
   - `pm2 save` 및 `pm2 startup` 반드시 실행
   - 서버 재부팅 시 자동으로 애플리케이션 시작

---

## 🆘 문제 해결

### 데이터베이스 복원 실패
```bash
# 오류 확인
mysql -u root -p
SHOW ERRORS;

# 데이터베이스 삭제 후 재생성
DROP DATABASE lol_card_game;
CREATE DATABASE lol_card_game CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
source ~/backup/lol_card_game_backup.sql;
```

### 백엔드 연결 오류
```bash
# 로그 확인
pm2 logs lol-backend --lines 50

# .env 파일 확인
cat ~/lol-card-game/backend/.env

# MariaDB 연결 테스트
mysql -u root -p -h localhost lol_card_game
```

### 프론트엔드 API 연결 안됨
```bash
# .env 확인
cat ~/lol-card-game/frontend/.env

# 백엔드가 정상 작동하는지 확인
curl http://localhost:5000/health

# 방화벽 확인
sudo ufw status
```

---

**마이그레이션 완료!** 🎉

새 서버에서 모든 기존 데이터와 함께 정상적으로 작동합니다!

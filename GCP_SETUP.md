# GCP에서 바로 실행하기 (빠른 가이드)

GCP VM에 프로젝트를 클론 받은 후 아래 명령어를 **순서대로** 실행하세요.

## 1. 기본 환경 설정

```bash
# 패키지 업데이트
sudo apt update && sudo apt upgrade -y

# Node.js 20 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 확인
node -v  # v20.x.x
npm -v   # 10.x.x
```

## 2. MariaDB 설치 및 설정

```bash
# MariaDB 설치
sudo apt install -y mariadb-server

# MariaDB 보안 설정
sudo mysql_secure_installation
```

**설정 시 질문:**
```
Enter current password for root: [Enter 입력]
Set root password? [Y/n]: Y
New password: your_password (예: lolcard2025!)
Re-enter new password: your_password
Remove anonymous users? [Y/n]: Y
Disallow root login remotely? [Y/n]: N  ⚠️ N 입력 (원격 접속 허용)
Remove test database? [Y/n]: Y
Reload privilege tables now? [Y/n]: Y
```

## 3. 데이터베이스 생성

```bash
# MySQL 접속
sudo mysql -u root -p
# 위에서 설정한 비밀번호 입력
```

**MySQL 내에서 실행:**
```sql
-- 데이터베이스 생성
source /home/YOUR_USERNAME/lol-card-game/backend/database/schema.sql;

-- 선수 데이터 삽입
source /home/YOUR_USERNAME/lol-card-game/backend/database/seed_players.sql;

-- 미션 데이터 삽입
source /home/YOUR_USERNAME/lol-card-game/backend/database/seed_missions.sql;

-- 확인
USE lol_card_game;
SHOW TABLES;
SELECT COUNT(*) FROM players;
SELECT COUNT(*) FROM missions;

-- 종료
EXIT;
```

## 4. 백엔드 설정 및 실행

```bash
cd ~/lol-card-game/backend

# 의존성 설치
npm install

# .env 파일 생성
nano .env
```

**`.env` 파일 내용 (Ctrl+O 저장, Ctrl+X 종료):**
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=lol_card_game

JWT_SECRET=lol-card-game-super-secret-2025-gcp
JWT_EXPIRE=7d

PORT=5000
NODE_ENV=production

CORS_ORIGIN=*
```

```bash
# 빌드
npm run build

# PM2 설치 (프로세스 관리)
sudo npm install -g pm2

# 백엔드 실행
pm2 start dist/server.js --name "lol-backend"

# 로그 확인
pm2 logs lol-backend
```

## 5. 프론트엔드 설정 및 실행

```bash
cd ~/lol-card-game/frontend

# 의존성 설치
npm install

# API URL 설정
nano .env
```

**`.env` 파일 내용:**
```env
VITE_API_URL=http://YOUR_VM_EXTERNAL_IP:5000/api
```

**YOUR_VM_EXTERNAL_IP를 실제 VM의 External IP로 변경하세요!**
- GCP Console → Compute Engine → VM 인스턴스에서 확인

```bash
# 프로덕션 빌드
npm run build

# Serve 설치 및 실행
sudo npm install -g serve
pm2 start "serve -s dist -l 3000" --name "lol-frontend"

# 자동 시작 설정
pm2 save
pm2 startup
# 출력되는 명령어를 복사해서 실행
```

## 6. 방화벽 설정

```bash
# 포트 열기
sudo ufw allow 3000
sudo ufw allow 5000
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22
sudo ufw enable
```

**GCP 방화벽도 확인:**
1. GCP Console → VPC 네트워크 → 방화벽
2. `tcp:3000,5000,80,443` 포트가 열려있는지 확인
3. 없으면 방화벽 규칙 추가

## 7. 접속 확인

브라우저에서:
```
http://YOUR_VM_EXTERNAL_IP:3000
```

백엔드 확인:
```
http://YOUR_VM_EXTERNAL_IP:5000/health
```

## 8. PM2 관리 명령어

```bash
# 프로세스 상태 확인
pm2 list

# 로그 보기
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

## 9. 문제 해결

### 백엔드가 시작되지 않는 경우

```bash
# 로그 확인
pm2 logs lol-backend

# 수동으로 실행해서 에러 확인
cd ~/lol-card-game/backend
node dist/server.js
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

### 포트가 이미 사용 중인 경우

```bash
# 포트 사용 확인
sudo lsof -i :3000
sudo lsof -i :5000

# 프로세스 종료
sudo kill -9 PID
```

## 10. Nginx 설정 (선택사항 - 80 포트 사용)

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
    server_name YOUR_VM_EXTERNAL_IP;

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

**Nginx 사용 시 접속:**
```
http://YOUR_VM_EXTERNAL_IP  (포트 번호 없이)
```

---

## ✅ 완료 체크리스트

- [ ] Node.js 설치 완료
- [ ] MariaDB 설치 및 보안 설정 완료
- [ ] 데이터베이스 생성 및 데이터 삽입 완료
- [ ] 백엔드 .env 설정 및 실행 완료
- [ ] 프론트엔드 .env 설정 및 실행 완료
- [ ] 방화벽 포트 열기 완료
- [ ] 브라우저에서 접속 확인 완료

---

## 🚀 빠른 실행 스크립트 (모든 명령어 한번에)

```bash
# 이 스크립트는 참고용입니다. 각 단계를 이해하고 실행하세요.

# 1. 환경 설정
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs mariadb-server
sudo npm install -g pm2 serve

# 2. 데이터베이스 설정 (비밀번호는 수동으로 설정)
sudo mysql_secure_installation

# 3. 백엔드 실행
cd ~/lol-card-game/backend
npm install
# .env 파일 수동 생성 필요
npm run build
pm2 start dist/server.js --name "lol-backend"

# 4. 프론트엔드 실행
cd ~/lol-card-game/frontend
npm install
# .env 파일 수동 생성 필요
npm run build
pm2 start "serve -s dist -l 3000" --name "lol-frontend"

# 5. PM2 저장
pm2 save
pm2 startup

# 6. 방화벽
sudo ufw allow 3000,5000,80,443,22/tcp
sudo ufw enable
```

---

**완료되면 `http://YOUR_VM_EXTERNAL_IP:3000` 접속하세요!** 🎮

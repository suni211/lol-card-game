# PM2 배포 가이드

PM2를 사용하여 프론트엔드와 백엔드를 모두 관리하는 방법입니다.

## 📋 사전 준비

### 1. PM2 설치

```bash
npm install -g pm2
```

### 2. 프로젝트 의존성 설치

```bash
# 백엔드
cd backend
npm install

# 프론트엔드
cd ../frontend
npm install
```

## 🚀 시작하기

### 방법 1: 스크립트 사용 (권장)

```bash
# 실행 권한 부여 (처음 한 번만)
chmod +x pm2-start.sh
chmod +x pm2-stop.sh

# 시작
./pm2-start.sh

# 중지
./pm2-stop.sh
```

### 방법 2: 직접 PM2 명령어 사용

```bash
# 1. 백엔드 빌드
cd backend
npm run build
cd ..

# 2. 프론트엔드 빌드
cd frontend
npm run build
cd ..

# 3. serve 패키지 설치 (프론트엔드용)
npm install -g serve

# 4. PM2로 시작
pm2 start ecosystem.config.js

# 5. PM2 설정 저장 (재부팅 시 자동 시작)
pm2 save

# 6. PM2 자동 시작 설정 (시스템 부팅 시)
pm2 startup
# 출력된 명령어를 복사해서 실행
```

## 📊 관리 명령어

### 프로세스 상태 확인

```bash
# 전체 프로세스 목록
pm2 list

# 상세 정보
pm2 show lol-backend
pm2 show lol-frontend

# 모니터링 (실시간)
pm2 monit
```

### 로그 확인

```bash
# 모든 로그
pm2 logs

# 특정 앱 로그
pm2 logs lol-backend
pm2 logs lol-frontend

# 로그 파일 위치
# - 백엔드: ./logs/backend-out.log, ./logs/backend-error.log
# - 프론트엔드: ./logs/frontend-out.log, ./logs/frontend-error.log
```

### 프로세스 제어

```bash
# 재시작
pm2 restart all
pm2 restart lol-backend
pm2 restart lol-frontend

# 중지
pm2 stop all
pm2 stop lol-backend
pm2 stop lol-frontend

# 삭제
pm2 delete all
pm2 delete lol-backend
pm2 delete lol-frontend

# 리로드 (무중단 재시작)
pm2 reload all
```

### 설정 관리

```bash
# 현재 설정 저장
pm2 save

# 저장된 설정 삭제
pm2 unstartup

# 시스템 부팅 시 자동 시작 설정
pm2 startup
```

## 🔄 업데이트 및 재배포

### 코드 업데이트 후 재배포

```bash
# 1. 코드 업데이트 (git pull 등)
git pull origin main

# 2. 의존성 업데이트
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 3. 빌드
cd backend && npm run build && cd ..
cd frontend && npm run build && cd ..

# 4. PM2 재시작
pm2 restart all

# 또는 무중단 리로드
pm2 reload all
```

## ⚙️ 환경 변수 설정

### 백엔드 환경 변수

`backend/.env` 파일 생성:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=lol_card_game

JWT_SECRET=your-secret-key
JWT_EXPIRE=7d

PORT=5000
NODE_ENV=production

CORS_ORIGIN=http://localhost:3000
```

### 프론트엔드 환경 변수

`frontend/.env` 파일 생성:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## 🐛 문제 해결

### 포트가 이미 사용 중인 경우

```bash
# 포트 사용 중인 프로세스 확인
sudo lsof -i :5000  # 백엔드
sudo lsof -i :3000  # 프론트엔드

# 프로세스 종료
sudo kill -9 <PID>
```

### PM2 프로세스가 시작되지 않는 경우

```bash
# 로그 확인
pm2 logs

# 프로세스 삭제 후 재시작
pm2 delete all
pm2 start ecosystem.config.js
```

### 빌드 오류

```bash
# 백엔드 빌드 오류
cd backend
rm -rf dist node_modules
npm install
npm run build

# 프론트엔드 빌드 오류
cd frontend
rm -rf dist node_modules
npm install
npm run build
```

### 메모리 부족

`ecosystem.config.js`에서 메모리 제한 조정:

```javascript
max_memory_restart: '2G',  // 백엔드
max_memory_restart: '1G',  // 프론트엔드
```

## 📈 모니터링

### PM2 웹 대시보드 (선택사항)

```bash
# PM2 Plus 계정 생성 후
pm2 link <secret_key> <public_key>
```

### 시스템 리소스 모니터링

```bash
# PM2 모니터링
pm2 monit

# 시스템 리소스
htop
free -h
df -h
```

## 🔒 프로덕션 권장사항

1. **환경 변수 보안**
   - `.env` 파일을 `.gitignore`에 추가
   - 프로덕션 서버에서만 접근 가능하도록 설정

2. **로그 관리**
   - 로그 파일 크기 제한 설정
   - 정기적인 로그 정리

3. **자동 재시작**
   - `autorestart: true` (이미 설정됨)
   - `max_memory_restart` 설정으로 메모리 누수 방지

4. **백업**
   - 정기적인 데이터베이스 백업
   - 코드 및 설정 파일 백업

## 📝 ecosystem.config.js 커스터마이징

필요에 따라 `ecosystem.config.js`를 수정할 수 있습니다:

- `instances`: 인스턴스 개수 (클러스터 모드)
- `exec_mode`: 'fork' 또는 'cluster'
- `watch`: 파일 변경 감지 및 자동 재시작
- `max_memory_restart`: 메모리 제한
- `min_uptime`: 최소 실행 시간
- `max_restarts`: 최대 재시작 횟수

자세한 내용은 [PM2 공식 문서](https://pm2.keymetrics.io/docs/usage/application-declaration/)를 참조하세요.


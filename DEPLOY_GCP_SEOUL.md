# 2026 LOL Card Game — Google Cloud 서울 서버 설치

이 문서는 **신규 프로젝트** 기준입니다. 아래 초기화 스크립트는 사용자 계정,
기존 카드, 비밀번호, 덱, 업적과 경기 전적이 들어 있는 `lol_card_game`
데이터베이스를 **영구 삭제**합니다. 별도 백업 과정은 포함하지 않습니다.

현재 업로드된 `rift-rebuild.zip`의 핵심 엔진 `engine.py`, `data.py`,
`draft.py`, `terrain.py` 및 `assets/map.png`는
GitHub 저장소에 자동 업로드되지 않습니다. 별도로 서버에 전송해야 합니다.
웹 연동 브리지 `backend/rift-engine/bridge.py`는 GitHub에 포함되어 있습니다.

## 1. 로컬 컴퓨터 (Google Cloud CLI 설치 및 로그인)

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable compute.googleapis.com
gcloud compute instances create lol26-seoul \
  --zone=asia-northeast3-a \
  --machine-type=e2-standard-4 \
  --image-project=ubuntu-os-cloud \
  --image-family=ubuntu-2404-lts-amd64 \
  --boot-disk-type=pd-balanced --boot-disk-size=50GB \
  --tags=lol26-web
gcloud compute firewall-rules create lol26-allow-web \
  --network=default --allow=tcp:80,tcp:443 \
  --direction=INGRESS --target-tags=lol26-web
gcloud compute ssh lol26-seoul --zone=asia-northeast3-a
```

이미 같은 방화벽 규칙이 있으면 생성 단계는 건너뜁니다. `e2-standard-4`는
4 vCPU / 16 GiB로 약 60명 웹 접속의 시작 사양입니다. 한 번에 60개
경기를 계산한다는 뜻이 아닙니다. 실제 동시 경기 처리량은 부하 테스트로
확인해야 합니다.

## 2. VM 안에서 프로그램 설치

```bash
sudo apt-get update
sudo apt-get install -y git curl ca-certificates nginx mariadb-server \
  python3 python3-venv unzip build-essential
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
git clone https://github.com/suni211/lol-card-game.git
cd lol-card-game
```

## 3. 업로드 받은 Python 매치 엔진 설치

VM에서 잠시 나오거나 **다른 로컬 터미널**을 열고 ZIP을 복사합니다.

```bash
gcloud compute scp "/LOCAL/PATH/rift-rebuild.zip" \
  lol26-seoul:~/rift-rebuild.zip --zone=asia-northeast3-a
```

그 후 **VM에서**:

```bash
cd ~/lol-card-game
mkdir -p backend/rift-engine
unzip -q -o ~/rift-rebuild.zip \
  'engine.py' 'draft.py' 'data.py' 'terrain.py' \
  'assets/map.png' 'assets/champions/*' \
  -d backend/rift-engine
python3 -m venv backend/rift-engine/.venv
backend/rift-engine/.venv/bin/pip install --upgrade pip pillow
cd backend/rift-engine
.venv/bin/python -m unittest -v test_bridge.py
cd ../..
```

정확한 파일 이름과 상위 ZIP 폴더 구조가 다르면 경로를 맞춰야 합니다.

## 4. 새 게임 DB 전체 초기화 (기존 모든 계정 삭제)

```bash
cd ~/lol-card-game
bash scripts/reset-all-2026.sh --destroy-everything
```

이 작업은 `DROP DATABASE IF EXISTS lol_card_game`을 실행한 후
`schema.sql`, 2026 선수 데이터, RIFT 경기 테이블을 재생성하고
예전 카드 시리즈를 제거합니다. 처음 1회만 실행합니다.
**업데이트할 때 다시 실행하면 안 됩니다.**

## 5. 웹 서버 DB 사용자와 환경 변수

```bash
cd ~/lol-card-game
DB_PASSWORD="$(openssl rand -hex 24)"
JWT_SECRET="$(openssl rand -hex 32)"

sudo mariadb -e "CREATE USER IF NOT EXISTS 'lol26'@'localhost' IDENTIFIED BY '$DB_PASSWORD'; GRANT ALL PRIVILEGES ON lol_card_game.* TO 'lol26'@'localhost'; FLUSH PRIVILEGES;"

cat > backend/.env <<EOF
NODE_ENV=production
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=lol_card_game
DB_USER=lol26
DB_PASSWORD=$DB_PASSWORD
JWT_SECRET=$JWT_SECRET
JWT_EXPIRE=7d
CORS_ORIGIN=http://YOUR_VM_EXTERNAL_IP
RIFT_ENGINE_DIR=$HOME/lol-card-game/backend/rift-engine
RIFT_PYTHON=$HOME/lol-card-game/backend/rift-engine/.venv/bin/python
RIFT_MAX_WORKERS=1
EOF
chmod 600 backend/.env
```

`YOUR_VM_EXTERNAL_IP`를 VM의 실제 외부 IP로 바꿔 넣습니다. 도메인과
HTTPS를 설정한 뒤에는 `CORS_ORIGIN`을 `https://도메인`으로 바꿉니다.

새로운 관리자 계정은 **필수 환경 변수로만** 생성합니다. 비밀번호를
저장소나 명령어 이력에 남기지 않도록 프롬프트로 입력합니다.

```bash
cd ~/lol-card-game/backend
npm ci
npm run build
read -rp "Admin username: " ADMIN_USERNAME
read -rp "Admin email: " ADMIN_EMAIL
read -rsp "Admin password (12+ chars): " ADMIN_PASSWORD; echo
export ADMIN_USERNAME ADMIN_EMAIL ADMIN_PASSWORD
node scripts/create-admin.js
unset ADMIN_PASSWORD
```

## 6. 프론트엔드 빌드 및 PM2 실행

```bash
cd ~/lol-card-game/frontend
npm ci
VITE_API_URL=/api npm run build
sudo mkdir -p /var/www/lol26
sudo cp -a dist/. /var/www/lol26/
sudo chown -R www-data:www-data /var/www/lol26

cd ~/lol-card-game/backend
pm2 start dist/server.js --name lol26-api --cwd "$PWD"
pm2 save
pm2 startup
```

`pm2 startup`이 출력하는 `sudo ...` 명령을 추가로 실행합니다.

## 7. Nginx 웹·API·이미지·소켓 설정

```bash
sudo tee /etc/nginx/sites-available/lol26 >/dev/null <<'NGINX'
server {
    listen 80;
    server_name _;
    root /var/www/lol26;
    index index.html;
    client_max_body_size 4m;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
    location /player-images/ {
        proxy_pass http://127.0.0.1:5000;
    }
    location /rift-champions/ {
        proxy_pass http://127.0.0.1:5000;
    }
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/lol26 /etc/nginx/sites-enabled/lol26
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
curl -sS http://127.0.0.1:5000/health
pm2 logs lol26-api --lines 30
```

웹 접속은 `http://YOUR_VM_EXTERNAL_IP`로 확인합니다.
도메인을 연결했다면 HTTPS 인증서도 발급하세요.

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_DOMAIN
```

## 8. 후속 코드 업데이트 — DB 초기화 금지

```bash
cd ~/lol-card-game
git pull origin main
cd backend && npm ci && npm run build && pm2 restart lol26-api --update-env
cd ../frontend && npm ci && VITE_API_URL=/api npm run build
sudo cp -a dist/. /var/www/lol26/
```

**주의:** Python 원본은 서버에 따로 전송되어야 하고, 실제 라이브
서비스를 열기 전에 DB 스키마 적용·TypeScript 빌드·밴픽·AI/PvP 대전
검증과 부하 테스트를 완료해야 합니다. 구시즌 전투 API는 더 이상
게임 진입에 사용하지 않습니다.

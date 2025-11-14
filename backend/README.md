# LOL Card Game Backend

Node.js + Express + MariaDB 백엔드 서버

## 설치 방법

### 1. 의존성 설치
```bash
npm install
```

### 2. 데이터베이스 설정

#### MariaDB 설치 후 실행
```bash
# Windows에서 MariaDB 서비스 시작
net start MySQL

# 또는 XAMPP/WAMP 사용 시 MySQL 시작
```

#### 데이터베이스 및 테이블 생성
```bash
# MySQL 접속
mysql -u root -p

# 스키마 생성 (MySQL 내에서)
source database/schema.sql;

# 선수 데이터 삽입
source database/seed_players.sql;

# 미션 데이터 삽입
source database/seed_missions.sql;

# 또는 한 번에:
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed_players.sql
mysql -u root -p < database/seed_missions.sql
```

### 3. 환경 변수 설정

`.env` 파일에서 데이터베이스 비밀번호 등을 설정하세요:

```env
DB_PASSWORD=your_mysql_password_here
```

### 4. 서버 실행

#### 개발 모드
```bash
npm run dev
```

#### 프로덕션 빌드
```bash
npm run build
npm start
```

## API 엔드포인트

### 인증 (`/api/auth`)
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `GET /api/auth/me` - 내 정보 (인증 필요)

### 가챠 (`/api/gacha`)
- `POST /api/gacha/draw` - 카드 뽑기 (인증 필요)
  - Body: `{ type: 'free' | 'basic' | 'premium' | 'ultra' }`
- `GET /api/gacha/my-cards` - 내 카드 목록 (인증 필요)
- `DELETE /api/gacha/dismantle/:cardId` - 카드 분해 (인증 필요)

### 덱 (`/api/deck`)
- `GET /api/deck` - 내 덱 조회 (인증 필요)
- `PUT /api/deck` - 덱 저장 (인증 필요)
  - Body: `{ name, topCardId, jungleCardId, midCardId, adcCardId, supportCardId }`

### 경기 (`/api/match`)
- `POST /api/match/find` - 매칭 및 자동 대전 (인증 필요)
- `GET /api/match/history` - 전적 조회 (인증 필요)

### 랭킹 (`/api/ranking`)
- `GET /api/ranking` - 리더보드 조회
  - Query: `?limit=100&region=ALL`

### 미션 (`/api/missions`)
- `GET /api/missions` - 미션 목록 (인증 필요)
- `POST /api/missions/:missionId/claim` - 보상 받기 (인증 필요)

### 트레이드 (`/api/trade`)
- `POST /api/trade/send` - 트레이드 요청 (인증 필요)
- `GET /api/trade/received` - 받은 트레이드 목록 (인증 필요)
- `POST /api/trade/:tradeId/accept` - 트레이드 수락 (인증 필요)
- `POST /api/trade/:tradeId/reject` - 트레이드 거절 (인증 필요)

### 공지사항 (`/api/notices`)
- `GET /api/notices` - 공지사항 목록
- `GET /api/notices/:id` - 공지사항 상세
- `POST /api/notices` - 공지사항 작성 (관리자 전용)
- `PUT /api/notices/:id` - 공지사항 수정 (관리자 전용)
- `DELETE /api/notices/:id` - 공지사항 삭제 (관리자 전용)

### 프로필 (`/api/profile`)
- `GET /api/profile` - 내 프로필 조회 (인증 필요)
- `POST /api/profile/checkin` - 출석 체크 (인증 필요)

## 인증

Bearer 토큰 방식 사용:

```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN'
}
```

## 응답 형식

### 성공
```json
{
  "success": true,
  "data": { ... }
}
```

### 실패
```json
{
  "success": false,
  "error": "Error message"
}
```

## 기술 스택

- **Node.js** - 런타임
- **Express** - 웹 프레임워크
- **TypeScript** - 타입 안정성
- **MariaDB/MySQL** - 데이터베이스
- **mysql2** - MySQL 드라이버
- **JWT** - 인증
- **bcrypt** - 비밀번호 해싱
- **Joi** - 유효성 검증

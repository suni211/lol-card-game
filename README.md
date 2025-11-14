# LOL Card Game

League of Legends 프로 선수 카드 수집 및 대전 게임 웹 애플리케이션

## 프로젝트 개요

2025 시즌 전세계 LOL 프로 선수들의 카드를 수집하고, 5인 로스터를 구성하여 다른 플레이어와 대전하는 전략 카드 게임입니다.

## 주요 기능

### 1. 카드 시스템
- **카드 뽑기**: 100P, 300P, 500P 3가지 옵션
  - 일일 무료 뽑기 1회 제공
  - 등급별 확률 공개 (일반, 레어, 에픽, 레전드)
  - 중복 카드 획득 시 포인트 50% 환불
- **카드 등급**:
  - 일반: 50-70 OVR
  - 레어: 71-80 OVR
  - 에픽: 81-90 OVR
  - 레전드: 91-100 OVR

### 2. 경기 시스템
- **포지션 시스템**: 5포지션 (탑, 정글, 미드, 원딜, 서포터)
- **잘못된 포지션 배치 시 -10 OVR 페널티**
- **팀 시너지**:
  - 같은 팀 3명: +5%
  - 같은 팀 4명: +12%
  - 같은 팀 5명: +25%
- **특성 시스템**: 각 선수별 고유 특성
- **승패 보상**:
  - 승리: 100 포인트
  - 패배: 50 포인트

### 3. 랭킹 시스템
8개 티어로 구성:
- 아이언 → 브론즈 → 실버 → 골드 → 플래티넘 → 다이아 → 마스터 → 챌린저
- 티어에 비례한 포인트 획득/차감
- 하위 티어가 상위 티어 이길 시 추가 보너스

### 4. 미션 시스템
- **일일 미션**: 매일 자정 초기화
- **주간 미션**: 매주 월요일 초기화
- 미션 완료 시 포인트 보상

### 5. 트레이드 시스템
- 유저 간 카드 거래
- 트레이드 요청/수락/거절 기능

### 6. 기타 기능
- 일일 출석 체크
- 컬렉션 관리
- 카드 분해 (포인트 환원)
- 공지사항
- 전적 통계 (개인 전적, 최다 사용 카드, 최고 연승)

## 기술 스택

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Routing**: React Router v6
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

### Backend
- **Runtime**: Node.js
- **Framework**: Express
- **Database**: MariaDB
- **ORM**: MySQL2
- **Authentication**: JWT + bcrypt
- **Validation**: Joi
- **Logging**: Winston

### Deployment
- **Platform**: Google Cloud Platform (GCP)
- **Service**: Compute Engine

## 시작하기

### 사전 요구사항
- Node.js 18+
- MariaDB 10.6+
- npm or yarn

### Frontend 설치 및 실행

```bash
cd frontend
npm install
npm run dev
```

개발 서버: http://localhost:5173

### Backend 설치 및 실행

```bash
cd backend
npm install

# .env 파일 생성
cp .env.example .env
# .env 파일에 데이터베이스 정보 입력

npm run dev
```

개발 서버: http://localhost:5000

## 환경 변수 설정

### Backend (.env)
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=lol_card_game

JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

PORT=5000
NODE_ENV=development

CORS_ORIGIN=http://localhost:5173
```

## 프로젝트 구조

```
lol-card-game/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout/
│   │   │       ├── Navbar.tsx
│   │   │       ├── Footer.tsx
│   │   │       └── Layout.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Gacha.tsx
│   │   │   ├── Collection.tsx
│   │   │   ├── Deck.tsx
│   │   │   ├── Match.tsx
│   │   │   ├── Ranking.tsx
│   │   │   ├── Missions.tsx
│   │   │   ├── Trade.tsx
│   │   │   ├── Notices.tsx
│   │   │   └── Profile.tsx
│   │   ├── store/
│   │   │   ├── authStore.ts
│   │   │   └── themeStore.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── tailwind.config.js
│
└── backend/
    ├── src/
    │   ├── routes/
    │   ├── controllers/
    │   ├── models/
    │   ├── middleware/
    │   └── server.ts
    ├── package.json
    └── .env.example
```

## 주요 페이지

1. **홈** (`/`) - 게임 소개 및 주요 기능 안내
2. **카드 뽑기** (`/gacha`) - 카드 획득
3. **내 카드** (`/collection`) - 보유 카드 관리
4. **덱 편성** (`/deck`) - 5인 로스터 구성
5. **경기** (`/match`) - 랭크 대전
6. **랭킹** (`/ranking`) - 글로벌 리더보드
7. **미션** (`/missions`) - 일일/주간 미션
8. **트레이드** (`/trade`) - 카드 교환
9. **공지사항** (`/notices`) - 패치 노트 및 이벤트
10. **프로필** (`/profile`) - 개인 통계 및 전적

## 다크모드

- 전역 테마 설정 지원
- 모든 페이지에서 라이트/다크 모드 전환 가능
- LocalStorage에 설정 저장

## API 엔드포인트 (예정)

### 인증
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `GET /api/auth/me` - 내 정보

### 카드
- `POST /api/gacha/draw` - 카드 뽑기
- `GET /api/cards/my` - 내 카드 목록
- `DELETE /api/cards/:id` - 카드 분해

### 덱
- `GET /api/deck` - 내 덱 조회
- `PUT /api/deck` - 덱 저장

### 경기
- `POST /api/match/find` - 매칭 시작
- `GET /api/match/history` - 전적 조회

### 미션
- `GET /api/missions` - 미션 목록
- `POST /api/missions/:id/claim` - 보상 받기

### 트레이드
- `POST /api/trade/send` - 트레이드 요청
- `POST /api/trade/:id/accept` - 트레이드 수락
- `POST /api/trade/:id/reject` - 트레이드 거절

## 라이선스

MIT License

## 제작자

LOL Card Game Development Team

---

✅ **프론트엔드와 백엔드 모두 완성되었습니다!**

## 데이터베이스 설정

```bash
# MySQL/MariaDB 접속
mysql -u root -p

# 데이터베이스 및 테이블 생성
source backend/database/schema.sql

# 선수 데이터 삽입
source backend/database/seed_players.sql

# 미션 데이터 삽입
source backend/database/seed_missions.sql
```

## 전체 실행 방법

### 1. 프론트엔드 실행
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

### 2. 백엔드 실행
```bash
cd backend
npm install
npm run dev
# http://localhost:5000
```

### 3. 브라우저에서 확인
http://localhost:5173 접속

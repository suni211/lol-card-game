# LOL Card Game

League of Legends 프로 선수 카드 수집 및 대전 게임 웹 애플리케이션

## 프로젝트 개요

2025 시즌 전세계 LOL 프로 선수들의 카드를 수집하고, 5인 로스터를 구성하여 다른 플레이어와 대전하는 전략 카드 게임입니다.

## 주요 기능

### 🎴 카드 시스템
- **카드 뽑기**: 100P, 300P, 500P 3가지 옵션
  - 일일 무료 뽑기 1회 제공
  - 등급별 확률 공개 (일반, 레어, 에픽, 레전드, 아이콘)
  - 중복 카드 획득 시 포인트 50% 환불
  - 가챠 마일리지 시스템
- **카드 등급**:
  - 일반: 50-70 OVR
  - 레어: 71-80 OVR
  - 에픽: 81-90 OVR
  - 레전드: 91-100 OVR
  - 아이콘: 101+ OVR

### ⚔️ 경기 시스템
- **포지션 시스템**: 5포지션 (탑, 정글, 미드, 원딜, 서포터)
- **잘못된 포지션 배치 시 -10 OVR 페널티**
- **팀 시너지**:
  - 같은 팀 3명: +5%
  - 같은 팀 4명: +12%
  - 같은 팀 5명: +25%
- **특성 시스템**: 각 선수별 고유 특성
- **전략 시스템**:
  - 라이닝 전략 (8가지)
  - 팀파이트 전략 (8가지)
  - 거시 전략 (8가지)
- **승패 보상**:
  - 승리: 100 포인트 + 보너스
  - 패배: 50 포인트

### 🏆 랭킹 시스템
8개 티어로 구성:
- 아이언 → 브론즈 → 실버 → 골드 → 플래티넘 → 다이아 → 마스터 → 챌린저
- 티어에 비례한 포인트 획득/차감
- 하위 티어가 상위 티어 이길 시 추가 보너스
- 매치메이킹 큐 시스템

### 🎯 게임 모드
- **랭크 대전**: PvP 레이팅 매치
- **AI 대전**: 3가지 난이도 (Easy, Medium, Hard)
- **VS 모드**: 싱글 플레이어 캠페인 (30+ 스테이지)
- **무한 도전**: 끝없는 연승 도전
- **친선전**: 친구와 연습 매치
- **클랜전**: 길드 간 주간 대결

### 📋 미션 & 업적
- **일일 미션**: 매일 자정 초기화
- **주간 미션**: 매주 월요일 초기화
- **이벤트 미션**: 특별 이벤트 퀘스트
- **업적 시스템**: 80개 업적 (EASY 50개, HARD 30개)
- 미션 완료 시 포인트 보상

### 🏛️ 길드 시스템
- 길드 생성 및 가입
- 길드 레벨 및 경험치
- 주간 길드 미션 (30개 풀에서 5개 선택)
- 해피아워 이벤트
- 클랜전 시즌
- 길드 기여도 랭킹

### 💰 경제 시스템
- **마켓**: 선수 카드 시장 거래
- **트레이드**: 유저 간 카드 교환
- **가격 변동**: 실시간 시장 가격 시스템
- **쿠폰 시스템**: 프로모션 코드
- **레벨 보상**: 1~30레벨 보상

### 👔 코치 시스템
- 1~5성 코치 수집
- 코치 강화 (최대 10레벨)
- 버프 효과 (라이닝, 팀파이트, 비전 등)
- 코치 활성화 시스템

### 📚 컬렉션 시스템
- 도감 진행도 추적
- 컬렉션 마일스톤 보상
- 카드 수집률 표시
- 최초 획득 기록

### 🎉 이벤트 시스템
- 시즌 이벤트
- 특별 보상 카드
- 이벤트 마일스톤
- 이벤트 퀘스트

### 🤝 커뮤니티
- 공지사항
- 건의사항 (버그, 기능, 밸런스, UI)
- 확성기 시스템 (전체 메시지)
- 추천인 시스템

### 👤 기타 기능
- 일일 출석 체크
- 카드 잠금 기능
- 카드 분해 (포인트 환원)
- 전적 통계 (개인 전적, 최다 사용 카드, 최고 연승)
- 멀티 덱 시스템 (5개 슬롯)
- 레벨 & 경험치 시스템

## 기술 스택

### Frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Routing**: React Router v7
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Real-time**: Socket.io Client

### Backend
- **Runtime**: Node.js + TypeScript
- **Framework**: Express
- **Database**: MariaDB / MySQL
- **Real-time**: Socket.io
- **Authentication**: JWT + bcrypt
- **Validation**: Joi
- **Logging**: Winston
- **Security**: Helmet + CORS
- **Rate Limiting**: express-rate-limit

## 프로젝트 구조

```
lol-card-game/
├── frontend/                # 프론트엔드 (React + Vite)
│   ├── src/
│   │   ├── components/      # 재사용 가능한 컴포넌트
│   │   ├── pages/           # 페이지 컴포넌트
│   │   ├── store/           # Zustand 상태 관리
│   │   ├── types/           # TypeScript 타입 정의
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                 # 백엔드 (Node.js + Express)
│   ├── src/
│   │   ├── routes/          # API 라우트
│   │   ├── middleware/      # 미들웨어 (인증 등)
│   │   ├── config/          # 설정 파일
│   │   ├── socket/          # 소켓 이벤트 핸들러
│   │   ├── scheduler/       # 스케줄러 (일일/주간 초기화)
│   │   ├── utils/           # 유틸리티 함수
│   │   ├── game/            # 게임 로직 엔진
│   │   └── server.ts        # 서버 엔트리 포인트
│   ├── package.json
│   └── tsconfig.json
│
├── database/                # 데이터베이스
│   ├── schema.sql           # 통합 데이터베이스 스키마
│   └── seeds/               # 시드 데이터
│       ├── seed_players.sql # 선수 데이터
│       └── seed_missions.sql# 미션 데이터
│
└── README.md
```

## 시작하기

### 사전 요구사항
- Node.js 18+
- MariaDB 10.6+ 또는 MySQL 8.0+
- npm or yarn

### 1. 데이터베이스 설정

```bash
# MySQL/MariaDB 접속
mysql -u root -p

# 데이터베이스 및 테이블 생성
source database/schema.sql

# 선수 데이터 삽입
source database/seeds/seed_players.sql

# 미션 데이터 삽입
source database/seeds/seed_missions.sql
```

### 2. 백엔드 설정 및 실행

```bash
cd backend
npm install

# .env 파일 생성
cp .env.example .env
# .env 파일에 데이터베이스 정보 입력

# 개발 모드 실행
npm run dev
```

**백엔드 서버**: http://localhost:5000

### 3. 프론트엔드 설정 및 실행

```bash
cd frontend
npm install

# 개발 모드 실행
npm run dev
```

**프론트엔드 서버**: http://localhost:5173

## 환경 변수 설정

### Backend (.env)
```env
# 데이터베이스
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=lol_card_game

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# 서버
PORT=5000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:5173
```

## 데이터베이스 스키마

통합된 `database/schema.sql` 파일에는 다음 테이블들이 포함되어 있습니다:

### 사용자 관리 (3개)
- users
- user_stats
- user_ladder_stats

### 플레이어 (4개)
- players
- player_stats
- player_teams
- player_traits

### 카드 시스템 (6개)
- user_cards
- gacha_history
- gacha_mileage
- gacha_mileage_claims
- user_packs

### 덱 & 매치 (6개)
- decks
- matchmaking_queue
- matches
- match_history
- match_bonuses

### 게임 모드 (7개)
- vs_stages
- vs_stage_enemies
- user_vs_progress
- infinite_challenge_progress
- infinite_challenge_matches
- infinite_challenge_leaderboard

### 미션 & 업적 (4개)
- missions
- user_missions
- achievements
- user_achievements

### 경제 (5개)
- trades
- player_market_prices
- market_transactions
- price_history

### 컬렉션 (4개)
- user_collection_progress
- user_collected_cards
- collection_milestones
- user_collection_milestones

### 레벨 & 코치 (4개)
- level_rewards
- user_level_rewards
- coaches
- user_coaches

### 길드 & 클랜전 (9개)
- guilds
- guild_members
- guild_mission_pool
- guild_weekly_missions
- happy_hour_participants
- clan_war_seasons
- clan_war_matches
- clan_war_guild_stats
- clan_war_contributions

### 이벤트 (5개)
- event_quests
- event_milestones
- user_event_progress
- user_event_rewards
- event_reward_cards

### 쿠폰 & 추천인 (4개)
- coupons
- coupon_redemptions
- referrals
- referral_bonuses

### 커뮤니티 (4개)
- notices
- suggestions
- user_megaphones
- global_messages

### 관리자 (1개)
- admin_logs

**총 70+ 테이블**

## 주요 API 엔드포인트

### 인증
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `GET /api/auth/me` - 내 정보

### 카드
- `POST /api/gacha/draw` - 카드 뽑기
- `GET /api/gacha/my` - 내 카드 목록
- `DELETE /api/gacha/:id` - 카드 분해
- `GET /api/collection` - 도감 조회

### 덱
- `GET /api/deck` - 내 덱 조회
- `POST /api/deck` - 덱 생성
- `PUT /api/deck/:id` - 덱 수정
- `GET /api/deck/list` - 덱 목록 (멀티 덱)

### 경기
- `POST /api/match/queue/join` - 매칭 시작
- `POST /api/match/queue/leave` - 매칭 취소
- `GET /api/match/history` - 전적 조회
- `POST /api/vs/start` - VS 모드 시작
- `POST /api/infinite/start` - 무한 도전 시작

### 미션
- `GET /api/missions` - 미션 목록
- `POST /api/missions/:id/claim` - 보상 받기

### 트레이드
- `POST /api/trade/send` - 트레이드 요청
- `POST /api/trade/:id/accept` - 트레이드 수락
- `POST /api/trade/:id/reject` - 트레이드 거절

### 길드
- `POST /api/guild/create` - 길드 생성
- `POST /api/guild/:id/join` - 길드 가입
- `GET /api/guild/:id` - 길드 정보
- `GET /api/guild/missions` - 길드 미션

### 기타
- `GET /api/ranking` - 랭킹 조회
- `GET /api/profile/:id` - 프로필 조회
- `POST /api/coupon/redeem` - 쿠폰 사용
- `GET /api/achievements` - 업적 조회
- `POST /api/suggestions` - 건의하기

## 실시간 기능 (Socket.io)

- 매칭 시스템
- 실시간 경기
- 전체 메시지 (확성기)
- 길드 채팅
- 공지사항 알림

## 라이선스

MIT License

## 제작자

LOL Card Game Development Team

---

**✅ 데이터베이스 스키마 통합 완료!**
- 108개의 마이그레이션 파일을 하나의 `database/schema.sql`로 통합
- 중복 제거 및 최적화 완료
- 총 70+ 테이블, 3500+ 라인

**🎮 풀스택 카드 게임 완성!**

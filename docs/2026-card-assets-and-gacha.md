# 2026 카드 이미지 직접 추가하기

이 저장소에는 실존 선수 사진/팀 로고를 임의로 생성하거나 재배포하지 않습니다.
본인이 사용 허가를 받은 이미지를 아래 경로에 직접 복사하면 게임이 자동으로 표시합니다.

## 1. 시즌 로고 (직사각형, 문자만)
다음 SVG 세 파일은 이미 포함되어 있습니다.

| 카드 DB season | 화면 표기 | 색상 | 파일 |
|---|---|---|---|
| `26 LIVE` | **26** | 어두운 파란색 | `frontend/public/series/26-live.svg` |
| `26WR` | **26WR** | 월즈 블루 | `frontend/public/series/26-wr.svg` |
| `26WRs` | **26WRs** | 금색 바탕 + 블루 글씨 | `frontend/public/series/26-wrs.svg` |

자체 SVG로 로고를 교체하려면 파일명은 그대로 유지하세요.

## 2. 팀 로고
`frontend/public/teams/`에 **투명 배경 PNG** 파일을 넣으세요.

정확한 파일명 (2026 월즈 19개 팀):
```text
GEN.G.png
HLE.png
T1.png
DK.png
AL.png
BLG.png
TES.png
IG.png
G2.png
MKOI.png
KC.png
TLAW.png
LYON.png
C9.png
TSW.png
CFO.png
MVK.png
LOS.png
FUR.png
```

예: `frontend/public/teams/T1.png`, `frontend/public/teams/GEN.G.png`.
서버는 팀 이름을 그대로 파일명으로 사용하므로 대소문자/마침표를 바꾸면 표시되지 않습니다.

팀 로고 파일이 없으면 카드에 팀명이 글자로 남으며, 깨진 이미지 아이콘을 숨깁니다.
직접 팀 로고를 추가하면 1장/10장 뽑기 컷신, 카드 컬렉션, 덱에 표시됩니다.

## 3. 선수 사진 (무배경 PNG)
`frontend/public/players/`에 PNG 이미지를 넣으세요.

세 종류의 선수 사진 파일명 규칙:

- **26**: `26_선수이름.png` (예: `26_Faker.png`)
- **26WR**: `26WR_선수이름.png` (예: `26WR_Faker.png`)
- **26WRs**: `26WRs_선수이름.png` (예: `26WRs_Faker.png`)

파일명은 DB의 `players.name`과 완전히 같아야 합니다. 예:
`26_Hans Sama.png`처럼 이름 안에 공백이 있는 선수는 공백을 그대로 포함합니다.

대신 운영자 페이지 `/admin`의 **2026 시즌·월즈 LIVE 운영** 메뉴에서
개별 선수 카드에 2MB 이하 투명 PNG/WebP 사진을 업로드할 수도 있습니다.
이때는 업로드한 경로(`/player-images/2026-ID.png` 등)가 로컬 파일보다 우선됩니다.

권장: 투명 배경 PNG, 세로 길이 512~1024px, 선수 얼굴과 상반신이 잘리거나 배경이 남지 않도록 작업합니다.

## 4. 국적 표시
국적은 **선수가 속한 리그(LCK/LPL)가 아닌 선수 본인의 국적**입니다.

최초 DB 적용 시 다음을 한 번 실행하세요 (이미 2026 로스터 마이그레이션을 실행한 DB):

```bash
mysql -u root -p lol_card_game < database/migrations/2026_player_nationalities.sql
```

일부 잘 알려진 선수는 초기 국적 코드가 들어갑니다. 확인되지 않은 선수는 **국적 미등록**으로
표시됩니다. `/admin`에서 선수를 선택하고 `KR`, `CN`, `US` 등 ISO 국가 코드 두 글자를
입력한 뒤 **국적 저장**을 누르세요. 동일한 선수/팀의 26·26WR·26WRs 카드에 모두 적용됩니다.

## 5. 1장 / 10장 뽑기
- 1장: `국적 → 포지션 → 소속팀 → 시즌 → 선수 카드` (한 명의 컷신)
- 10장: 서버에서 10장 모두 지급/기록 → OVR 최고 선수 **한 명만** 위 컷신
  (OVR 동률인 경우 26WRs > 26WR > 26 우선)
- 암전 무대 효과: OVR 70~79 **은빛**, OVR 80~90 **금빛**,
  OVR **91 이상 무지개**. OVR 70 미만 기본 조명.
- 컷신을 건너뛸 수 있고, 나머지 9장 결과는 컬렉션/인벤토리에서 볼 수 있습니다.

## 6. 로컬에서 확인
```bash
git clone https://github.com/suni211/lol-card-game.git
cd lol-card-game

# DB 설치/설정과 기존 마이그레이션을 먼저 마치고:
mysql -u root -p lol_card_game < database/migrations/2026_player_nationalities.sql

cd backend
npm install
npm run dev
```

새 터미널에서:
```bash
cd lol-card-game/frontend
npm install
npm run dev
```

웹: `http://localhost:5173`. 백엔드는 기본 `http://localhost:5000`.
DB 실행 및 백엔드 `.env` 구성은 기존 README를 따르세요.
팀 로고를 복사한 뒤 `http://localhost:5173/teams/T1.png`에서 먼저 파일 확인이 가능합니다.

**중요:** SQL을 GitHub에 커밋했다고 기존 MySQL 서버의 DB가 자동으로 수정되는 것은 아닙니다.

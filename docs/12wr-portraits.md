# 12WR 선수 얼굴 사진 60명 일괄 등록

기존 12WR 선수 등록 마이그레이션(`database/migrations/2026_12wr_worlds_roster.sql`)에 있는 **정확히 60명**의 닉네임과 팀을 자동 읽습니다. 잘못된 선수 사진이 배정되지 않도록 Leaguepedia 원본 이미지의 **파일명에 선수 닉네임이 포함된 경우**만 자동 후보로 채택합니다. 자동 검색에 없는 선수는 `frontend/12wr-portrait-sources.json`에 이름과 승인된 HTTPS 원본 이미지 URL을 추가하세요.

## 명령어
```bash
cd /home/hisam/lol-card-game
python3 backend/scripts/import-12wr-portraits.py --apply
```

출력:
- `frontend/public/players/12WR_<nickname>.png|.jpg|.webp` (실제 내려받은 포맷에 따라 확장자 지정)
- `player-photo-report-12wr.json`: 60명 각각 성공/실패/후보 URL/로컬 파일명
- `database/12wr_portraits_update.generated.sql`: **다운로드 성공 선수만** `players.image_url`을 바꾸는 SQL.

승인된 사진 파일인지 보고서를 검토한 뒤:
```bash
sudo mariadb-dump lol_card_game > ~/lol-card-game-backup-before-photos.sql
sudo mariadb lol_card_game < database/12wr_portraits_update.generated.sql
cd frontend
VITE_API_URL=/api npm run build
sudo cp -a dist/. /var/www/lcg/
sudo nginx -t && sudo systemctl reload nginx
```

선수별 얼굴 매핑은 DB `image_url`을 사용하므로 이적시장·덱·뽑기·도감 등이 같은 이미지 경로를 사용합니다. 이미지를 못 찾은 선수는 **다른 인물로 대체하지 않고** 기본 실루엣이 유지됩니다.

### 수동 원본 URL 추가
`frontend/12wr-portrait-sources.json` 예:
```json
{
  "Toyz": "https://example.org/legally-licensed-Toyz-photo.jpg",
  "Bebe": "https://example.org/legally-licensed-Bebe-photo.png"
}
```
`example.org`는 형식 예시로 **실제 링크가 아닙니다**. 실제 사용 허가를 받은 선수 얼굴 사진의 직접 이미지 URL로 교체하세요.

자동 검색을 쓰지 않고 지정된 URL만 설치하려면 `--no-discovery --apply`를 사용합니다.

**주의:** 스크립트가 60명의 사진을 반드시 찾는다고 보장할 수는 없습니다. 실제 내려받은 수는 결과 보고서의 `downloaded`, 미등록 선수 수는 `missing`을 확인하세요. 이미지 재배포 권리도 확인해야 합니다.

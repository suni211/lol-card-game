# GitHub 업로드 가이드

## 1. GitHub에서 Repository 생성

1. https://github.com 접속 및 로그인
2. 우측 상단 `+` 버튼 클릭 → `New repository`
3. Repository 설정:
   ```
   Repository name: lol-card-game
   Description: League of Legends 프로 선수 카드 수집 및 대전 게임
   Public or Private: 선택
   ❌ Add a README file (체크 해제)
   ❌ Add .gitignore (이미 있음)
   ❌ Choose a license (체크 해제)
   ```
4. `Create repository` 클릭

## 2. 로컬 프로젝트를 GitHub에 연결

아래 명령어를 **순서대로** 실행하세요:

```bash
# 프로젝트 폴더로 이동
cd "C:\Users\hisam\OneDrive\바탕 화면\lol-card-game"

# GitHub repository 연결 (YOUR_USERNAME을 본인의 GitHub 아이디로 변경)
git remote add origin https://github.com/YOUR_USERNAME/lol-card-game.git

# 메인 브랜치로 변경
git branch -M main

# GitHub에 푸시
git push -u origin main
```

## 3. GitHub Personal Access Token 생성 (비밀번호 대신 사용)

Push 시 비밀번호를 요구하면:

1. GitHub → Settings (우측 상단 프로필 클릭)
2. Developer settings (맨 아래)
3. Personal access tokens → Tokens (classic)
4. Generate new token (classic)
5. 설정:
   ```
   Note: lol-card-game
   Expiration: 90 days (또는 원하는 기간)
   Scopes:
   ✅ repo (모든 하위 항목 체크)
   ```
6. Generate token
7. **토큰 복사** (한 번만 표시됨!)
8. Git push 시 비밀번호 대신 이 토큰을 입력

## 4. Git 사용자 정보 설정 (처음 한 번만)

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## 5. 업로드 확인

1. GitHub repository 페이지 새로고침
2. 모든 파일이 업로드되었는지 확인

## 6. 이후 변경사항 업로드

파일을 수정한 후:

```bash
cd "C:\Users\hisam\OneDrive\바탕 화면\lol-card-game"

# 변경사항 확인
git status

# 모든 변경사항 추가
git add .

# 커밋 (메시지는 변경 내용에 맞게 수정)
git commit -m "변경 내용 설명"

# GitHub에 푸시
git push
```

## 7. GCP에서 프로젝트 Clone

GCP VM에서:

```bash
# SSH로 VM 접속 후

# Git 설치
sudo apt install -y git

# 프로젝트 클론
cd ~
git clone https://github.com/YOUR_USERNAME/lol-card-game.git

# 프로젝트 폴더로 이동
cd lol-card-game

# 이후 DEPLOYMENT.md 가이드 따라 진행
```

## 8. 자주 사용하는 Git 명령어

```bash
# 현재 상태 확인
git status

# 변경사항 확인
git diff

# 커밋 히스토리 보기
git log

# 최근 변경사항 가져오기 (GCP에서)
git pull

# 브랜치 확인
git branch

# 새 브랜치 생성 및 이동
git checkout -b feature-name

# 브랜치 병합
git merge feature-name
```

## 9. 주의사항

✅ **절대 업로드하지 말아야 할 것:**
- `.env` 파일 (이미 .gitignore에 포함됨)
- `node_modules/` 폴더 (이미 .gitignore에 포함됨)
- 데이터베이스 비밀번호
- API 키, 토큰 등 민감한 정보

✅ **이미 .gitignore에 포함된 항목:**
```
node_modules/
.env
dist/
build/
*.log
```

## 10. GitHub Repository 추천 설정

Repository 생성 후:

1. **README.md 확인**
   - 이미 완성된 README.md가 있습니다

2. **Topics 추가** (repository 페이지 → About → Settings)
   ```
   react, typescript, nodejs, express, mariadb,
   lol, card-game, tailwindcss, gcp
   ```

3. **Description 추가**
   ```
   League of Legends 프로 선수 카드 수집 및 대전 게임 -
   React + Node.js + MariaDB 풀스택 프로젝트
   ```

## 완료! 🎉

이제 프로젝트가 GitHub에 업로드되었습니다!

- **Repository URL**: https://github.com/YOUR_USERNAME/lol-card-game
- **Clone 명령어**: `git clone https://github.com/YOUR_USERNAME/lol-card-game.git`

---

## 문제 해결

### 문제: "Permission denied (publickey)"
해결: HTTPS URL 사용
```bash
git remote set-url origin https://github.com/YOUR_USERNAME/lol-card-game.git
```

### 문제: "failed to push some refs"
해결: Pull 먼저 실행
```bash
git pull origin main --rebase
git push
```

### 문제: 파일이 너무 큼 (100MB 이상)
해결: Git LFS 사용 또는 .gitignore에 추가
```bash
git lfs install
git lfs track "*.large-file"
```

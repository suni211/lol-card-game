@echo off
REM PM2로 프론트엔드와 백엔드 시작 스크립트 (Windows)

echo.
echo ====================================
echo   LOL Card Game PM2 시작 스크립트
echo ====================================
echo.

REM 로그 디렉토리 생성
if not exist logs mkdir logs

REM 백엔드 빌드
echo.
echo [백엔드] 빌드 중...
cd backend
if not exist dist (
    echo   TypeScript 컴파일 중...
    call npm run build
) else (
    echo   dist 폴더가 이미 존재합니다. 빌드를 건너뜁니다.
)
cd ..

REM 프론트엔드 빌드
echo.
echo [프론트엔드] 빌드 중...
cd frontend
if not exist dist (
    echo   Vite 빌드 중...
    call npm run build
) else (
    echo   dist 폴더가 이미 존재합니다. 빌드를 건너뜁니다.
)
cd ..

REM serve 패키지 확인
echo.
echo [serve] 패키지 확인 중...
where serve >nul 2>&1
if %errorlevel% neq 0 (
    echo   serve 패키지가 없습니다. 전역 설치 중...
    call npm install -g serve
) else (
    echo   serve 패키지가 이미 설치되어 있습니다.
)

REM PM2 프로세스 중지 (이미 실행 중인 경우)
echo.
echo [PM2] 기존 프로세스 중지 중...
pm2 delete all 2>nul

REM PM2로 앱 시작
echo.
echo [PM2] 앱 시작 중...
pm2 start ecosystem.config.js

REM PM2 저장
echo.
echo [PM2] 설정 저장 중...
pm2 save

REM 상태 확인
echo.
echo ====================================
echo   시작 완료!
echo ====================================
echo.
echo [현재 실행 중인 프로세스]
pm2 list

echo.
echo [유용한 명령어]
echo   - 로그 확인: pm2 logs
echo   - 백엔드 로그: pm2 logs lol-backend
echo   - 프론트엔드 로그: pm2 logs lol-frontend
echo   - 상태 확인: pm2 status
echo   - 재시작: pm2 restart all
echo   - 중지: pm2 stop all
echo   - 삭제: pm2 delete all
echo.
pause


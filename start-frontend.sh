#!/bin/bash
# 프론트엔드 시작 스크립트
cd "$(dirname "$0")/frontend"
exec npx serve -s dist -l 3000


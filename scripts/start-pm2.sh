#!/bin/bash

# PM2로 서버 시작 스크립트

# 색상 코드
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== The Host Server PM2 시작 스크립트 ===${NC}"

# Node.js 버전 확인
echo -e "${YELLOW}Node.js 버전 확인...${NC}"
node --version

# PM2 설치 확인
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}PM2가 설치되어 있지 않습니다. 설치 중...${NC}"
    npm install -g pm2
fi

# 빌드 확인
if [ ! -d "dist" ]; then
    echo -e "${YELLOW}빌드 디렉토리가 없습니다. 빌드 중...${NC}"
    npm run build
fi

# 로그 디렉토리 생성
mkdir -p logs

# 기존 PM2 프로세스 중지
echo -e "${YELLOW}기존 PM2 프로세스 확인...${NC}"
pm2 stop thehost-server 2>/dev/null || true
pm2 delete thehost-server 2>/dev/null || true

# PM2로 서버 시작
echo -e "${GREEN}PM2 클러스터 모드로 서버 시작 중...${NC}"
pm2 start ecosystem.config.js --env production

# PM2 상태 확인
echo -e "${GREEN}PM2 프로세스 상태:${NC}"
pm2 status

# 로그 스트리밍 옵션
echo -e "${YELLOW}로그를 보려면 다음 명령어를 사용하세요:${NC}"
echo "pm2 logs"
echo "pm2 monit"

# PM2 시작 시 자동 재시작 설정
echo -e "${GREEN}시스템 재시작 시 자동 시작 설정...${NC}"
pm2 save
pm2 startup

echo -e "${GREEN}=== PM2 서버 시작 완료 ===${NC}"
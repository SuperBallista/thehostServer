#!/bin/bash

echo "🚀 PM2 클러스터 분산 락 테스트 시작"

# 기존 프로세스 정리
echo "기존 프로세스 정리 중..."
pm2 delete thehost-server-dev 2>/dev/null || true
pm2 kill 2>/dev/null || true

# Redis 연결 확인 (도커 Redis 포트 3407)
echo "Redis 연결 확인 중..."
# redis-cli가 없으면 도커로 테스트
if command -v redis-cli &> /dev/null; then
    redis-cli -p 3407 ping || {
        echo "❌ Redis가 실행되지 않았습니다. 도커 Redis를 먼저 시작해주세요."
        echo "   docker-compose up -d redis"
        exit 1
    }
else
    # docker를 통한 Redis 연결 테스트
    docker run --rm --network host redis:alpine redis-cli -h localhost -p 3407 ping || {
        echo "❌ Redis가 실행되지 않았습니다. 도커 Redis를 먼저 시작해주세요."
        echo "   docker-compose up -d redis"
        exit 1
    }
fi

# 빌드
echo "애플리케이션 빌드 중..."
npm run build || {
  echo "❌ 빌드 실패"
  exit 1
}

# PM2로 클러스터 시작 (3개 인스턴스)
echo "PM2 클러스터 시작 중 (3개 인스턴스)..."
pm2 start ./dist/main.js --name "thehost-server-dev" -i 3 --env development

# 상태 확인
echo "클러스터 상태 확인:"
pm2 list

echo ""
echo "🔍 분산 락 테스트 방법:"
echo "1. 게임을 시작하고 봇을 추가하세요"
echo "2. 로그를 모니터링하세요:"
echo "   pm2 logs thehost-server-dev --lines 50"
echo "3. 다음과 같은 로그를 확인하세요:"
echo "   🔒 Lock acquired: llm_chat_게임ID_봇ID by process PID"
echo "   🚀 Executing with lock: ..."
echo "   ✅ Completed execution: ..."
echo "   🔓 Lock released: ..."
echo ""
echo "4. 여러 프로세스가 동시에 같은 작업을 시도할 때:"
echo "   🔄 Lock busy, retrying: ... (재시도 메시지)"
echo "   ⚠️ Could not acquire lock for key: ... (락 획득 실패)"
echo ""
echo "5. 테스트 종료 시:"
echo "   pm2 delete thehost-server-dev"
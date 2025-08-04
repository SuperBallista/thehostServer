#!/bin/bash

echo "🐳 도커 서비스 상태 확인"
echo "========================"

# Redis 컨테이너 확인
echo "📊 Redis 컨테이너 상태:"
redis_container=$(docker ps --filter "publish=3407" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}")
if [ -n "$redis_container" ]; then
    echo "$redis_container"
else
    echo "❌ Redis 컨테이너가 실행되지 않았습니다."
    echo ""
    echo "Redis 시작 방법:"
    echo "1. docker-compose가 있다면: docker-compose up -d redis"
    echo "2. 직접 실행: docker run -d --name redis -p 3407:6379 redis:alpine"
fi

echo ""

# MySQL 컨테이너 확인
echo "📊 MySQL 컨테이너 상태:"
mysql_container=$(docker ps --filter "publish=3406" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}")
if [ -n "$mysql_container" ]; then
    echo "$mysql_container"
else
    echo "❌ MySQL 컨테이너가 실행되지 않았습니다."
fi

echo ""

# Redis 연결 테스트
echo "🔗 Redis 연결 테스트:"
if docker run --rm --network host redis:alpine redis-cli -h localhost -p 3407 ping >/dev/null 2>&1; then
    echo "✅ Redis 연결 성공"
    
    # Redis 정보 확인
    echo "📈 Redis 정보:"
    docker run --rm --network host redis:alpine redis-cli -h localhost -p 3407 info server | grep -E "(redis_version|uptime_in_seconds)" | head -2
    
    # 현재 키 개수
    key_count=$(docker run --rm --network host redis:alpine redis-cli -h localhost -p 3407 dbsize)
    echo "🔑 저장된 키 개수: $key_count"
    
    # 분산 락 키 확인
    lock_count=$(docker run --rm --network host redis:alpine redis-cli -h localhost -p 3407 keys "distributed_lock:*" | wc -l)
    echo "🔒 활성 분산 락: $lock_count개"
    
else
    echo "❌ Redis 연결 실패"
fi

echo ""
echo "🚀 테스트 준비 상태:"
if docker run --rm --network host redis:alpine redis-cli -h localhost -p 3407 ping >/dev/null 2>&1; then
    echo "✅ Redis: 준비됨"
    echo "✅ PM2 클러스터 테스트를 시작할 수 있습니다!"
    echo "   ./test-cluster.sh"
else
    echo "❌ Redis: 준비되지 않음"
    echo "   먼저 Redis를 시작해주세요."
fi
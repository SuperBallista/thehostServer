#!/bin/bash

echo "📊 PM2 클러스터 모니터링 도구"
echo "================================"

# 실시간 모니터링 함수들
show_status() {
    echo "🔍 클러스터 상태:"
    pm2 list
    echo ""
}

show_logs() {
    echo "📝 최근 로그 (분산 락 관련):"
    pm2 logs thehost-server-dev --lines 20 | grep -E "(🔒|🔓|🚀|✅|🔄|⚠️|Lock|distributed)" --color=always
    echo ""
}

show_memory() {
    echo "💾 메모리 사용량:"
    pm2 monit --no-daemon | head -10
    echo ""
}

check_redis_locks() {
    echo "🔐 Redis에 활성화된 락들:"
    if command -v redis-cli &> /dev/null; then
        redis-cli -p 3407 keys "distributed_lock:*" | head -10
    else
        echo "   redis-cli를 설치하거나 다음 명령어를 사용하세요:"
        echo "   docker run --rm --network host redis:alpine redis-cli -h localhost -p 3407 keys \"distributed_lock:*\""
    fi
    echo ""
}

# 메뉴 함수
show_menu() {
    echo "선택하세요:"
    echo "1) 클러스터 상태 보기"
    echo "2) 분산 락 로그 보기"
    echo "3) 메모리 사용량 보기"
    echo "4) Redis 락 상태 보기"
    echo "5) 실시간 로그 모니터링"
    echo "6) 전체 상태 리포트"
    echo "7) 클러스터 재시작"
    echo "8) 클러스터 종료"
    echo "9) 종료"
    echo ""
}

# 메인 루프
while true; do
    show_menu
    read -p "번호를 입력하세요: " choice
    
    case $choice in
        1)
            show_status
            ;;
        2)
            show_logs
            ;;
        3)
            show_memory
            ;;
        4)
            check_redis_locks
            ;;
        5)
            echo "실시간 로그 모니터링 (Ctrl+C로 종료):"
            pm2 logs thehost-server-dev --raw
            ;;
        6)
            echo "📊 전체 상태 리포트"
            echo "==================="
            show_status
            show_logs
            show_memory
            check_redis_locks
            ;;
        7)
            echo "🔄 클러스터 재시작 중..."
            pm2 restart thehost-server-dev
            show_status
            ;;
        8)
            echo "🛑 클러스터 종료 중..."
            pm2 delete thehost-server-dev
            echo "클러스터가 종료되었습니다."
            ;;
        9)
            echo "모니터링을 종료합니다."
            exit 0
            ;;
        *)
            echo "잘못된 선택입니다."
            ;;
    esac
    
    echo ""
    read -p "계속하려면 Enter를 누르세요..."
    clear
done
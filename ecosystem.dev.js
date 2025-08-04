module.exports = {
  apps: [{
    name: 'thehost-server-dev',
    script: './dist/main.js',
    cwd: __dirname,
    instances: 3, // 개발용으로 3개 인스턴스만 생성
    exec_mode: 'cluster', // 클러스터 모드 사용
    env: {
      NODE_ENV: 'development',
      PORT: process.env.SERVER_PORT || 3000
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: process.env.SERVER_PORT || 3000
    },
    error_file: './logs/pm2-dev-error.log',
    out_file: './logs/pm2-dev-out.log',
    log_file: './logs/pm2-dev-combined.log',
    time: true,
    merge_logs: true,
    max_memory_restart: '500M',
    watch: false,
    // 자동 재시작 옵션
    autorestart: true,
    max_restarts: 5,
    min_uptime: '5s',
    // 개발용 추가 설정
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    ignore_watch: ['node_modules', 'logs'],
    // 환경변수 로드
    env_file: './.env'
  }]
};
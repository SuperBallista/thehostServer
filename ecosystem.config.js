module.exports = {
  apps: [{
    name: 'thehost-server',
    script: './dist/main.js',
    instances: 'max', // CPU 코어 수만큼 인스턴스 생성
    exec_mode: 'cluster', // 클러스터 모드 사용
    env: {
      NODE_ENV: 'production',
      PORT: process.env.SERVER_PORT || 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: process.env.SERVER_PORT || 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    merge_logs: true,
    max_memory_restart: '1G',
    watch: false,
    // 자동 재시작 옵션
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
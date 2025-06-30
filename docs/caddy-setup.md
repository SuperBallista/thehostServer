# Caddy 리버스 프록시 설정 가이드

## 개요
Caddy는 자동 HTTPS를 지원하는 강력한 웹 서버/리버스 프록시입니다.

## 빠른 시작

### 1. 개발 환경
```bash
# 개발용 Caddyfile 사용
cp Caddyfile.dev Caddyfile

# Caddy 실행
docker-compose -f docker-compose-caddy.yml up -d
```

### 2. 프로덕션 환경
```bash
# Caddyfile 편집 (도메인 설정)
nano Caddyfile

# 환경변수 설정
export DOMAIN=yourdomain.com
export CADDY_HTTP_PORT=80
export CADDY_HTTPS_PORT=443

# Caddy 실행
docker-compose -f docker-compose-caddy.yml up -d
```

## Caddyfile 설정

### 기본 구조
```caddyfile
yourdomain.com {
    reverse_proxy * app:3000
}
```

### WebSocket 지원
```caddyfile
reverse_proxy * app:3000 {
    header_up Upgrade {http.request.header.Upgrade}
    header_up Connection {http.request.header.Connection}
}
```

### HTTPS 설정
Caddy는 자동으로 Let's Encrypt 인증서를 발급받습니다:
- 도메인이 유효해야 함
- 포트 80, 443이 열려있어야 함
- DNS가 서버를 가리켜야 함

### 로드 밸런싱
```caddyfile
reverse_proxy * {
    to app1:3000 app2:3000 app3:3000
    lb_policy round_robin
    health_uri /health
    health_interval 10s
}
```

## 환경변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| DOMAIN | localhost | 서비스 도메인 |
| CADDY_HTTP_PORT | 80 | HTTP 포트 |
| CADDY_HTTPS_PORT | 443 | HTTPS 포트 |
| CADDY_ADMIN_PORT | 2019 | Caddy Admin API 포트 |

## 명령어

### 로그 확인
```bash
docker-compose -f docker-compose-caddy.yml logs -f caddy
```

### Caddy 재시작
```bash
docker-compose -f docker-compose-caddy.yml restart caddy
```

### 설정 다시 로드
```bash
docker exec hostgame-caddy caddy reload --config /etc/caddy/Caddyfile
```

## 문제 해결

### 인증서 발급 실패
- DNS 설정 확인
- 방화벽에서 80, 443 포트 열기
- 도메인이 실제로 서버를 가리키는지 확인

### WebSocket 연결 실패
- Caddyfile에 WebSocket 헤더 설정 확인
- NestJS 서버의 CORS 설정 확인

### 502 Bad Gateway
- NestJS 서버가 실행 중인지 확인
- Docker 네트워크 설정 확인
- 호스트와 포트가 올바른지 확인
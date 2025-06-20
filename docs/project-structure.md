# The Host (숙주) - 프로젝트 구조 문서

## 프로젝트 개요
- **프로젝트명**: The Host (숙주)
- **장르**: 웹 기반 멀티플레이어 생존 심리 추리 게임
- **플레이어 수**: 8~20명
- **배경**: 좀비 바이러스가 퍼진 섬에서 생존자들이 숙주를 찾아 백신을 투여하는 게임

## 기술 스택

### 백엔드 (NestJS)
- **Framework**: NestJS with TypeScript
- **실시간 통신**: Socket.io
- **데이터베이스**: 
  - MySQL: 사용자 정보 저장 (users 테이블)
  - Redis: 게임 상태 관리 및 Pub/Sub
- **인증**: JWT + Google OAuth
- **포트**: 4000

### 프론트엔드 (Svelte)
- **Framework**: Svelte + TypeScript
- **빌드 도구**: Vite
- **상태 관리**: Svelte stores
- **스타일링**: CSS
- **포트**: 5173 (개발)

## 디렉토리 구조

### 백엔드 (src/)
```
src/
├── auth/               # 인증 모듈 (Google OAuth, JWT)
├── socket/             # Socket.io 실시간 통신
├── redis/              # Redis 연결 및 Pub/Sub
├── user/               # 사용자 관리
├── game/               # 게임 로직
├── common/             # 공통 유틸리티
├── database/           # DB 설정
└── main.ts             # 앱 진입점
```

### 프론트엔드 (Frontend/src/)
```
Frontend/src/
├── components/         # 재사용 가능한 컴포넌트
├── pages/              # 페이지 컴포넌트
│   ├── Login.svelte    # 로그인 페이지
│   ├── NewUser.svelte  # 신규 유저 설정
│   ├── Lobby.svelte    # 게임 방 목록
│   ├── WaitRoom.svelte # 대기실
│   └── Game.svelte     # 게임 플레이 화면
├── stores/             # Svelte stores (상태 관리)
├── services/           # API 및 Socket 통신
├── types/              # TypeScript 타입 정의
└── App.svelte          # 루트 컴포넌트
```

## 게임 플로우

1. **로그인** (Login.svelte)
   - Google OAuth 로그인
   - JWT 토큰 발급

2. **신규 유저 설정** (NewUser.svelte)
   - 닉네임 설정
   - 프로필 설정

3. **로비** (Lobby.svelte)
   - 게임 방 목록 조회
   - 방 생성/참가

4. **대기실** (WaitRoom.svelte)
   - 플레이어 대기
   - 게임 설정
   - 게임 시작

5. **게임** (Game.svelte)
   - 실시간 게임 진행
   - 채팅/아이템/이동

## 주요 게임 메커니즘

### 1. 팀 구성
- **생존자팀**: 숙주를 찾아 백신 투여가 목표
- **좀비팀**: 모든 생존자 감염/사망이 목표

### 2. 감염 시스템
- 숙주가 같은 구역의 생존자 감염 가능 (턴당 1명)
- 감염자는 자신의 감염 상태를 모름
- 5턴 후 좀비로 변이

### 3. 구역 시스템
- 3~6개 구역 (해안가, 폐건물, 정글, 동굴, 산 정상, 개울가)
- 같은 구역 내에서만 상호작용 가능
- 매 턴(90초)마다 구역 이동 가능

### 4. 아이템 시스템
- **진단/치료**: 자가진단키트, 응급치료제
- **통신**: 무전기, 마이크
- **백신**: 백신 재료 3종
- **무기**: 산탄총
- **기타**: 낙서 스프레이, 지우개

### 5. 커뮤니케이션
- 구역 내 채팅
- 무전기로 1:1 통신
- 마이크로 전체 방송
- 익명 낙서 시스템

## Redis 데이터 구조

### 게임 상태
- `game:{gameId}` - 게임 전체 상태 (턴, 호스트, 기록)
- `game:{gameId}:player:{playerId}` - 플레이어 상태 (위치, 아이템, 감염)
- `game:{gameId}:region:{turn}:{regionId}` - 구역 정보 (채팅, 낙서)
- `game:{gameId}:zombie:{playerId}` - 좀비 정보 (타겟, 이동)

### 방 관리
- `room:data:{roomId}` - 방 정보 (플레이어 목록, 설정)
- `room:list` - 활성 방 목록

### 온라인 상태
- `online:{userId}` - 사용자 접속 정보
- `socket:{socketId}` - 소켓 연결 정보

## Socket.io 이벤트

### 클라이언트 → 서버
- `join-room`: 방 참가
- `leave-room`: 방 나가기
- `start-game`: 게임 시작
- `move-region`: 구역 이동
- `use-item`: 아이템 사용
- `send-message`: 채팅 메시지

### 서버 → 클라이언트
- `room-updated`: 방 정보 업데이트
- `game-started`: 게임 시작 알림
- `turn-changed`: 턴 변경
- `player-moved`: 플레이어 이동
- `item-used`: 아이템 사용 결과
- `message-received`: 채팅 수신

## 개발 환경 설정

### 백엔드
```bash
npm install
npm run start:dev
```

### 프론트엔드
```bash
cd Frontend
npm install
npm run dev
```

### 환경 변수
- `.env`: 백엔드 환경 변수 (DB, OAuth, Redis)
- `Frontend/.env`: 프론트엔드 환경 변수 (API URL)

## 향후 계획
- LLM API를 활용한 AI 봇 플레이어
- 모바일 최적화
- 게임 통계 및 랭킹 시스템
- 추가 게임 모드
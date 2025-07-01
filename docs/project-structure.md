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
  - Redis Search: 문서 벡터 검색 (선택적)
- **인증**: JWT + Google OAuth
- **포트**: 3000
- **외부 API**: OpenAI API (문서 벡터화, 선택적)

### 프론트엔드 (Svelte)
- **Framework**: Svelte + TypeScript
- **빌드 도구**: Vite
- **상태 관리**: Svelte stores
- **스타일링**: CSS + Tailwind-like 유틸리티 클래스
- **포트**: 5173 (개발)

## 디렉토리 구조

### 프로젝트 루트
```
thehostServer/
├── src/                    # 백엔드 소스 코드
├── Frontend/               # 프론트엔드 애플리케이션
│   ├── front/              # 프론트엔드 빌드 출력
│   ├── src/                # 프론트엔드 소스 코드
│   ├── public/             # 정적 자산
│   ├── index.html          # HTML 진입점
│   └── README.md           # 프론트엔드 README
├── docs/                   # 프로젝트 문서
├── scripts/                # 유틸리티 스크립트
├── dist/                   # 백엔드 빌드 출력
├── front/                  # 프론트엔드 빌드 출력 (복사본)
├── logs/                   # PM2 로그 디렉토리
├── docker-compose.yml      # Docker 설정
├── docker-compose-mysql.yml # MySQL Docker 설정
├── docker-compose-caddy.yml # Caddy 리버스 프록시 설정
├── ecosystem.config.js     # PM2 설정 (클러스터 모드)
├── package.json            # 백엔드 의존성
├── package-lock.json       # 백엔드 의존성 잠금
├── eslint.config.mjs       # ESLint 설정
├── nest-cli.json           # NestJS CLI 설정
├── tsconfig.json           # TypeScript 설정
├── tsconfig.build.json     # TypeScript 빌드 설정
├── .env                    # 환경 변수
├── .env.example            # 환경 변수 예시
└── README.md               # 프로젝트 README
```

### 백엔드 (src/)
```
src/
├── auth/                   # 인증 모듈
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── auth.type.ts        # 인증 타입 정의
│   └── providers/
│       └── google-auth.provider.ts
├── socket/                 # Socket.io 실시간 통신
│   ├── socket.gateway.ts   # WebSocket 게이트웨이
│   ├── socket.module.ts
│   ├── connection.service.ts
│   ├── lobby.service.ts
│   ├── data.types.ts       # 데이터 타입 정의
│   ├── payload.types.ts    # 페이로드 타입 정의 (ChatMessage 포함)
│   ├── game/               # 게임 관련 서비스
│   │   ├── game.service.ts         # 게임 메인 오케스트레이터 (185줄)
│   │   ├── game.types.ts           # 게임 타입 정의
│   │   ├── gameTurn.service.ts     # 턴별 아이템 지급 서비스
│   │   ├── zombie.service.ts       # 좀비 관리 서비스
│   │   ├── player-manager.service.ts    # 플레이어 데이터 관리 (127줄)
│   │   ├── game-data.service.ts         # Redis 데이터 접근 계층 (119줄)
│   │   ├── game-state.service.ts        # 게임 상태 응답 생성 (147줄)
│   │   ├── chat.service.ts              # 채팅 메시지 처리 (102줄)
│   │   ├── host-action.service.ts       # 호스트 액션 처리 (120줄)
│   │   └── itemProbabilities.json       # 아이템 확률 설정
│   ├── utils/              # 소켓 유틸리티
│   │   ├── socketRoomManager.ts
│   │   └── randomManager.ts
│   └── types/              # 소켓 타입 정의
│       └── pubsub-helper.ts
├── redis/                  # Redis 연결 및 Pub/Sub
│   ├── redis.module.ts     # Redis 모듈
│   ├── redis.service.ts
│   ├── redisPubSub.service.ts  # Pub/Sub 서비스 (CHAT_MESSAGE 처리 포함)
│   ├── redisPubSubHelper.ts
│   ├── pubsub-usage-guide.ts  # PubSub 사용 가이드
│   └── pubsub.types.ts     # PubSub 타입 정의 (InternalUpdateType 포함)
├── services/               # 추가 서비스
│   └── document-search.service.ts  # 문서 벡터 검색 서비스
├── user/                   # 사용자 관리
│   ├── user.module.ts      # 사용자 모듈
│   ├── user.service.ts
│   ├── user.repository.ts
│   ├── user-cache.service.ts
│   ├── user-init.service.ts
│   ├── dto/                # 데이터 전송 객체
│   │   └── user.dto.ts
│   └── tag/
│       └── tag.service.ts
├── jwt/                    # JWT 인증
│   ├── jwt.module.ts       # JWT 모듈
│   ├── jwt.service.ts
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   └── decorators/
│       └── current-user.decorator.ts
├── database/               # 데이터베이스 설정
│   ├── database.module.ts
│   ├── database.provider.ts
│   └── schema/
│       └── users.sql
├── common/                 # 공통 유틸리티
│   ├── types/
│   │   └── jwt.type.ts
│   └── utils/
│       ├── encryption.service.ts
│       └── json.services.ts
├── utils/                  # 유틸리티 함수
│   ├── base32.ts
│   └── vectorize-docs.ts   # 문서 벡터화 유틸리티
├── app.module.ts           # 루트 모듈
├── app.controller.ts       # 루트 컨트롤러
└── main.ts                 # 애플리케이션 진입점
```

### 프론트엔드 (Frontend/src/)
```
Frontend/src/
├── page/                   # 페이지 컴포넌트
│   ├── login/
│   │   └── login.svelte    # 로그인 페이지
│   ├── newUser/
│   │   └── newUser.svelte  # 신규 유저 설정
│   ├── lobby/
│   │   ├── lobby.svelte    # 로비 메인
│   │   ├── LobbyMain.svelte
│   │   ├── RoomList.svelte # 방 목록
│   │   └── lobby.type.ts   # 로비 타입 정의
│   ├── waitRoom/
│   │   ├── waitRoom.svelte # 대기실
│   │   └── playerCard.svelte
│   └── game/               # 게임 화면
│       ├── gameLayout.svelte       # 게임 레이아웃 (배경음악 통합)
│       ├── gameMenu.svelte
│       ├── game.type.ts    # 게임 타입 정의
│       ├── common/         # 게임 공통 요소
│       │   ├── itemObject.ts  # 아이템 객체 정의
│       │   └── GameStartMessageBox.svelte  # 게임 시작 역할 안내 메시지박스
│       ├── chat/           # 채팅 관련
│       │   ├── chatInput.svelte
│       │   ├── chatLog.svelte
│       │   └── regionInfo.svelte
│       ├── menu/           # 게임 메뉴
│       │   ├── actionModal.svelte
│       │   ├── inventoryModal.svelte
│       │   ├── survivorModal.svelte
│       │   ├── sidebarMenu.svelte  # 사이드바 메뉴 (음악 토글 버튼 포함)
│       │   └── mobileNav.svelte     # 모바일 네비게이션 (음악 토글 버튼 포함)
│       └── selectModal/    # 선택 모달
│           ├── playerSelector.svelte
│           └── selectOptionBox.svelte
├── common/                 # 공통 컴포넌트 및 유틸리티
│   ├── component/
│   │   ├── footer.svelte
│   │   ├── userInfoHeader.svelte
│   │   └── api/
│   │       └── logout.ts
│   ├── constant/           # 상수 정의
│   │   └── theme.ts        # 테마 상수
│   ├── messagebox/         # 메시지박스 시스템
│   │   ├── MessageBox.svelte       # 메시지박스 (텍스트 왼쪽 정렬 및 줄바꿈 지원)
│   │   ├── InputBox.svelte
│   │   ├── BoxOverlay.svelte
│   │   ├── LoadingSpinner.svelte
│   │   ├── SlideToggle.svelte
│   │   ├── ImageUpload.svelte
│   │   ├── customStore.ts
│   │   ├── customStore.d.ts   # TypeScript 선언 파일
│   │   ├── customStore.js.map # JavaScript 소스맵
│   │   └── config/
│   │       └── messageBoxColor.json  # 메시지박스 색상 설정
│   ├── store/              # 상태 관리 (Svelte stores)
│   │   ├── authStore.ts
│   │   ├── gameStore.ts
│   │   ├── gameStateStore.ts      # 게임 상태 통합 관리
│   │   ├── lobbyStore.ts
│   │   ├── pageStore.ts
│   │   ├── playerStore.ts         # 플레이어 상태 관리
│   │   ├── socketStore.ts         # Socket.io 연결 관리
│   │   ├── waitRoomStore.ts
│   │   ├── selectOptionStore.ts
│   │   ├── selectPlayerMessageBox.ts  # 플레이어 선택 메시지박스
│   │   ├── musicStore.ts              # 배경음악 상태 관리
│   │   ├── synchronize.type.ts        # 동기화 타입 정의
│   │   └── synchronize.type.d.ts      # TypeScript 선언 파일
│   ├── handleCode/
│   │   └── errorHandle.ts
│   └── utils/
│       ├── fetch.ts
│       └── awaitSocketReady.ts
├── App.svelte              # 루트 컴포넌트
├── main.ts                 # 앱 진입점
├── app.css                 # 전역 스타일
└── vite-env.d.ts           # Vite 타입 정의
```

### 프론트엔드 설정 파일 (Frontend/)
```
Frontend/
├── package.json            # 프론트엔드 의존성
├── package-lock.json       # 프론트엔드 의존성 잠금
├── vite.config.ts          # Vite 빌드 설정
├── svelte.config.js        # Svelte 설정
├── tsconfig.json           # TypeScript 기본 설정
├── tsconfig.app.json       # TypeScript 앱 설정
├── tsconfig.node.json      # TypeScript 노드 설정
├── index.html              # HTML 진입점
└── README.md               # 프론트엔드 문서
```

### 정적 자산 (Frontend/public/, front/)
```
Frontend/public/
├── game_bgm.mp3            # 게임 배경음악
└── img/
    ├── logo.png
    ├── google-icon.svg
    ├── items/                  # 게임 아이템 이미지
    │   ├── medicine.jpg        # 응급치료제
    │   ├── vaccine.jpg         # 백신
    │   ├── shotgun.jpg         # 좀비사살용산탄총
    │   ├── microphone.jpg      # 마이크
    │   ├── wireless.jpg        # 무전기
    │   ├── spray.jpg           # 낙서스프레이
    │   ├── eraser.jpg          # 지우개
    │   ├── virusChecker.jpg    # 진단키트
    │   ├── vaccineMaterialA.jpg # 항바이러스혈청
    │   ├── vaccineMaterialB.jpg # 촉매정제물질
    │   └── vaccineMaterialC.jpg # 신경억제단백질
    ├── region/                 # 지역 배경 이미지
    │   ├── beach.jpg           # 해안가
    │   ├── building.jpg        # 폐건물
    │   ├── cave.jpg            # 동굴
    │   ├── hill.jpg            # 산 정상
    │   ├── jungle.jpg          # 정글
    │   └── river.jpg           # 개울가
    └── scence/                 # 게임 상황 이미지
        ├── host.png            # 숙주
        ├── survivor.png        # 생존자
        ├── zombie.png          # 좀비
        ├── infect.png          # 감염
        ├── checkInfect.png     # 감염 확인
        ├── vaccine.png         # 백신 투여
        ├── killed.png          # 사망
        ├── runaway.png         # 도주
        └── hide.png            # 은신
```

### 프로젝트 문서 (docs/)
```
docs/
├── project-structure.md    # 프로젝트 구조 문서 (현재 파일)
├── planning.md             # 기획 문서
├── updatePlan.md           # 업데이트 계획
├── redis.erd               # Redis ERD 파일
├── RedisERD.txt            # Redis ERD 텍스트 형식
├── vector-search-commands.txt  # 벡터 검색 명령어 가이드
├── 상태동기화.txt           # 상태 동기화 노트
├── 수정예정.txt             # 수정 예정 노트
├── 이미지.txt               # 이미지 관련 노트
└── 피드백.txt               # 피드백 노트
```

### 유틸리티 스크립트 (scripts/)
```
scripts/
├── vectorize-project-docs.ts  # 프로젝트 문서 벡터화
├── read-vector-data.ts        # 벡터 데이터 읽기
└── search-docs.ts             # 문서 검색
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
   - 게임 설정 (봇 허용 여부)
   - 게임 시작 (방장만 가능)

5. **게임** (GameLayout.svelte)
   - 실시간 게임 진행
   - 채팅/아이템/이동
   - 배경음악 재생 (토글 가능)

## 주요 게임 메커니즘

### 1. 팀 구성
- **생존자팀**: 숙주를 찾아 백신 투여가 목표
- **좀비팀**: 모든 생존자 감염/사망이 목표
- **익명성**: 인게임에서는 동물 닉네임 사용 (20개 미리 정의)

### 2. 감염 시스템
- 숙주가 같은 구역의 생존자 감염 가능 (2턴당 1명)
- 감염자는 자신의 감염 상태를 모름
- 5턴 후 좀비로 변이

### 3. 구역 시스템
- 3~6개 구역 (플레이어 수에 따라 자동 조정)
  - 8-9명: 3구역
  - 10-13명: 4구역
  - 14-17명: 5구역
  - 18-20명: 6구역
- 같은 구역 내에서만 상호작용 가능
- 매 턴마다 구역 이동 가능 (1-4턴: 60초, 5턴 이후: 90초)

### 4. 아이템 시스템
- **진단/치료**: 자가진단키트, 응급치료제
- **통신**: 무전기, 마이크
- **백신**: 백신 재료 3종 (항바이러스혈청, 촉매정제물질, 신경억제단백질)
- **무기**: 좀비사살용산탄총
- **기타**: 낙서 스프레이, 지우개
- **획득 방식**: 매 턴 시작 시 자동 지급 (가중치 기반 확률)

### 5. 커뮤니케이션
- 구역 내 채팅
- 무전기로 1:1 통신
- 마이크로 전체 방송
- 익명 낙서 시스템

### 6. 승리 조건
- **생존자 승리**: 백신 3종 재료를 모아 숙주에게 투여
- **좀비 승리**: 모든 생존자 감염 또는 사망
- **무승부**: 20턴 경과

## Redis 데이터 구조

### 게임 상태
- `game:{gameId}` - 게임 전체 상태 (턴, 호스트, 기록)
- `game:{gameId}:player:{playerId}` - 플레이어 상태 (위치, 아이템, 감염)
- `game:{gameId}:region:{regionId}:turn:{turn}` - 구역 정보 (채팅, 낙서)
- `game:{gameId}:zombie:{playerId}` - 좀비 정보 (타겟, 이동)
- `game:{gameId}:host` - 숙주 정보 (감염 가능 여부, 타겟)

### 방 관리
- `room:data:{roomId}` - 방 정보 (플레이어 목록, 설정)
- `room:list` - 활성 방 목록

### 온라인 상태
- `online:{userId}` - 사용자 접속 정보
- `socket:{socketId}` - 소켓 연결 정보

### 문서 벡터 (선택적)
- `doc:chunk:{chunkId}` - 벡터화된 문서 청크
- `idx:docs` - RediSearch 벡터 인덱스

## 서비스 아키텍처

### 게임 서비스 레이어 구조

```
SocketGateway
    ↓
GameService (오케스트레이터)
    ├── PlayerManagerService
    │   ├── 플레이어 데이터 관리
    │   ├── 위치 상태 관리
    │   └── Region 이동 처리
    │
    ├── GameDataService
    │   ├── Redis CRUD 작업
    │   ├── 게임 데이터 저장/조회
    │   └── 데이터 정리
    │
    ├── GameStateService
    │   ├── 게임 상태 응답 생성
    │   ├── 생존자 리스트 관리
    │   └── 게임 종료 처리
    │
    ├── ChatService
    │   ├── 채팅 메시지 처리
    │   ├── Region별 브로드캐스트
    │   └── 시스템 메시지
    │
    ├── HostActionService
    │   ├── 호스트 권한 검증
    │   ├── 감염 대상 설정
    │   └── 좀비 명령 처리
    │
    ├── GameTurnService
    │   └── 턴별 아이템 지급
    │
    └── ZombieService
        ├── 좀비 생성/삭제
        └── 좀비 상태 관리
```

### 서비스 간 의존성
- `GameService`는 모든 서비스를 조정
- 각 서비스는 필요한 서비스만 주입받음
- 순환 의존성 없음
- 명확한 계층 구조 유지

## Socket.io 이벤트

### 클라이언트 → 서버
- `request`: 모든 요청 (타입별 처리)
  - `createRoom`: 방 생성
  - `joinRoom`: 방 참가
  - `exitRoom`: 방 나가기
  - `gameStart`: 게임 시작
  - `myStatus`: 플레이어 상태 업데이트
  - `hostAct`: 숙주 행동
  - `giveItem`: 아이템 전달
  - `useItem`: 아이템 사용
  - `chatMessage`: 채팅 메시지 전송

### 서버 → 클라이언트
- `update`: 모든 업데이트 (페이로드 타입별)
  - `locationState`: 페이지 상태
  - `roomData`: 방 정보
  - `playerId`: 플레이어 ID
  - `myStatus`: 내 상태
  - `survivorList`: 생존자 목록
  - `gameTurn`: 현재 턴
  - `count`: 남은 시간
  - `region`: 구역 정보
  - `hostAct`: 숙주 정보
  - `alarm`: 알림 메시지

## 개발 환경 설정

### 백엔드
```bash
npm install
npm run start:dev  # 개발 모드 (watch 모드)
```

### 프론트엔드
```bash
cd Frontend
npm install
npm run dev
```

### 프로덕션 배포 (PM2)
```bash
npm run pm2:start    # PM2로 클러스터 모드 시작
npm run pm2:restart  # 코드 업데이트 후 재시작 (ecosystem.config.js 변경사항 반영)
npm run pm2:stop     # PM2 프로세스 중지
npm run pm2:logs     # PM2 로그 확인
npm run pm2:status   # PM2 프로세스 상태 확인
```

### 환경 변수
- `.env`: 환경 변수 설정 (`.env.example` 참조)
- 필수 환경 변수: DB 연결, Redis, JWT, Google OAuth
- 선택적 환경 변수: OpenAI API (문서 벡터 검색용)

## 최근 주요 업데이트

### 게임 서비스 리팩토링 (2025.01)
- **game.service.ts** 책임 분리 (500줄 → 185줄)
- **단일 책임 원칙(SRP)** 적용:
  - `player-manager.service.ts`: 플레이어 데이터 및 위치 관리
  - `game-data.service.ts`: Redis 데이터 접근 계층
  - `game-state.service.ts`: 게임 상태 및 응답 생성
  - `chat.service.ts`: 채팅 메시지 처리
  - `host-action.service.ts`: 호스트 전용 기능
- 테스트 용이성 및 유지보수성 향상
- 각 서비스가 명확한 단일 책임 보유

### 채팅 시스템 구현
- 구역별 실시간 채팅 기능 추가
- Redis Pub/Sub을 통한 메시지 브로드캐스팅
- 플레이어 region 이동 시 채팅방 자동 전환 (`movePlayerToRegion`)
- 프론트엔드 동물 닉네임과 연동 (nicknameList 사용)
- 크롬 브라우저 Enter 키 이벤트 호환성 수정 (`keypress` → `keydown`)

### 게임 동기화 개선
- 모든 게임 데이터를 `syncWithServer` 함수로 통합 처리
- 숙주 상태(`isHost`) 동기화 문제 해결
- 타이머 카운트다운 클라이언트 사이드 처리
- Socket 이벤트 중복 등록 버그 수정 (gameLayout.svelte)

### UI/UX 개선
- 방장만 게임 시작 버튼 활성화
- 숙주 전용 버튼 조건부 활성화 (감염, 좀비 조작)
- 익명성 유지를 위한 동물 닉네임 시스템

### 문서 벡터 검색 (선택적)
- OpenAI 임베딩을 사용한 문서 벡터화
- RediSearch를 이용한 유사도 검색
- 프로덕션 환경에서는 자동 비활성화

## 향후 계획
- LLM API를 활용한 AI 봇 플레이어
- 모바일 최적화
- 게임 통계 및 랭킹 시스템
- 추가 게임 모드
- 실시간 음성 채팅
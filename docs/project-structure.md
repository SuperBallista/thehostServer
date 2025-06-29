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
├── dist/                   # 백엔드 빌드 출력
├── front/                  # 프론트엔드 빌드 출력 (복사본)
├── docker-compose.yml      # Docker 설정
├── docker-compose-mysql.yml # MySQL Docker 설정
├── package.json            # 백엔드 의존성
├── package-lock.json       # 백엔드 의존성 잠금
├── eslint.config.mjs       # ESLint 설정
├── nest-cli.json           # NestJS CLI 설정
├── tsconfig.json           # TypeScript 설정
├── tsconfig.build.json     # TypeScript 빌드 설정
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
│   ├── payload.types.ts    # 페이로드 타입 정의
│   ├── game/               # 게임 관련 서비스
│   │   ├── game.service.ts
│   │   ├── game.types.ts
│   │   ├── gameTurn.service.ts     # 턴별 아이템 지급 서비스
│   │   └── itemProbabilities.json  # 아이템 확률 설정
│   ├── utils/              # 소켓 유틸리티
│   │   ├── socketRoomManager.ts
│   │   └── randomManager.ts
│   └── types/              # 소켓 타입 정의
│       └── pubsub-helper.ts
├── redis/                  # Redis 연결 및 Pub/Sub
│   ├── redis.module.ts     # Redis 모듈
│   ├── redis.service.ts
│   ├── redisPubSub.service.ts
│   ├── redisPubSubHelper.ts
│   ├── pubsub-usage-guide.ts  # PubSub 사용 가이드
│   └── pubsub.types.ts     # PubSub 타입 정의
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
│   └── base32.ts
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
│       │   └── itemObject.ts  # 아이템 객체 정의
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
│   │   ├── gameStateStore.ts
│   │   ├── lobbyStore.ts
│   │   ├── pageStore.ts
│   │   ├── playerStore.ts     # 플레이어 상태 관리
│   │   ├── socketStore.ts
│   │   ├── waitRoomStore.ts
│   │   ├── selectOptionStore.ts
│   │   ├── selectPlayerMessageBox.ts  # 플레이어 선택 메시지박스
│   │   ├── musicStore.ts              # 배경음악 상태 관리
│   │   └── synchronize.type.ts        # 동기화 타입 정의
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
├── 상태동기화.txt           # 상태 동기화 노트
├── 수정예정.txt             # 수정 예정 노트
├── 이미지.txt               # 이미지 관련 노트
└── 피드백.txt               # 피드백 노트
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
- **백신**: 백신 재료 3종 (항바이러스혈청, 촉매정제물질, 신경억제단백질)
- **무기**: 좀비사살용산탄총
- **기타**: 낙서 스프레이, 지우개
- **획득 방식**: 매 턴 시작 시 자동 지급 (100% 확률)

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
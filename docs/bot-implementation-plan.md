# 봇 시스템 구현 계획

## 개요
이 문서는 게임 봇 플레이어 시스템의 구현 계획을 상세히 기술합니다.

## 1. 시스템 아키텍처

### 1.1 핵심 컴포넌트
- **BotService**: 봇 생명주기 관리
- **LLMService**: AI 모델 통신
- **TriggerService**: 트리거 조건 모니터링
- **ActionService**: 봇 행동 실행
- **MemoryService**: 봇 메모리 관리

### 1.2 데이터 흐름
```
Game Event → Trigger Check → LLM Decision → Action Execute → Memory Update
```

## 2. 구현 단계

### Phase 1: 기반 시스템 구축 (1주차)

#### 1.1 봇 플레이어 관리 시스템
```typescript
// src/bot/bot.service.ts
export class BotService {
  // 봇 생성 (userId < 0)
  createBot(roomId: string, botConfig: BotConfig): BotPlayer
  
  // 봇 상태 관리
  getBotState(botId: number): BotState
  updateBotState(botId: number, state: Partial<BotState>): void
  
  // 봇 제거
  removeBot(botId: number): void
}
```

#### 1.2 봇 식별 체계
- 봇 userId: -1, -2, -3... (음수)
- 봇 이름 규칙: "Bot_1", "Bot_2"...
- 봇 성격: MBTI + 성별

### Phase 2: LLM 통합 (1-2주차)

#### 2.1 LLM 서비스 구현
```typescript
// src/bot/llm.service.ts
export class LLMService {
  // 트리거 생성
  generateTriggers(context: GameContext): Promise<BotTrigger[]>
  
  // 행동 결정
  decideAction(context: GameContext, trigger: TriggeredEvent): Promise<BotAction>
  
  // 메모리 요약
  summarizeTurn(events: GameEvent[]): Promise<string>
}
```

#### 2.2 프롬프트 템플릿
- 트리거 생성 프롬프트
- 행동 결정 프롬프트  
- 메모리 요약 프롬프트

### Phase 3: 트리거 시스템 (2주차)

#### 3.1 트리거 타입 (문서 기반)
- **시간 트리거**: 턴 시작 후 X초
- **채팅 트리거**: 모든 채팅 메시지 (시스템/플레이어)
- **무전기/마이크 트리거**: 개인/전체 방송 메시지

#### 3.2 트리거 모니터링
- 시간 트리거: setTimeout 기반
- 채팅 트리거: 메시지 이벤트 리스너
- 무전기 트리거: 전용 이벤트 리스너

### Phase 4: 행동 실행 시스템 (2-3주차)

#### 4.1 사용 가능한 액션 (문서 기반)
```typescript
// 모든 액션은 ingame-player-actions.md 문서 참조
const availableActions = {
  // 이동
  'myStatus.next': (params) => ({ next: params.location }),
  
  // 좀비 대응
  'myStatus.act': (params) => ({ act: params.action }),
  
  // 채팅
  'chatMessage': (params) => ({ chatMessage: params.message }),
  
  // 아이템 사용
  'useItem': (params) => ({ useItem: params.item }),
  
  // 아이템 전달
  'giveItem': (params) => ({ giveItem: { target: params.target, item: params.item } }),
  
  // 호스트 전용
  'hostAct.infect': (params) => ({ hostAct: { infect: params.target } }),
  'hostAct.zombieList': (params) => ({ hostAct: { zombieList: params.zombies } })
}
```

#### 4.2 검증 및 실행
- 행동 유효성 검사
- 소켓 이벤트 발송
- 결과 추적

### Phase 5: 메모리 시스템 (3주차)

#### 5.1 제공 정보 (문서 기반)
1. 이전 턴 요약 (LLM 자동 생성)
2. 현재 턴 채팅 내용
3. 현재 턴 봇의 보유 아이템
4. 현재 턴 같은 구역의 생존자 정보
5. 턴 정보
6. 구역 낙서
7. 도망 가능 여부
8. 봇의 역할 (호스트/생존자)

#### 5.2 메모리 업데이트
- 턴 종료 시 자동 요약
- 중요 이벤트 즉시 기록
- 메모리 크기 제한 관리

### Phase 6: 통합 및 최적화 (3-4주차)

#### 6.1 성능 최적화
- LLM 호출 배치 처리
- Redis 캐싱 전략
- 비동기 처리 최적화

#### 6.2 안정성 개선
- 에러 핸들링
- 재시도 로직
- 폴백 전략

## 3. 기술 스택

### 필수 의존성
- NestJS (기존 프레임워크)
- Redis (트리거/메모리 저장)
- OpenAI/Claude API (LLM)
- Socket.io (기존 통신)

### 추가 패키지
```json
{
  "ioredis": "^5.3.2",
  "openai": "^4.20.0",
  "zod": "^3.22.0" // JSON 검증
}
```

## 4. 파일 구조

```
src/
├── bot/
│   ├── bot.module.ts
│   ├── bot.service.ts
│   ├── llm.service.ts
│   ├── trigger.service.ts
│   ├── action.service.ts
│   ├── memory.service.ts
│   ├── dto/
│   │   ├── bot-trigger.dto.ts
│   │   ├── bot-action.dto.ts
│   │   └── bot-memory.dto.ts
│   ├── interfaces/
│   │   ├── bot.interface.ts
│   │   └── trigger.interface.ts
│   └── prompts/
│       ├── trigger-generation.prompt.ts
│       ├── action-decision.prompt.ts
│       └── memory-summary.prompt.ts
```

## 5. Redis 데이터 스키마

### 5.1 봇 트리거 저장
```typescript
// Key: bot:triggers:{roomId}:{botId}
{
  "triggers": [
    {
      "id": "trigger_1",
      "type": "time",
      "condition": {
        "seconds": 30,
        "turnStart": true
      },
      "priority": 1,
      "action": "decideMoveLocation",
      "metadata": {
        "description": "30초 후 이동 위치 결정"
      }
    },
    {
      "id": "trigger_2",
      "type": "chat",
      "condition": {
        "pattern": "도와|help|위험",
        "sender": "any"
      },
      "priority": 2,
      "action": "respondToHelp",
      "metadata": {
        "description": "도움 요청에 반응"
      }
    },
    {
      "id": "trigger_3",
      "type": "radio",
      "condition": {
        "sender": "specific",
        "senderId": 123
      },
      "priority": 3,
      "action": "processRadioMessage"
    }
  ],
  "createdAt": "2024-01-20T12:00:00Z",
  "turnNumber": 5,
  "personality": {
    "mbti": "INTJ",
    "gender": "male"
  }
}
```

### 5.2 봇 메모리 저장
```typescript
// Key: bot:memory:{roomId}:{botId}
{
  "shortTerm": {
    "currentTurn": 5,
    "location": "해안",
    "items": ["shotgun", "medicine"],
    "canEscape": true,
    "role": "survivor",
    "recentChats": [
      {
        "sender": "Player1",
        "message": "해안에 좀비 있어요!",
        "timestamp": "2024-01-20T12:01:00Z"
      }
    ],
    "graffiti": ["누군가 여기서 죽었다", "조심하세요"],
    "playersInRegion": ["Player1", "Player3"]
  },
  "longTerm": {
    "turnSummaries": [
      {
        "turn": 4,
        "summary": "폐건물에서 동굴로 이동. Player2가 좀비에게 공격받음. 샷건 획득."
      },
      {
        "turn": 3,
        "summary": "해안에서 아이템 수색. 의심스러운 Player3 발견."
      }
    ],
    "suspicions": {
      "Player3": 0.8,  // 호스트 의심도
      "Player5": 0.3
    }
  },
  "metadata": {
    "lastUpdated": "2024-01-20T12:02:00Z",
    "memoryVersion": 1,
    "personality": {
      "mbti": "INTJ",
      "gender": "male"
    }
  }
}
```

### 5.3 봇 상태 저장
```typescript
// Key: bot:state:{roomId}:{botId}
{
  "botId": -1,
  "roomId": "room_123",
  "status": "active",
  "personality": {
    "mbti": "INTJ",
    "gender": "male"
  },
  "currentAction": {
    "type": "moving",
    "target": "정글",
    "startedAt": "2024-01-20T12:00:30Z"
  },
  "stats": {
    "turnsAlive": 5,
    "itemsUsed": 2,
    "playersHelped": 1
  }
}
```

### 5.4 트리거 실행 기록
```typescript
// Key: bot:trigger:history:{roomId}:{botId}
// Type: List (최근 50개 유지)
{
  "triggerId": "trigger_2",
  "executedAt": "2024-01-20T12:01:30Z",
  "turnNumber": 5,
  "result": "success",
  "action": {
    "type": "chatMessage",
    "params": {
      "message": "저도 도와드릴게요!"
    }
  }
}
```

## 6. 구현 우선순위

1. **필수 기능** (1-2주)
   - 봇 생성 및 기본 행동
   - 시간 기반 트리거
   - 기본 LLM 통합

2. **핵심 기능** (2-3주)
   - 채팅/무전기 트리거
   - 모든 문서화된 액션 구현
   - 메모리 시스템

3. **고급 기능** (3-4주)
   - MBTI 기반 성격 시스템
   - 성능 최적화
   - 에러 복구

## 7. 봇 성격 시스템

### 7.1 MBTI 특성 키워드
```typescript
const mbtiTraits = {
  // 외향형 (E)
  'ENTJ': '리더십, 결단력, 전략적',
  'ENTP': '창의적, 논리적, 도전적',
  'ENFJ': '배려심, 협력적, 이타적',
  'ENFP': '열정적, 긍정적, 자유로운',
  'ESTJ': '체계적, 실용적, 책임감',
  'ESTP': '행동파, 현실적, 융통성',
  'ESFJ': '친화적, 협조적, 전통적',
  'ESFP': '즉흥적, 낙관적, 사교적',
  
  // 내향형 (I)
  'INTJ': '독립적, 분석적, 완벽주의',
  'INTP': '논리적, 객관적, 지적',
  'INFJ': '통찰력, 이상주의, 신중함',
  'INFP': '이해심, 개방적, 충실함',
  'ISTJ': '신뢰성, 체계적, 보수적',
  'ISTP': '실용적, 적응력, 논리적',
  'ISFJ': '보호적, 헌신적, 안정적',
  'ISFP': '온화함, 겸손함, 인내심'
}
```

### 7.2 성별에 따른 말투 가이드
```typescript
const speechPatterns = {
  male: {
    formal: "~입니다, ~하겠습니다",
    casual: "~야, ~지, ~어",
    exclamation: "이런!, 좋아!"
  },
  female: {
    formal: "~예요, ~할게요",
    casual: "~아/야, ~네, ~어요",
    exclamation: "어머!, 좋아요!"
  }
}
```

### 7.3 성격이 영향을 주는 요소
1. **말투**: MBTI + 성별에 따른 대화 스타일
2. **행동 선택 경향**: 
   - E형: 적극적 소통, 협력 선호
   - I형: 신중한 판단, 독립적 행동
   - T형: 논리적 선택, 효율성 중시
   - F형: 감정적 판단, 관계 중시

## 8. 테스트 계획

### 단위 테스트
- 각 서비스 메서드
- 트리거 조건 매칭
- 액션 검증 로직

### 통합 테스트
- 봇 생명주기
- LLM 통신
- Redis 연동

### E2E 테스트
- 전체 게임 플로우
- 다중 봇 시나리오
- 성능 부하 테스트

## 9. 모니터링 및 로깅

### 추적 항목
- LLM 호출 횟수/비용
- 봇 행동 성공률
- 트리거 실행 통계
- 에러 발생률

### 로그 레벨
- INFO: 봇 생성/제거, 주요 행동
- DEBUG: 트리거 체크, LLM 응답
- ERROR: 실행 실패, 예외 상황

## 10. 보안 고려사항

- LLM 프롬프트 인젝션 방지
- 봇 행동 제한 (rate limiting)
- API 키 안전한 관리
- 봇 식별 정보 보호

## 11. 환경변수 설정

### LLM 프로바이더 설정
봇 시스템은 다양한 LLM 프로바이더를 지원합니다. 환경변수로 원하는 프로바이더를 선택할 수 있습니다.

```bash
# LLM 프로바이더 선택 (ollama, openai, openrouter)
LLM_PROVIDER=ollama

# API 키 (OpenAI, OpenRouter에 필요)
LLM_API_KEY=your_api_key_here

# API URL (Ollama 또는 커스텀 엔드포인트)
LLM_API_URL=http://localhost:11434

# 모델 선택
# Ollama: llama2, mistral, codellama 등
# OpenAI: gpt-3.5-turbo, gpt-4
# OpenRouter: mistralai/mixtral-8x7b-instruct, meta-llama/llama-2-70b-chat 등
LLM_MODEL=llama2

# 온도 설정 (0.0 ~ 1.0, 기본값: 0.7)
LLM_TEMPERATURE=0.7

# 최대 토큰 수 (기본값: 1000)
LLM_MAX_TOKENS=1000
```

### 프로바이더별 설정 예시

#### Ollama (로컬 오픈소스 LLM)
```bash
LLM_PROVIDER=ollama
LLM_API_URL=http://localhost:11434
LLM_MODEL=llama2
```

#### OpenAI
```bash
LLM_PROVIDER=openai
LLM_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
LLM_MODEL=gpt-3.5-turbo
```

#### OpenRouter (다양한 오픈소스 모델)
```bash
LLM_PROVIDER=openrouter
LLM_API_KEY=your_openrouter_api_key
LLM_MODEL=mistralai/mixtral-8x7b-instruct
```

### 주의사항
- Ollama를 사용하려면 먼저 Ollama를 설치하고 원하는 모델을 pull해야 합니다
  ```bash
  ollama pull llama2
  ```
- OpenRouter 사용 시 모델명은 'provider/model' 형식을 따릅니다
- API 키는 절대 코드에 하드코딩하지 마세요
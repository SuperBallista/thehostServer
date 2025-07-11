# 봇 시스템 사용 가이드

## 개요
이 봇 시스템은 AI 기반의 게임 플레이어를 구현합니다. 각 봇은 MBTI 성격과 성별을 가지며, LLM을 통해 자율적으로 행동합니다.

## 주요 기능
- **자율적 의사결정**: LLM을 통한 상황 판단 및 행동 결정
- **성격 기반 행동**: MBTI와 성별에 따른 차별화된 행동 패턴
- **트리거 시스템**: 시간, 채팅, 무전기 기반 행동 트리거
- **메모리 시스템**: 게임 진행 상황 기억 및 학습

## 설치 및 설정

### 1. 환경 변수 설정
```bash
# .env 파일에 추가
OPENAI_API_KEY=your_openai_api_key
```

### 2. 의존성 설치
```bash
npm install openai zod ioredis
```

## 사용 방법

### 1. 방에 봇 추가
```typescript
const botConfig: BotConfig = {
  mbti: 'INTJ',
  gender: 'male',
  name: 'SmartBot_1'
};

const bot = await botService.createBot(roomId, botConfig);
```

### 2. 게임 시작 시 봇 초기화
```typescript
// GameService의 startGame 메서드에 추가
for (const player of players) {
  if (player.userId < 0) { // 봇인 경우
    await this.botService.initializeBotForGame(
      player.userId,
      gameId,
      player.playerId
    );
  }
}
```

### 3. 턴 처리
```typescript
// 턴 시작 시
await this.botService.handleTurnStart(gameId);

// 턴 종료 시
await this.botService.handleTurnEnd(gameId);
```

## 봇 성격 시스템

### MBTI 타입
- **E/I**: 외향/내향 - 소통 빈도와 스타일에 영향
- **S/N**: 감각/직관 - 정보 처리 방식에 영향
- **T/F**: 사고/감정 - 의사결정 기준에 영향
- **J/P**: 판단/인식 - 행동 패턴에 영향

### 성별
- 말투와 표현 방식에 영향
- 남성: 직설적, 간결한 표현
- 여성: 부드럽고 공감적인 표현

## 봇 행동 패턴

### 생존자 봇
- 안전한 지역으로 이동
- 의심스러운 플레이어 관찰
- 아이템 수집 및 공유
- 팀워크 중시

### 호스트 봇
- 정체 숨기기
- 전략적 감염
- 좀비 제어
- 거짓 정보 유포

### 좀비 봇
- 5턴마다 이동
- 호스트 명령 수행
- 생존자 추적

## 트리거 예시

### 시간 트리거
```json
{
  "type": "time",
  "condition": { "seconds": 45, "turnStart": true },
  "action": "decideMoveLocation"
}
```

### 채팅 트리거
```json
{
  "type": "chat",
  "condition": { "pattern": "도와|help", "sender": "any" },
  "action": "respondToHelp"
}
```

## 주의사항

1. **API 사용량**: LLM API 호출이 많으므로 비용 관리 필요
2. **응답 시간**: LLM 응답에 1-3초 소요될 수 있음
3. **에러 처리**: LLM 실패 시 기본 행동으로 폴백
4. **동시성**: 여러 봇이 동시에 작동할 때 성능 고려

## 디버깅

로그 레벨 설정:
```typescript
// 상세 로그 활성화
Logger.setLogLevels(['debug', 'log', 'error', 'warn']);
```

Redis에서 봇 상태 확인:
```bash
redis-cli
> GET bot:state:roomId:botId
> GET bot:triggers:gameId:botId
> GET bot:memory:gameId:botId
```

## 확장 가능성

1. **다양한 LLM 지원**: Claude, Gemini 등 추가 가능
2. **학습 시스템**: 게임 결과를 통한 봇 성능 개선
3. **난이도 조절**: 봇의 실력 레벨 설정
4. **커스텀 성격**: 더 다양한 성격 특성 추가
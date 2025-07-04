# The Host 게임 리팩토링 제안

## 1. GameService 분리 ✅ (완료)

### 달성한 결과
- **파일 크기**: 1088줄 → 476줄 (53% 감소!)
- **성공적으로 분리된 서비스**:
  - ItemHandlerService: 10종 아이템 처리 로직
  - CombatHandlerService: 백신, 산탄총 전투 로직
- **빌드 테스트**: 성공 ✅

### 분리 완료된 기능
1. **ItemHandlerService** ✅
   - handleGiveItem: 아이템 전달
   - handleSprayUse: 낙서스프레이
   - handleEraserUse: 지우개
   - handleVirusCheckerUse: 진단키트
   - handleMedicineUse: 응급치료제
   - handleVaccineMaterialUse: 백신 재료 조합
   - handleMicrophoneUse: 마이크 방송
   - handleWirelessUse: 무전기

2. **CombatHandlerService** ✅
   - handleVaccineUse: 백신 사용 및 승리 처리
   - handleShotgunUse: 산탄총으로 좀비 제거
   - updateAllPlayersSurvivorList: 생존자 리스트 업데이트
   - notifyHostOfZombieKill: 숙주 알림

3. **GameLifecycleService** ❌ (취소)
   - 현재 아키텍처와 호환성 문제로 보류
   - Game/GamePlayer 클래스 구조가 기존 설계와 상이함
   - 추후 전체 아키텍처 개편 시 재검토 필요

## 2. 프론트엔드 리팩토링 ✅ (진행중)

### Store 구조 개선
1. **gameStateStore.ts 분리** ✅ (완료)
   - **기존**: 378줄
   - **현재**: 262줄 (30% 감소!)
   - **성공적으로 분리된 스토어**:
     - `chatStore.ts` ✅ - 채팅/메시지 관련 상태 (69줄)
     - `hostStore.ts` ✅ - 숙주/좀비 관련 상태 (37줄)
     - `itemHistoryStore.ts` ✅ - 아이템 사용 기록 (23줄)
   - **하위 호환성 유지**: 기존 imports를 위한 re-export 제공

2. **itemObject.ts** 개선 ✅ (완료)
   - Strategy 패턴 적용
   - 새로운 파일 구조:
     - `ItemStrategy.ts`: 인터페이스 및 기본 클래스
     - `ItemService.ts`: 공통 서비스 로직
     - `strategies/`: 각 아이템별 구현 클래스
   - 하위 호환성 유지 (itemObjectRefactored.ts)
   - 4개 아이템 구현 완료 (Spray, VirusChecker, Vaccine, Eraser)

### 컴포넌트 구조 개선
1. **gameLayout.svelte** 분리
   - GameEndModal.svelte 분리
   - RoleMessageHandler.svelte 분리

## 3. 백엔드 추가 리팩토링

### Redis 관련
1. **RedisPubSubService** 분리
   - 게임 관련 PubSub
   - 로비 관련 PubSub
   - 채팅 관련 PubSub

### 타입 정의 개선
1. **game.types.ts** 분리
   - interfaces.ts - 인터페이스 정의
   - constants.ts - 상수 정의
   - classes.ts - 클래스 정의

## 4. 공통 개선사항

### 에러 처리
1. **커스텀 예외 클래스 생성**
```typescript
export class GameNotFoundException extends WsException {
  constructor(gameId: string) {
    super(`게임을 찾을 수 없습니다: ${gameId}`);
  }
}
```

2. **에러 코드 표준화**
```typescript
export enum GameErrorCode {
  GAME_NOT_FOUND = 'GAME_NOT_FOUND',
  PLAYER_NOT_FOUND = 'PLAYER_NOT_FOUND',
  INVALID_ITEM_USE = 'INVALID_ITEM_USE',
  // ...
}
```

### 로깅 개선
1. **구조화된 로깅**
```typescript
private readonly logger = new Logger(GameService.name);

this.logger.log({
  action: 'GAME_START',
  gameId,
  playerCount,
  timestamp: new Date()
});
```

### 테스트 추가
1. **단위 테스트**
   - 각 서비스별 테스트 파일 생성
   - Mock 객체 활용

2. **통합 테스트**
   - WebSocket 연결 테스트
   - 게임 플로우 테스트

## 5. 성능 최적화

### 캐싱 전략
1. **플레이어 데이터 캐싱**
   - 자주 조회되는 데이터 메모리 캐싱
   - TTL 설정으로 일관성 유지

2. **게임 상태 캐싱**
   - 턴 정보, 생존자 목록 등

### 쿼리 최적화
1. **배치 처리**
   - 여러 플레이어 업데이트 시 배치 처리
   - Redis Pipeline 활용

## 6. 보안 강화

### 입력 검증
1. **DTO 활용**
```typescript
export class UseItemDto {
  @IsEnum(ItemInterface)
  item: ItemInterface;

  @IsOptional()
  @IsNumber()
  targetPlayer?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  content?: string;
}
```

2. **권한 검증 미들웨어**
   - 플레이어 권한 검증
   - 게임 상태별 액션 검증

## 우선순위

1. **긴급** ✅
   - GameService 분리 완료 ✅
   - 에러 처리 표준화

2. **중요** (진행중)
   - 프론트엔드 Store 분리 ✅ (gameStateStore 완료)
   - 테스트 코드 추가 ❌ (작성되지 않음)

3. **개선**
   - 성능 최적화
   - 보안 강화

## 완료된 작업

### 백엔드
1. ✅ GameService (1088줄 → 476줄)
   - ItemHandlerService 분리 (383줄)
   - CombatHandlerService 분리 (154줄)

### 프론트엔드
1. ✅ gameStateStore.ts (378줄 → 262줄)
   - chatStore.ts 분리 (69줄)
   - hostStore.ts 분리 (37줄)
   - itemHistoryStore.ts 분리 (23줄)

2. ✅ itemObject.ts Strategy 패턴 리팩토링 (완료)
   - ItemStrategy 인터페이스 및 BaseItemStrategy 클래스
   - ItemFactory로 아이템 생성 관리
   - ItemService로 공통 로직 분리
   - 모든 11개 아이템 구현 완료
   - 하위 호환성 유지 (itemObjectRefactored.ts)

## 다음 단계

1. 컴포넌트 구조 개선 (gameLayout.svelte 분리)
2. 에러 처리 표준화
3. 테스트 코드 추가
4. 기존 itemObject.ts 제거 및 마이그레이션 완료
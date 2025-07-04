# 리팩토링 테스트 체크리스트

## 1. 빌드 테스트 ✅
```bash
npm run build
cd Frontend && npm run build
```

## 2. 기본 동작 테스트 (우선순위 높음)

### 백엔드 시작
```bash
npm start
```

### 프론트엔드 시작
```bash
cd Frontend && npm run dev
```

### 필수 테스트 시나리오

#### 1단계: 기본 흐름
- [ ] 로그인
- [ ] 방 생성
- [ ] 방 참가 (다른 브라우저에서)
- [ ] 게임 시작 (3명 이상)
- [ ] 첫 턴 아이템 지급 확인

#### 2단계: 아이템 사용 테스트 (리팩토링된 부분)
- [ ] 마이크 사용 → 전체 메시지 확인
- [ ] 진단키트 사용 → 감염 여부 확인
- [ ] 응급치료제 사용
- [ ] 백신 재료 조합 (A+B+C)
- [ ] 무전기 사용
- [ ] 낙서 스프레이 사용
- [ ] 지우개 사용

#### 3단계: 전투 아이템 테스트
- [ ] 산탄총으로 좀비 제거
- [ ] 백신으로 숙주에게 투여 → 게임 승리

### 주요 확인 사항
1. **콘솔 에러 체크**
   - 브라우저 개발자 도구에서 에러 확인
   - 백엔드 터미널에서 에러 확인

2. **Store 동작 확인**
   - gameStateStore 분리 후 정상 동작
   - 채팅 메시지 정상 표시
   - 아이템 사용 기록 확인

3. **아이템 Strategy 패턴**
   - 아이템 아이콘 정상 표시
   - 아이템 사용 모달 정상 동작

## 3. 간단한 테스트 코드 (선택사항)

게임 시작 시 테스트용 아이템 지급:
```typescript
// src/socket/game/gameTurn.service.ts의 onTurnStart에 추가
if (currentTurn === 1) {
  // 테스트: 첫 번째 플레이어에게 백신 재료 전부 지급
  const testPlayer = players[0];
  if (testPlayer) {
    testPlayer.items = ['vaccineMaterialA', 'vaccineMaterialB', 'vaccineMaterialC'];
    await this.redisService.stringifyAndSet(
      `game:${gameId}:player:${testPlayer.playerId}`, 
      testPlayer
    );
  }
  
  // 테스트: 두 번째 플레이어에게 진단키트, 산탄총
  const testPlayer2 = players[1];
  if (testPlayer2) {
    testPlayer2.items = ['virusChecker', 'shotgun'];
    await this.redisService.stringifyAndSet(
      `game:${gameId}:player:${testPlayer2.playerId}`, 
      testPlayer2
    );
  }
}
```

## 4. 리팩토링 전후 비교

### 확인할 파일들
- `game.service.ts`: 476줄 (기존 1088줄)
- `item-handler.service.ts`: 383줄 (신규)
- `combat-handler.service.ts`: 154줄 (신규)
- `gameStateStore.ts`: 262줄 (기존 378줄)
- `itemObjectRefactored.ts`: Strategy 패턴 적용

### 성능 체감
- 파일 로딩 속도
- 코드 가독성
- 수정 용이성

## 5. 롤백 계획

문제 발생 시:
```bash
git stash  # 현재 변경사항 임시 저장
git checkout HEAD~1  # 이전 커밋으로 롤백
```

또는 특정 커밋으로:
```bash
git log --oneline -10  # 최근 커밋 확인
git checkout [커밋해시]  # 특정 커밋으로 이동
```
import { GameContext } from '../interfaces/bot.interface';

/**
 * 채팅 결정 프롬프트
 */
export const getChatDecisionPrompt = (context: GameContext): string => {
  return `현재 게임 상황:
- 턴: ${context.currentTurn}
- 위치: ${context.currentRegion}
- 역할: ${context.role}
- 보유 아이템: ${context.currentItems.join(', ') || '없음'}
- 같은 구역 플레이어: ${context.playersInRegion.join(', ') || '없음'}
- 도망 가능: ${context.canEscape ? '가능' : '불가능'}

이전 턴 요약: ${context.previousTurnSummary}

최근 채팅:
${context.currentTurnChats.slice(-3).map(c => `${c.sender}: ${c.message}`).join('\n')}

현재 상황을 분석하여 채팅을 할지 결정하세요. 당신은 8-12초마다 이 결정을 내려야 합니다.


JSON 형식으로 응답하세요:
{
  "shouldChat": true/false,
  "message": "채팅 메시지 (shouldChat이 true일 때만)",
  "additionalAction": {
    "action": "추가 행동명",
    "params": { "필요한 파라미터들" }
  },
  "reasoning": "결정 이유 (선택사항)"
}

가능한 추가 행동: myStatus.next, myStatus.act, useItem, giveItem${context.role === 'host' ? ', hostAct.infect, hostAct.zombieList' : ''}

기본 행동:
- myStatus.next: { "location": "해안" } (구역 이동: 해안, 폐건물, 정글, 동굴, 산 정상, 개울)
- myStatus.act: { "action": "hide" } (좀비 대처: hide, lure, runaway - runaway는 1회만 가능)
- giveItem: { "receiver": "동물닉네임", "item": "응급치료제" } (아이템 전달)

${context.role === 'host' ? `숙주 전용 행동:
- hostAct.infect: { "target": "동물닉네임" } (감염시키기 - 턴당 1명)
- hostAct.zombieList: { "zombies": [{ "playerId": 플레이어ID, "targetId": 공격대상ID, "nextRegion": 다음이동지역번호 }] } (좀비 조종)` : ''}

아이템 이름은 반드시 한글로 사용하세요:
- 낙서스프레이, 진단키트, 응급치료제, 항바이러스혈청, 촉매정제물질, 신경억제단백질, 무전기, 지우개, 좀비사살용산탄총, 마이크, 백신
플레이어 이름은 동물 닉네임으로 사용하세요.

아이템별 사용법:
- 낙서스프레이: { "item": "낙서스프레이", "content": "낙서 내용" }
- 지우개: { "item": "지우개", "targetMessage": 0 } (메시지 번호)
- 진단키트: { "item": "진단키트" } (파라미터 없음)
- 응급치료제: { "item": "응급치료제" } (파라미터 없음)
- 백신: { "item": "백신", "target": "동물닉네임" }
- 좀비사살용산탄총: { "item": "좀비사살용산탄총", "target": "동물닉네임" }
- 무전기: { "item": "무전기", "target": "동물닉네임", "content": "메시지 내용" }
- 마이크: { "item": "마이크", "content": "방송 내용" }
- 백신재료(항바이러스혈청,촉매정제물질,신경억제단백질): { "item": "항바이러스혈청" } (3개 모두 있으면 자동 조합)

예시:
- myStatus.next: { "location": "해안" }
- myStatus.act: { "action": "hide" }
- useItem: { "item": "좀비사살용산탄총", "target": "말많은다람쥐" }
- giveItem: { "receiver": "말많은다람쥐", "item": "응급치료제" }${context.role === 'host' ? `
- hostAct.infect: { "target": "말많은다람쥐" }
- hostAct.zombieList: { "zombies": [{ "playerId": 3, "targetId": 5, "nextRegion": 2 }] }` : ''}`;
};

/**
 * 행동 결정 프롬프트
 */
export const getActionDecisionPrompt = (context: GameContext, trigger: any): string => {
  return `트리거 발동: ${trigger.metadata?.description || trigger.action}

현재 상황:
- 위치: ${context.currentRegion}
- 보유 아이템: ${context.currentItems.join(', ') || '없음'}
- 같은 구역 플레이어: ${context.playersInRegion.join(', ') || '없음'}

최근 채팅:
${context.currentTurnChats.slice(-5).map(c => `${c.sender}: ${c.message}`).join('\n')}

다음 형식으로 행동을 결정하세요:
{
  "action": "액션명",
  "params": {
    // 액션별 필요한 파라미터
  },
  "reasoning": "행동 이유 (선택사항)"
}

기본 행동:
- myStatus.next: { "location": "해안" } (구역 이동: 해안, 폐건물, 정글, 동굴, 산 정상, 개울)
- myStatus.act: { "action": "hide" } (좀비 대처: hide, lure, runaway - runaway는 1회만 가능)
- giveItem: { "receiver": "동물닉네임", "item": "응급치료제" } (아이템 전달)
- chatMessage: { "message": "안녕하세요!" }

숙주 전용 행동:
- hostAct.infect: { "target": "동물닉네임" } (감염시키기 - 턴당 1명)
- hostAct.zombieList: { "zombies": [{ "playerId": 플레이어ID, "targetId": 공격대상ID, "nextRegion": 다음이동지역번호 }] } (좀비 조종)

아이템 이름은 반드시 한글로 사용하세요:
- 낙서스프레이, 진단키트, 응급치료제, 항바이러스혈청, 촉매정제물질, 신경억제단백질, 무전기, 지우개, 좀비사살용산탄총, 마이크, 백신
플레이어 이름은 동물 닉네임으로 사용하세요.

아이템별 사용법:
- 낙서스프레이: { "item": "낙서스프레이", "content": "낙서 내용" }
- 지우개: { "item": "지우개", "targetMessage": 0 } (메시지 번호)
- 진단키트: { "item": "진단키트" } (파라미터 없음)
- 응급치료제: { "item": "응급치료제" } (파라미터 없음)
- 백신: { "item": "백신", "target": "동물닉네임" }
- 좀비사살용산탄총: { "item": "좀비사살용산탄총", "target": "동물닉네임" }
- 무전기: { "item": "무전기", "target": "동물닉네임", "content": "메시지 내용" }
- 마이크: { "item": "마이크", "content": "방송 내용" }
- 백신재료(항바이러스혈청,촉매정제물질,신경억제단백질): { "item": "항바이러스혈청" } (3개 모두 있으면 자동 조합)

예시:
- myStatus.next: { "location": "해안" }
- myStatus.act: { "action": "hide" }
- useItem: { "item": "좀비사살용산탄총", "target": "말많은다람쥐" }
- giveItem: { "receiver": "말많은다람쥐", "item": "응급치료제" }
- hostAct.infect: { "target": "말많은다람쥐" }
- hostAct.zombieList: { "zombies": [{ "playerId": 3, "targetId": 5, "nextRegion": 2 }] }`;
};

/**
 * 턴 요약 프롬프트
 */
export const getTurnSummaryPrompt = (events: any[]): string => {
  return `다음 게임의 진행상황을 요약해주세요:

${events.map(e => `- ${e.message}`).join('\n')}

JSON 형식으로 응답하세요:
{
  "summary": "턴 요약",
  "keyEvents": ["중요한 사건들"],
  "relationships": {
    "플레이어명": "관계 상태"
  }
}

게임 상황에서 게임 목표 달성을 위해 기억할 필요가 있어 보이는 상황과 그 이유 위주로만 정리해주세요.`;
};

/**
 * 기본 채팅 결정 (LLM 실패 시 사용)
 */
export const getDefaultChatDecision = (context: GameContext): any => {
  const shouldChat = Math.random() < 0.3; // 30% 확률로 채팅
  
  if (!shouldChat) {
    return {
      shouldChat: false,
      reasoning: '현재 상황에서 채팅할 필요가 없음',
    };
  }

  const defaultMessages = [
    '안녕하세요, 모두 안전하신가요?',
    '이곳은 어떤 것 같나요?',
    '혹시 뭔가 이상한 건 없나요?',
    '함께 행동하는 게 좋을 것 같아요.',
    '조심해서 움직여야겠어요.',
  ];

  return {
    shouldChat: true,
    message: defaultMessages[Math.floor(Math.random() * defaultMessages.length)],
    reasoning: '기본 소통 메시지',
  };
};

/**
 * 기본 행동 (LLM 실패 시 사용)
 */
export const getDefaultAction = (context: GameContext): any => {
  return {
    action: 'myStatus.act',
    params: { action: 'hide' },
    reasoning: '안전을 위해 숨기',
  };
};
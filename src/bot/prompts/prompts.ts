import { GameContext } from '../interfaces/bot.interface';


/**
 * 채팅 결정 프롬프트
 */
export const getChatDecisionPrompt = (context: GameContext): string => {
  return `⚠️⚠️⚠️ 매우 중요: 
- 모든 응답은 한글로 작성하세요
- 아이템명은 반드시 한글로: "자가진단키트", "낙서스프레이", "응급치료제" 등

현재 게임 상황:
- 턴: ${context.currentTurn}
- 위치: ${context.currentRegion}
- 역할: ${context.role}
- 보유 아이템: ${context.currentItems.join(', ') || '없음'}
- 같은 구역 플레이어: ${context.playersInRegion.join(', ') || '없음'}
- 도주 가능: ${context.canEscape ? '가능' : '불가능'}${context.zombieList && context.zombieList.length > 0 ? `
- 좀비 현황: ${context.zombieList.map(z => `${z.nickname}(${z.location})`).join(', ')}` : ''}

이전 턴 요약: ${context.previousTurnSummary}

최근 채팅:
${context.currentTurnChats.slice(-3).map(c => `${c.sender}: ${c.message}`).join('\n')}

무전 메시지:
${context.wirelessMessages && context.wirelessMessages.length > 0 
  ? context.wirelessMessages.slice(-3).map(m => `턴 ${m.turn} - ${m.sender}: ${m.message}`).join('\n')
  : '없음'}

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

⚠️ 중요: action은 반드시 정확한 형식으로 작성하세요!
❌ 잘못된 예: "myStatus", "hostAct"
✅ 올바른 예: "myStatus.next", "myStatus.act", "hostAct.infect"

가능한 추가 행동: myStatus.next, myStatus.act, useItem, giveItem${context.role === 'host' ? ', hostAct.infect, hostAct.zombieList' : ''}

중요: useItem과 giveItem은 현재 보유한 아이템만 사용 가능합니다!
현재 보유 아이템: ${context.currentItems.join(', ') || '없음'}

기본 행동:
- myStatus.next: { "location": "[구역명]" } (구역 이동: 해안, 폐건물, 정글, 동굴, 산 정상, 개울 중 선택)
- myStatus.act: { "action": "숨기" } (좀비 대처: 숨기, 유인, 도주 - 도주는 도주 가능이 true일 때만 가능)
- giveItem: { "receiver": "동물닉네임", "item": "응급치료제" } (보유한 아이템만 전달 가능)

${context.role === 'host' ? `숙주 전용 행동:
- hostAct.infect: { "target": "동물닉네임" } (감염시키기 - 턴당 1명)
- hostAct.zombieList: { "zombies": [{ "zombie": "좀비동물닉네임", "target": "공격대상동물닉네임", "nextRegion": "이동할구역명" }] } (좀비 조종)` : ''}

- 한글 아이템명: 낙서스프레이, 자가진단키트, 응급치료제, 항바이러스혈청, 촉매정제물질, 신경억제단백질, 무전기, 지우개, 좀비사살용산탄총, 마이크, 백신
플레이어 이름은 동물 닉네임으로 사용하세요.

아이템별 사용법 (보유한 아이템만 사용 가능):
- 낙서스프레이: useItem { "item": "낙서스프레이", "content": "내용" }
- 지우개: useItem { "item": "지우개", "targetMessage": 0 } (메시지 배열 번호)
- 자가진단키트: useItem { "item": "자가진단키트" } (파라미터 없음)
- 응급치료제: useItem { "item": "응급치료제" } (파라미터 없음)
- 백신: useItem { "item": "백신", "target": "동물닉네임" }
- 좀비사살용산탄총: useItem { "item": "좀비사살용산탄총", "target": "동물닉네임" }
- 무전기: useItem { "item": "무전기", "target": "동물닉네임", "content": "메시지 내용" }
- 마이크: useItem { "item": "마이크", "content": "메시지 내용" }
- 백신재료(항바이러스혈청,촉매정제물질,신경억제단백질): useItem { "item": "항바이러스혈청" } (파라미터 없고 3가지 모두 보유시 사용가능)

올바른 액션 예시:
{
  "additionalAction": {
    "action": "myStatus.next",  // ✅ 올바른 형식
    "params": { "location": "정글" }
  }
}

{
  "additionalAction": {
    "action": "myStatus.act",  // ✅ 올바른 형식
    "params": { "action": "숨기" }
  }
}

{
  "additionalAction": {
    "action": "giveItem",
    "params": { "receiver": "말많은다람쥐", "item": "응급치료제" }
  }
}

❌ 잘못된 예시:
{
  "additionalAction": {
    "action": "myStatus",  // ❌ 잘못됨! myStatus.next 또는 myStatus.act여야 함
    "params": { "location": "동굴" }
  }
}`;
};


/**
 * 턴 요약 프롬프트
 */
export const getTurnSummaryPrompt = (events: any[]): string => {
  return `다음 숙주 추리 게임의 진행상황을 요약해주세요:

${events.map(e => `- ${e.message}`).join('\n')}

【요약 가이드라인】
- 이 요약은 다음 턴에서 전략적 행동과 추리에 활용됩니다
- 플레이어들의 발언, 위치 이동, 아이템 사용 등 중요한 정보만 간략히 정리
- 의심스러운 행동이나 추리에 도움이 될 만한 단서 위주로 기록
- 1-3문장으로 간결하게 작성

예시: "2턴에서 A가 정글로 이동했고, B가 마이크로 전체 방송을 했다. C는 응급치료제를 사용했는데 이는 감염 치료 목적일 수 있다."

간결하고 핵심적인 내용만 포함하여 요약하세요:`;
};

/**
 * 기본 채팅 결정 (LLM 실패 시 사용)
 */
export const getDefaultChatDecision = (context: GameContext): { shouldChat: boolean; message?: string; reasoning: string } => {
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
export const getDefaultAction = (context: GameContext): { action: string; params: Record<string, string>; reasoning: string } => {
  // 좀비가 없는 초반 턴에는 이동, 좀비가 있으면 대응
  if (context.currentTurn < 5) {
    const locations = ['해안', '폐건물', '정글', '동굴', '산 정상', '개울'];
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];
    return {
      action: 'myStatus.next',
      params: { location: randomLocation },
      reasoning: '게임 초반 탐색',
    };
  }
  
  return {
    action: 'myStatus.act',
    params: { action: '숨기' },
    reasoning: '안전을 위해 숨기',
  };
};
import { GameContext } from '../interfaces/bot.interface';

/**
 * 트리거 생성 프롬프트
 */
export const getTriggerGenerationPrompt = (context: GameContext): string => {
  return `현재 게임 상황:
- 턴: ${context.currentTurn}
- 위치: ${context.currentRegion}
- 역할: ${context.role}
- 보유 아이템: ${context.currentItems.join(', ') || '없음'}
- 같은 구역 플레이어: ${context.playersInRegion.join(', ') || '없음'}
- 도망 가능: ${context.canEscape ? '가능' : '불가능'}

이전 턴 요약: ${context.previousTurnSummary}

최대 5개의 트리거를 JSON 형식으로 생성하세요. 각 트리거는 다음 형식을 따라야 합니다:
{
  "triggers": [
    {
      "id": "trigger_1",
      "type": "time|chat|radio",
      "condition": {
        // time: { "seconds": 30, "turnStart": true }
        // chat: { "pattern": "도와|help", "sender": "any" }
        // radio: { "sender": "any" }
      },
      "priority": 1-5,
      "action": "액션명",
      "metadata": { "description": "설명" }
    }
  ]
}

가능한 액션: myStatus.next, myStatus.act, chatMessage, useItem, giveItem${context.role === 'host' ? ', hostAct.infect, hostAct.zombieList' : ''}`;
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

예시:
- myStatus.next: { "location": "해안" }
- myStatus.act: { "action": "hide" }
- chatMessage: { "message": "안녕하세요!" }
- useItem: { "item": "shotgun", "target": 3 }
- giveItem: { "target": "Player_2", "item": "medicine" }`;
};

/**
 * 턴 요약 프롬프트
 */
export const getTurnSummaryPrompt = (events: any[]): string => {
  return `다음 게임 이벤트들을 간단히 요약해주세요 (2-3문장):

${events.map(e => `- ${e.message}`).join('\n')}

중요한 정보만 포함하여 요약해주세요.`;
};

/**
 * 기본 트리거 (LLM 실패 시 사용)
 */
export const getDefaultTriggers = (context: GameContext): any[] => {
  return [
    {
      id: 'default_1',
      type: 'time',
      condition: { seconds: 45, turnStart: true },
      priority: 1,
      action: 'decideMoveLocation',
      metadata: { description: '이동 위치 결정' },
    },
    {
      id: 'default_2',
      type: 'chat',
      condition: { pattern: '도와|위험|좀비', sender: 'any' },
      priority: 2,
      action: 'respondToHelp',
      metadata: { description: '도움 요청 대응' },
    },
  ];
};

/**
 * 기본 행동 (LLM 실패 시 사용)
 */
export const getDefaultAction = (context: GameContext): any => {
  if (context.role === 'zombie') {
    return {
      action: 'wait',
      params: {},
      reasoning: '좀비는 5턴마다 행동',
    };
  }
  
  return {
    action: 'myStatus.act',
    params: { action: 'hide' },
    reasoning: '안전을 위해 숨기',
  };
};
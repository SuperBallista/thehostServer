import { GameContext } from '../interfaces/bot.interface';

/**
 * 채팅 결정 전용 프롬프트 생성
 */
export const buildChatOnlyPrompt = (context: GameContext): string => {
  const gameInfo = buildGameInfoSection(context);

  return `# 💬 채팅 메시지 생성

## 📊 현재 상황
${gameInfo}

## 🎭 성격 특성
**${context.personality.mbti} / ${context.personality.gender === 'male' ? '남성' : '여성'}**
${getMBTIChatStyle(context.personality.mbti)}

## 📝 응답 규칙
- **채팅할 경우**: 메시지 내용만 출력 (100자 이내, 반드시 한국어로 작성)
- **채팅하지 않을 경우**: \`###\`
- **아이템/지역명**: 반드시 한글 사용

현재 상황을 고려하여 자연스러운 채팅 메시지를 작성하거나 \`###\`를 응답하세요.`;
};

/**
 * 행동 판단 전용 프롬프트 생성
 */
export const buildActionOnlyPrompt = (context: GameContext): string => {
  const gameInfo = buildGameInfoSection(context);

  return `# 🎮 게임 행동 결정

## 📊 현재 상황
${gameInfo}

## 🎯 ${context.role === 'host' ? '숙주' : '생존자'} 전략
${context.role === 'host' ? getHostActionPriority() : getSurvivorActionPriority()}

## 🔧 사용 가능한 행동
${buildActionGuideSection(context)}

## 🎒 핵심 아이템
${buildItemGuideSection()}

**JSON 형식으로 최적의 행동을 결정하세요:**
\`\`\`json
{
  "action": "행동명",
  "params": {"파라미터": "값"},
  "reasoning": "결정 이유"
}
\`\`\``;
};

/**
 * 게임 정보 섹션 구성 (간소화)
 */
const buildGameInfoSection = (context: GameContext): string => {
  const zombieInfo =
    context.zombieList && context.zombieList.length > 0
      ? `**좀비 현황**: ${context.zombieList.map((z) => `${z.nickname}(${z.location})`).join(', ')}\n`
      : '';

  const recentChats =
    context.currentTurnChats.length > 0
      ? context.currentTurnChats
          .slice(-2)
          .map((c) => `${c.sender}: ${c.message}`)
          .join(' | ')
      : '없음';

  const wirelessInfo =
    context.wirelessMessages && context.wirelessMessages.length > 0
      ? `**무전**: ${context.wirelessMessages
          .slice(-2)
          .map((m) => `${m.sender}: ${m.message}`)
          .join(' | ')}\n`
      : '';

  return `**턴**: ${context.currentTurn} | **위치**: ${context.currentRegion} | **역할**: ${context.role === 'host' ? '숙주' : '생존자'} | **도주**: ${context.canEscape ? '가능' : '불가능'}

**보유 아이템**: ${context.currentItems.length > 0 ? context.currentItems.join(', ') : '없음'}

**같은 구역**: ${context.playersInRegion.join(', ') || '혼자'}

**전체 참여자**: ${context.allPlayers.join(', ')}

${zombieInfo}**이전 턴 요약**: ${context.previousTurnSummary}

**최근 채팅**: ${recentChats}

${wirelessInfo}`;
};

/**
 * 행동 가이드 섹션 구성 (간소화)
 */
const buildActionGuideSection = (context: GameContext): string => {
  const basicActions = `**기본 행동**
- \`myStatus.next\`: 이동 {"location": "해안|폐건물|정글|동굴|산 정상|개울"}
- \`myStatus.act\`: 좀비 대처 {"action": "숨기|유인|도주"}
- \`giveItem\`: 아이템 전달 {"receiver": "닉네임", "item": "아이템명"}
- \`useItem\`: 아이템 사용 {"item": "아이템명"}`;

  const roleActions =
    context.role === 'host'
      ? `**숙주 전용**
- \`hostAct.infect\`: 감염 {"target": "닉네임"}
- \`hostAct.zombieList\`: 좀비 조종 {"zombies": [{"zombie": "좀비닉네임", "target": "대상", "nextRegion": "구역"}]}`
      : `**생존자 핵심**
- 백신재료 수집: 항바이러스혈청 + 촉매정제물질 + 신경억제단백질
- 자가진단키트로 감염 검사 필수`;

  return `${basicActions}

${roleActions}`;
};

/**
 * 아이템 가이드 섹션 구성 (간소화)
 */
const buildItemGuideSection = (): string => {
  return `**백신재료**: 항바이러스혈청, 촉매정제물질, 신경억제단백질 (3개 모두 모으면 백신 제작)
**진단**: 자가진단키트 - 감염 확인 필수
**소통**: 무전기 - 은밀한 정보 교환
**기타**: 낙서스프레이, 지우개, 응급치료제, 마이크, 좀비사살용산탄총`;
};

/**
 * MBTI별 채팅 스타일 가이드
 */
const getMBTIChatStyle = (mbti: string): string => {
  const styles: Record<string, string> = {
    INTJ: '• 논리적이고 간결한 표현\n• 전략적 사고를 드러내는 발언',
    INTP: '• 호기심 많은 질문\n• 분석적이고 탐구적인 태도',
    ENTJ: '• 리더십 있는 제안\n• 명확하고 직접적인 소통',
    ENTP: '• 창의적이고 유머러스한 표현\n• 활발한 소통과 아이디어 공유',
    INFJ: '• 공감적이고 배려하는 말투\n• 직관적 통찰 공유',
    INFP: '• 부드럽고 조심스러운 표현\n• 도덕적 관점에서의 의견',
    ENFJ: '• 따뜻하고 격려하는 말투\n• 팀워크와 협력 강조',
    ENFP: '• 열정적이고 긍정적인 표현\n• 감정이 풍부한 반응',
    ISTJ: '• 신중하고 사실적인 표현\n• 체계적인 정보 공유',
    ISFJ: '• 친근하고 도움을 주려는 말투\n• 안전을 걱정하는 표현',
    ESTJ: '• 실무적이고 효율적인 표현\n• 계획과 조직화 제안',
    ESFJ: '• 사교적이고 친화적인 말투\n• 분위기를 밝게 만드는 발언',
    ISTP: '• 간결하고 실용적인 표현\n• 필요시에만 발언',
    ISFP: '• 온화하고 겸손한 표현\n• 갈등을 피하는 평화로운 말투',
    ESTP: '• 활동적이고 즉흥적인 표현\n• 현재 상황에 집중',
    ESFP: '• 밝고 에너지 넘치는 표현\n• 감정을 솔직하게 표현',
  };

  return styles[mbti] || '• 상황에 맞는 자연스러운 대화';
};

/**
 * 숙주 행동 우선순위
 */
const getHostActionPriority = (): string => {
  return `1. **감염 최우선** - 백신재료 보유자 우선 타겟
2. **은밀성 유지** - 생존자처럼 행동
3. **좀비 활용** - 전략적 위치로 이동 지시
4. **정보 교란** - 거짓 정보 유포`;
};

/**
 * 생존자 행동 우선순위
 */
const getSurvivorActionPriority = (): string => {
  return `1. **백신재료 수집** - 3개 모두 확보 시 백신 제작
2. **감염 검사** - 자가진단키트로 정기 검사
3. **협력과 정보공유** - 신뢰할 수 있는 플레이어와 협력
4. **안전한 이동** - 좀비 회피`;
};

/**
 * 기존 함수 유지 (하위 호환성)
 */
export const getChatDecisionPrompt = buildChatOnlyPrompt;

/**
 * 턴 요약 프롬프트
 */
export const getTurnSummaryPrompt = (
  events: Array<{ message: string }>,
): string => {
  return `# 턴 요약 작성

이번 턴의 게임 이벤트를 분석하여 **개인 전략 메모**를 2-4문장으로 작성하세요.

**이번 턴 이벤트:**
${events.length > 0 ? events.map((e) => `- ${e.message}`).join('\n') : '- 특별한 이벤트가 없었습니다.'}

중요한 사건과 다음 턴 계획을 포함하여 간결하게 작성하세요.`;
};

/**
 * 기본 채팅 결정 (LLM 실패 시 사용)
 */
export const getDefaultChatDecision = (): {
  shouldChat: boolean;
  message?: string;
  reasoning: string;
} => {
  const shouldChat = Math.random() < 0.3;

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
    message:
      defaultMessages[Math.floor(Math.random() * defaultMessages.length)],
    reasoning: '기본 소통 메시지',
  };
};

/**
 * 기본 행동 (LLM 실패 시 사용)
 */
export const getDefaultAction = (
  context: GameContext,
): { action: string; params: Record<string, string>; reasoning: string } => {
  if (context.currentTurn < 5) {
    const locations = ['해안', '폐건물', '정글', '동굴', '산 정상', '개울'];
    const randomLocation =
      locations[Math.floor(Math.random() * locations.length)];
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

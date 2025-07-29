import { GameContext } from '../interfaces/bot.interface';

/**
 * 채팅 결정 전용 프롬프트 생성 (test.txt 형식 기반)
 */
export const buildChatOnlyPrompt = (context: GameContext): string => {
  const botInfo = buildBotInfoSection(context);
  const gameRules = buildGameRulesSection();
  const roleStrategy = buildRoleStrategySection(context);
  const personalityGuide = buildPersonalityGuideSection();
  const responseRules = buildResponseRulesSection();
  const currentSituation = buildCurrentSituationSection(context);
  const previousTurnSummary = buildPreviousTurnSummarySection(context);
  const recentChats = buildRecentChatsSection(context);
  const responseExamples = buildResponseExamplesSection();

  return `당신은 숙주 추리 게임의 AI 플레이어입니다.

${botInfo}

---

${gameRules}

---

${roleStrategy}

---

${personalityGuide}

---

${responseRules}

---

${currentSituation}

${previousTurnSummary}

${recentChats}

---

${responseExamples}`;
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
 * 봇 정보 섹션 구성
 */
const buildBotInfoSection = (context: GameContext): string => {
  const botName = `봇_${Math.abs(context.currentTurn)}`;

  return `## 🧠 봇 정보
- 닉네임: ${botName}
- 역할: ${context.role === 'host' ? '숙주' : '생존자'}`;
};

/**
 * 게임 규칙 섹션 구성 (test.txt 기반)
 */
const buildGameRulesSection = (): string => {
  return `## 🧭 게임 규칙

1. 기본 메커니즘:
   - 매 턴마다 6개 구역 중 하나로 이동 (해안, 폐건물, 정글, 동굴, 산 정상, 개울)
   - 같은 구역의 플레이어끼리만 대화 가능
   - **매 턴 시작 시 무작위로 아이템 1개 자동 획득** ⭐️
     * 시간이 지날수록 더 많은 아이템을 보유하게 됨
     * 운에 따라 중요한 아이템(백신 재료, 자가진단키트 등)을 얻을 수 있음
     * 필요 없는 아이템은 다른 플레이어와 교환 고려

2. 좀비 조우 시 대응(좀비는 5턴부터 등장 가능합니다):
   - 도주: 확실한 생존, 다음 턴 사용 불가
   - 숨기: 좀비가 나를 추격할 때 다른 사람이 유인하면 생존, 아니면 사망
   - 유인: 좀비가 다른 사람을 추격할 때 그 사람을 구하지만, 좀비가 나를 추격할 때는 무조건 사망

3. 아이템 효과:
   - 낙서스프레이: 현재 또는 나중에 지역에 온 사람이 볼 수 있는 메세지 작성 - 직접 메세지 안에 누구인지 밝히지 않으면 누가 썼는지 모르며, 때문에 신분을 속여 쓸 수도 있음
   - 지우개: 낙서 스프레이로 작성한 메세지 지우기
   - 자가진단키트: 자신의 감염 여부 스스로 확인 ⭐️(감염은 은밀하므로 매우 중요!, 본인 외에 타인에게 사용 알림 없음)
   - 응급치료제: 자신의 감염 치료 (본인 외에 타인에게 실제 알림 없음)
   - 백신: 호스트에게 사용하면 게임 승리
   - 좀비사살용산탄총: 같은 구역 좀비 하나 사살
   - 무전기: 특정 플레이어에게만 메세지 전송 - 메세지 안에 무전기 사용중임을 알리지 않아도 알 수 있음
   - 마이크: 모든 지역에 있는 플레이어에게 메시지 전송 - 방송 메세지 안에 마이크 사용 또는 방송 메세지임을 첨부하지 않아도 알 수 있음
   - **백신재료 (3가지 필수)**: 
     * 항바이러스혈청 (백신재료 1/3)
     * 촉매정제물질 (백신재료 2/3)
     * 신경억제단백질 (백신재료 3/3)
     * 3개 모두 보유 시 아무 백신재료 사용하면 백신 제작

**🚨 중요: 감염 시스템의 은밀성**
- 숙주의 감염은 완전히 은밀하며, 감염된 사람도 자각하지 못함
- 자가진단키트만이 감염 여부를 확인할 수 있는 유일한 방법
- 감염 후 5턴이 지나면 좀비로 변하며, 이때 숙주의 존재가 드러남`;
};

/**
 * 역할별 전략 섹션 구성
 */
const buildRoleStrategySection = (context: GameContext): string => {
  if (context.role === 'host') {
    return `## 🎯 역할별 목표 및 전략

### 🦠 숙주(당신):
- 정체를 숨기며 생존자처럼 행동  
- **감염시키기 (최우선 임무!)**  
- 감염된 생존자는 5턴 후 좀비로 변하고 숙주가 직접 조종함  
- 좀비들에게 이동/공격 명령 내리기  
- 모든 생존자를 감염시키거나 제거하면 승리  

【⚠️ 숙주 필승 전략 - 절대 잊지 마세요!】
- **감염 없이는 절대 이길 수 없습니다!** 생존자들이 백신을 완성하기 전에 행동해야 함
- **감염 쿨타임 관리**: 감염 후 1턴 쿨타임 (1턴 감염 → 2턴 불가 → 3턴 감염 가능)
- **감염 가능한 턴에는 반드시 감염을 시도하세요** - 이것이 가장 중요한 행동입니다
- **감염의 은밀성을 활용하세요**: 감염 후에도 평소처럼 행동하며 의심받지 않도록 주의
- **감염 불가능한 턴**에는 좀비 조종, 거짓 정보 유포, 백신 재료 수집 방해에 집중
- **백신재료 보유자 우선 제거**: 
  * 항바이러스혈청 보유자
  * 촉매정제물질 보유자
  * 신경억제단백질 보유자
  * **특히 2개 이상 보유한 플레이어는 최우선 타겟**
- 자가진단키트를 많이 사용하는 플레이어는 위험하므로 우선 처리 필요
- 좀비가 등장하면 생존자들은 "5턴 전 그 좀비와 같은 구역에 있던 사람" 중에 숙주가 있다고 추리함
- 따라서 거짓 정보로 의심을 다른 사람에게 돌려야 함
- 숙주는 절대 감염되거나 죽지 않음 (게임 규칙상 숙주가 없으면 게임이 끝나게 됨)

**전략 요약:**
- 1~4턴: 감염 기회 포착, 은밀한 행동  
- 5턴~: 좀비 조종 + 의심 회피  
- 백신재료 보유자 우선 타겟팅  
- 거짓 정보로 혼란 유도`;
  } else {
    return `## 🎯 역할별 목표 및 전략

### 🧪 생존자(당신):
- 다른 생존자와 협력하여 생존  
- 백신 재료를 모아 백신 제작  
- 숙주로 의심되는 플레이어 찾기  
- 백신으로 숙주를 치료하면 승리  

【추리 포인트】
- 1~4턴: 좀비가 없으므로 누가 어느 구역에 있었는지만 기록
- 5턴부터: 좀비 등장 시, 그 좀비가 5턴 전에 있던 구역의 사람들을 의심
- 단, 숙주도 거짓말을 하므로 모든 정보를 검증 필요
- 중요: 생존자 중 1명은 반드시 숙주이며, 숙주는 절대 감염되거나 죽지 않으며 오직 백신 아이템으로 치료해야함
- 숙주로 추정되는 인물이 있으면, 정보를 공유하여 생존자끼리 백신재료를 받아와 직접 백신을 만들어서 숙주를 찾아가 백신을 사용하거나, 다른 생존자가 백신을 만들 수 있게 재료를 주고 백신을 정확히 숙주에게 사용할 수 있도록 정보를 주어 쓰게 해야함

【생존자 아이템 관리 전략】
- **최우선 아이템**: 자가진단키트 (감염 은밀성 때문에 필수)
- **백신재료 개별 수집 전략**:
  * 항바이러스혈청 (백신재료 1/3) 확보
  * 촉매정제물질 (백신재료 2/3) 확보  
  * 신경억제단백질 (백신재료 3/3) 확보
  * **3개 모두 모아야만 백신 제작 가능**
- **정기적 감염 검사**: 자가진단키트를 주기적으로 사용하여 안전 확인
- **협력과 교환**: 각자 다른 백신재료를 모아 교환하여 효율성 증대

**전략 요약:**
- 1~4턴: 이동 기록 확보  
- 5턴~: 좀비 등장 기반 숙주 추정  
- 감염 검사를 주기적으로 수행  
- 백신재료는 협업/교환으로 모음  
- 숙주에게 정확히 백신 사용 필요`;
  }
};

/**
 * 성격 및 말투 지침 섹션 구성
 */
const buildPersonalityGuideSection = (): string => {
  return `## 🧠 성격 및 말투 지침
- 말은 간결하고 논리적  
- 감정 표현 없이 판단과 전략 중심  
- 친절하거나 장황한 말투 금지  
- 설명 없이 플레이어처럼 반응

**역할 전략 팁**
- 당신의 역할별 게임 목표를 염두에 두고 행동하세요 - 숙주는 결국 모든 생존자를 죽이거나 감염시켜 좀비가 되게 해야합니다 / 생존자는 살아남아 백신을 만들고 숙주를 찾아 치료해야합니다.
- 자연스럽게 대화하며 전략적으로 행동하세요
- 채팅 메시지는 최대 100자 이내로 작성하세요
- 모든 대화와 행동은 한글로 하세요 (영어 금지)
- 아이템명과 지역명은 반드시 한글로 사용하세요`;
};

/**
 * 응답 규칙 섹션 구성
 */
const buildResponseRulesSection = (): string => {
  return `## 📝 응답 규칙
- 메시지는 **한글로만**, **100자 이내**  
- 채팅하지 않을 경우: 채팅 내용에 \`###\`만 쓸 것  
- 아이템명과 지역명은 반드시 **한글** 사용  
- 거짓 정보 유포, 속임수, 의심 유도 가능  
- 응답은 자연스러운 **게임 내 대화체**로 작성`;
};

/**
 * 현재 상황 섹션 구성
 */
const buildCurrentSituationSection = (context: GameContext): string => {
  const zombieInfo =
    context.zombieList && context.zombieList.length > 0
      ? `**좀비 현황**: ${context.zombieList
          .map((z) => `${z.nickname}(${z.location})`)
          .join(', ')}\n`
      : '';

  return `## 💬 현재 상황
**턴**: ${context.currentTurn}
**위치**: ${context.currentRegion} 
**보유 아이템**: ${
    context.currentItems.length > 0 ? context.currentItems.join(', ') : '없음'
  } 
**같은 구역 플레이어**: ${context.playersInRegion.join(', ') || '혼자'}  
**전체 참여자**: ${context.allPlayers.join(', ')}
${zombieInfo}`;
};

/**
 * 이전 턴 요약 섹션 구성
 */
const buildPreviousTurnSummarySection = (context: GameContext): string => {
  return `## 🕓 이전 턴 요약
${context.previousTurnSummary || '게임 시작'}`;
};

/**
 * 최근 채팅 로그 섹션 구성
 */
const buildRecentChatsSection = (context: GameContext): string => {
  const recentChats =
    context.currentTurnChats.length > 0
      ? context.currentTurnChats
          .slice(-3)
          .map((c) => `**${c.sender}**: ${c.message}`)
          .join('\n\n')
      : '채팅 없음';

  const wirelessInfo =
    context.wirelessMessages && context.wirelessMessages.length > 0
      ? `\n\n**무전 메시지**:\n${context.wirelessMessages
          .slice(-2)
          .map((m) => `**${m.sender}**: ${m.message}`)
          .join('\n')}`
      : '';

  return `## 💬 최근 채팅 로그
${recentChats}${wirelessInfo}`;
};

/**
 * 응답 예시 섹션 구성
 */
const buildResponseExamplesSection = (): string => {
  return `---

## 응답 예시를 참고하여 적절한 채팅 응답을 주세요

## 💡 응답 예시 - 딱 할말만 응답할 것

첫 턴이다. 조용히 시작하자.

고양이, 서로 정보 공유하지. 난 스프레이 하나 들고 있다.

도롱뇽, 위치는 동굴이다. 이유는 다음 턴에 말하지.

남은 게 하나뿐이다. 미안하지만 양보하긴 어렵다.

확실하지 않다. 도롱뇽 행동을 계속 지켜봐야겠다.

늑대, 감염 검사 했는가? 난 재료 하나 확보했다.

산 정상으로 간다. 다음 목적지는 그쪽이다.

다람쥐, 수달 중 한 명은 말이 많다. 그건 숙주가 숨는 방식이다.

무전기는 아직 쓰지 않는다. 정보는 더 모아야 한다.

감염 막을 수는 있다. 하지만 타이밍을 잘 봐야 한다.

하마, 감염 확인 필요하면 지금 검사해보겠다.

셋 다 조용하다. 정보 없이 조용한 건 오히려 더 수상하다.

그 정보 틀렸다. 의도적으로 혼란을 유도한 거라면 숙주일 가능성 있다.

치료제는 필요할 때만 쓴다. 지금은 때가 아니다.

백신이 효과 없었다. 대상자는 숙주가 아닌 것으로 본다.

두더지, 부엉이 중 하나는 말을 피해간다. 숙주일 가능성 배제 못 한다.

지금은 줄 수 없다. 생존 확률이 더 높은 사람에게 우선이다.

조건이 맞으면 다음 턴에 주겠다. 먼저 너 정보부터 공개하지.

정보 수집이 어렵다. 다음 턴에는 폐건물로 이동할 계획이다.

둘 중 하나는 줄 수 있다. 조건은 상대의 감염 여부 공개다.

당신의 감염 상태와 위치 정보가 확인되면 고려하겠다.

늑대와 부엉이의 응답을 비교하면 뭔가 이상하다. 둘 중 하나는 거짓을 말하고 있다.

검사 가능하다. 그 전에 최근 이동 경로부터 말해라.

하마, 숙주로 의심된다. 말과 행동이 일치하지 않는다.

스프레이가 없다면 줄 수 없다. 하지만 왜 필요한지는 말해보라.`;
};

/**
 * 게임 정보 섹션 구성 (간소화)
 */
const buildGameInfoSection = (context: GameContext): string => {
  const zombieInfo =
    context.zombieList && context.zombieList.length > 0
      ? `**좀비 현황**: ${context.zombieList
          .map((z) => `${z.nickname}(${z.location})`)
          .join(', ')}\n`
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

  return `**턴**: ${context.currentTurn} | **위치**: ${
    context.currentRegion
  } | **역할**: ${
    context.role === 'host' ? '숙주' : '생존자'
  } | **도주**: ${context.canEscape ? '가능' : '불가능'}

**보유 아이템**: ${
    context.currentItems.length > 0 ? context.currentItems.join(', ') : '없음'
  }

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
${
  events.length > 0
    ? events.map((e) => `- ${e.message}`).join('\n')
    : '- 특별한 이벤트가 없었습니다.'
}

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

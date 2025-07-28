export interface BotConfig {
  mbti:
    | 'INTJ'
    | 'INTP'
    | 'ENTJ'
    | 'ENTP'
    | 'INFJ'
    | 'INFP'
    | 'ENFJ'
    | 'ENFP'
    | 'ISTJ'
    | 'ISFJ'
    | 'ESTJ'
    | 'ESFJ'
    | 'ISTP'
    | 'ISFP'
    | 'ESTP'
    | 'ESFP';
  gender: 'male' | 'female';
  name?: string;
}

export interface BotPlayer {
  botId: number; // Negative number
  roomId: string;
  config: BotConfig;
  status: 'active' | 'inactive';
  currentAction?: BotAction;
  stats: BotStats;
}

export interface BotStats {
  turnsAlive: number;
  itemsUsed: number;
  playersHelped: number;
}

export interface BotAction {
  type: string;
  params: Record<string, unknown>;
  startedAt: Date;
}

export interface BotState {
  botId: number;
  roomId: string;
  personality: {
    mbti: string;
    gender: string;
  };
  currentAction?: BotAction;
  status: 'active' | 'inactive';
  stats: BotStats;
}

export interface GameContext {
  // 이전 턴 요약
  previousTurnSummary: string;
  // 현재 턴 채팅 내용
  currentTurnChats: Array<{
    sender: string;
    message: string;
    system: boolean;
  }>;
  // 무전 메시지
  wirelessMessages: Array<{
    sender: string;
    message: string;
    turn: number;
  }>;
  // 현재 턴 봇의 보유 아이템
  currentItems: string[];
  // 현재 턴 같은 구역의 생존자 정보
  playersInRegion: string[];
  // 전체 게임 참여자 정보 (생존자, 숙주, 좀비 포함)
  allPlayers: string[];
  // 턴 정보
  currentTurn: number;
  // 구역 낙서
  regionGraffiti: string[];
  // 도망 가능 여부
  canEscape: boolean;
  // 봇의 역할
  role: 'survivor' | 'host' | 'zombie';
  // 현재 위치
  currentRegion: string;
  // 봇 성격
  personality: {
    mbti: string;
    gender: string;
  };
  // 봇의 플레이어 ID (동물 닉네임 결정용)
  botPlayerId?: number;
  // 좀비 리스트 (호스트 전용, 닉네임 형식)
  zombieList?: Array<{
    nickname: string;
    location: string;
  }>;
}

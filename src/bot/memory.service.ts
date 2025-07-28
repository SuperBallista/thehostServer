import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

interface BotMemory {
  shortTerm: {
    currentTurn: number;
    location: string;
    items: string[];
    canEscape: boolean;
    role: string;
    gameInfo?: {
      startTime: string;
      participants: string[];
    };
    recentChats: Array<{
      sender: string;
      message: string;
      timestamp: string;
    }>;
    recentActions: Array<{
      action: string;
      timestamp: string;
    }>;
    graffiti: string[];
    playersInRegion: string[];
    wirelessMessages: Array<{
      sender: string;
      message: string;
      timestamp: string;
      turn: number;
    }>;
  };
  longTerm: {
    turnSummaries: Array<{
      turn: number;
      summary: string;
    }>;
    suspicions: Record<string, number>; // 플레이어별 호스트 의심도
    gameResults: Array<{
      endTime: string;
      result: string;
    }>;
  };
}

interface ShortTermMemory {
  currentTurn: number;
  location: string;
  items: string[];
  canEscape: boolean;
  role: string;
  gameInfo?: {
    startTime: string;
    participants: string[];
  };
  recentChats: Array<{
    sender: string;
    message: string;
    timestamp: string;
  }>;
  recentActions: Array<{
    action: string;
    timestamp: string;
  }>;
  graffiti: string[];
  playersInRegion: string[];
  wirelessMessages: Array<{
    sender: string;
    message: string;
    timestamp: string;
    turn: number;
  }>;
}

interface LongTermMemory {
  turnSummaries: Array<{
    turn: number;
    summary: string;
  }>;
  suspicions: Record<string, number>;
  gameResults: Array<{
    endTime: string;
    result: string;
  }>;
}

interface GameEvent {
  type: string;
  message: string;
  timestamp: Date;
  data?: Record<string, unknown>;
}

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);
  private currentTurnEvents: Map<string, GameEvent[]> = new Map();

  constructor(private readonly redisService: RedisService) {}

  /**
   * 초기 메모리 생성
   */
  async initializeMemory(gameId: string, botId: number): Promise<void> {
    const memory: BotMemory = {
      shortTerm: {
        currentTurn: 1,
        location: '',
        items: [],
        canEscape: false,
        role: '',
        recentChats: [],
        recentActions: [],
        graffiti: [],
        playersInRegion: [],
        wirelessMessages: [],
      },
      longTerm: {
        turnSummaries: [],
        suspicions: {},
        gameResults: [],
      },
    };

    await this.saveMemory(gameId, botId, memory);
  }

  /**
   * 봇 메모리 조회
   */
  async getMemory(gameId: string, botId: number): Promise<BotMemory | null> {
    const key = `bot:memory:${gameId}:${botId}`;
    return (await this.redisService.getAndParse(key)) as BotMemory | null;
  }

  /**
   * 단기 메모리 업데이트
   */
  async updateShortTermMemory(
    gameId: string,
    botId: number,
    updates: Partial<ShortTermMemory>,
  ): Promise<void> {
    const memory = await this.getMemory(gameId, botId);
    if (memory) {
      Object.assign(memory.shortTerm, updates);
      await this.saveMemory(gameId, botId, memory);
    }
  }

  /**
   * 장기 메모리 업데이트
   */
  async updateLongTermMemory(
    gameId: string,
    botId: number,
    updates: Partial<LongTermMemory>,
  ): Promise<void> {
    const memory = await this.getMemory(gameId, botId);
    if (memory) {
      Object.assign(memory.longTerm, updates);
      await this.saveMemory(gameId, botId, memory);
    }
  }

  /**
   * 메모리 저장
   */
  private async saveMemory(
    gameId: string,
    botId: number,
    memory: BotMemory,
  ): Promise<void> {
    const key = `bot:memory:${gameId}:${botId}`;
    const ttl = 24 * 60 * 60; // 24시간
    await this.redisService.stringifyAndSet(key, memory, ttl);
  }

  /**
   * 이벤트 기반 메모리 업데이트
   */
  async updateMemoryFromEvent(
    gameId: string,
    botId: number,
    event: GameEvent,
  ): Promise<void> {
    // 이벤트 타입에 따른 처리
    switch (event.type) {
      case 'game_start':
        await this.handleGameStartEvent(gameId, botId, event);
        break;
      case 'turn_start':
        await this.handleTurnStartEvent(gameId, botId, event);
        break;
      case 'action':
        await this.handleActionEvent(gameId, botId, event);
        break;
      case 'chat':
        await this.handleChatEvent(gameId, botId, event);
        break;
      case 'game_end':
        await this.handleGameEndEvent(gameId, botId, event);
        break;
    }

    // 현재 턴 이벤트에 추가
    const key = `${gameId}:${botId}`;
    if (!this.currentTurnEvents.has(key)) {
      this.currentTurnEvents.set(key, []);
    }
    this.currentTurnEvents.get(key)!.push(event);
  }

  /**
   * 게임 시작 이벤트 처리
   */
  private async handleGameStartEvent(
    gameId: string,
    botId: number,
    event: GameEvent,
  ): Promise<void> {
    const memory = await this.getMemory(gameId, botId);
    if (!memory) {
      await this.initializeMemory(gameId, botId);
    }
    // 게임 정보 업데이트
    const gameInfo = {
      startTime: event.timestamp.toISOString(),
      participants: [], // 실제 참가자 정보로 업데이트 필요
    };
    await this.updateShortTermMemory(gameId, botId, { gameInfo });
  }

  /**
   * 턴 시작 이벤트 처리
   */
  private async handleTurnStartEvent(
    gameId: string,
    botId: number,
    event: GameEvent,
  ): Promise<void> {
    // 이전 턴 이벤트 정리
    this.clearTurnEvents(gameId, botId);

    // 새 턴 정보 업데이트
    const turnNumber = (event.data?.turnNumber as number) || 1;
    await this.updateShortTermMemory(gameId, botId, {
      currentTurn: turnNumber,
    });
  }

  /**
   * 액션 이벤트 처리
   */
  private async handleActionEvent(
    gameId: string,
    botId: number,
    event: GameEvent,
  ): Promise<void> {
    const memory = await this.getMemory(gameId, botId);
    if (memory?.shortTerm?.recentActions) {
      // 최근 액션에 추가
      memory.shortTerm.recentActions.push({
        action: event.message,
        timestamp: event.timestamp.toISOString(),
      });

      // 최대 10개 액션만 유지
      if (memory.shortTerm.recentActions.length > 10) {
        memory.shortTerm.recentActions =
          memory.shortTerm.recentActions.slice(-10);
      }

      await this.saveMemory(gameId, botId, memory);
    }
  }

  /**
   * 채팅 이벤트 처리
   */
  private async handleChatEvent(
    gameId: string,
    botId: number,
    event: GameEvent,
  ): Promise<void> {
    if (event.type === 'chat') {
      const memory = await this.getMemory(gameId, botId);
      if (memory) {
        const playerId = event.data?.playerId as number | undefined;
        const sender = playerId ? `Player${playerId}` : 'System';

        memory.shortTerm.recentChats.push({
          sender: sender,
          message: event.message,
          timestamp: event.timestamp.toISOString(),
        });

        // 최대 20개 채팅만 유지
        if (memory.shortTerm.recentChats.length > 20) {
          memory.shortTerm.recentChats =
            memory.shortTerm.recentChats.slice(-20);
        }

        await this.saveMemory(gameId, botId, memory);
      }
    }
  }

  /**
   * 게임 종료 이벤트 처리
   */
  private async handleGameEndEvent(
    gameId: string,
    botId: number,
    event: GameEvent,
  ): Promise<void> {
    // 게임 결과를 장기 메모리에 저장
    const gameResult = {
      endTime: event.timestamp.toISOString(),
      result: event.message,
    };
    await this.updateLongTermMemory(gameId, botId, {
      gameResults: [gameResult],
    });
  }

  /**
   * 현재 턴 이벤트 조회
   */
  getCurrentTurnEvents(gameId: string, botId: number): GameEvent[] {
    const key = `${gameId}:${botId}`;
    return this.currentTurnEvents.get(key) || [];
  }

  /**
   * 턴 종료 시 이벤트 정리
   */
  clearTurnEvents(gameId: string, botId: number): void {
    const key = `${gameId}:${botId}`;
    this.currentTurnEvents.delete(key);
  }

  /**
   * 메모리 삭제
   */
  async deleteMemory(gameId: string, botId: number): Promise<void> {
    const key = `bot:memory:${gameId}:${botId}`;
    await this.redisService.del(key);

    // 현재 턴 이벤트도 정리
    this.clearTurnEvents(gameId, botId);
  }

  /**
   * 봇 메모리 정리 (호환성을 위한 별칭)
   */
  async clearMemory(botId: number): Promise<void> {
    // 모든 게임에서 해당 봇의 메모리를 찾아서 삭제
    const pattern = `bot:memory:*:${botId}`;
    const keys = await this.redisService.scanKeys(pattern);

    for (const key of keys) {
      await this.redisService.del(key);
    }

    // 현재 턴 이벤트도 정리
    for (const eventKey of this.currentTurnEvents.keys()) {
      if (eventKey.endsWith(`:${botId}`)) {
        this.currentTurnEvents.delete(eventKey);
      }
    }
  }

  /**
   * 이전 턴 요약 조회
   */
  async getPreviousTurnSummary(
    gameId: string,
    botId: number,
  ): Promise<string | null> {
    const memory = await this.getMemory(gameId, botId);
    if (!memory || !memory.longTerm.turnSummaries.length) {
      return null;
    }

    // 가장 최근 턴 요약 반환
    const latestSummary =
      memory.longTerm.turnSummaries[memory.longTerm.turnSummaries.length - 1];
    return latestSummary?.summary || null;
  }

  /**
   * 턴 요약 업데이트
   */
  async updateTurnSummary(
    gameId: string,
    botId: number,
    summary: string,
  ): Promise<void> {
    const memory = await this.getMemory(gameId, botId);
    if (memory) {
      const currentTurn = memory.shortTerm.currentTurn;

      // 기존 턴 요약이 있으면 업데이트, 없으면 추가
      const existingSummaryIndex = memory.longTerm.turnSummaries.findIndex(
        (s) => s.turn === currentTurn,
      );

      if (existingSummaryIndex >= 0) {
        memory.longTerm.turnSummaries[existingSummaryIndex].summary = summary;
      } else {
        memory.longTerm.turnSummaries.push({
          turn: currentTurn,
          summary,
        });
      }

      await this.saveMemory(gameId, botId, memory);
    }
  }

  /**
   * 무전 메시지 추가
   */
  async addWirelessMessage(
    gameId: string,
    botId: number,
    sender: string,
    message: string,
    turn?: number,
  ): Promise<void> {
    const memory = await this.getMemory(gameId, botId);
    if (memory) {
      const wirelessMessage = {
        sender,
        message,
        timestamp: new Date().toISOString(),
        turn: turn || memory.shortTerm.currentTurn,
      };

      memory.shortTerm.wirelessMessages.push(wirelessMessage);

      // 최대 20개 무전 메시지만 유지
      if (memory.shortTerm.wirelessMessages.length > 20) {
        memory.shortTerm.wirelessMessages =
          memory.shortTerm.wirelessMessages.slice(-20);
      }

      await this.saveMemory(gameId, botId, memory);
    }
  }

  /**
   * 게임별 모든 봇 메모리 삭제
   */
  async deleteGameMemories(gameId: string): Promise<void> {
    // 패턴으로 키 찾기
    const pattern = `bot:memory:${gameId}:*`;
    const keys = await this.redisService.scanKeys(pattern);

    // 각 키를 개별적으로 삭제
    for (const key of keys) {
      await this.redisService.del(key);
    }

    // 현재 턴 이벤트도 정리
    for (const key of this.currentTurnEvents.keys()) {
      if (key.startsWith(`${gameId}:`)) {
        this.currentTurnEvents.delete(key);
      }
    }
  }
}

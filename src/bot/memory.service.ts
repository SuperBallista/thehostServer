import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

interface BotMemory {
  shortTerm: {
    currentTurn: number;
    location: string;
    items: string[];
    canEscape: boolean;
    role: string;
    recentChats: Array<{
      sender: string;
      message: string;
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
  };
  metadata: {
    lastUpdated: string;
    memoryVersion: number;
    personality: {
      mbti: string;
      gender: string;
    };
  };
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
   * 봇 메모리 초기화
   */
  async initializeMemory(
    gameId: string,
    botId: number,
    personality: { mbti: string; gender: string },
  ): Promise<void> {
    const memory: BotMemory = {
      shortTerm: {
        currentTurn: 1,
        location: '해안',
        items: [],
        canEscape: true,
        role: 'survivor',
        recentChats: [],
        graffiti: [],
        playersInRegion: [],
        wirelessMessages: [],
      },
      longTerm: {
        turnSummaries: [],
        suspicions: {},
      },
      metadata: {
        lastUpdated: new Date().toISOString(),
        memoryVersion: 1,
        personality,
      },
    };

    const key = `bot:memory:${gameId}:${botId}`;
    await this.redisService.stringifyAndSet(key, memory, 10800);

    this.logger.log(`봇 메모리 초기화: ${gameId}:${botId}`);
  }

  /**
   * 메모리 조회
   */
  async getMemory(gameId: string, botId: number): Promise<BotMemory | null> {
    const key = `bot:memory:${gameId}:${botId}`;
    return await this.redisService.getAndParse(key);
  }

  /**
   * 단기 메모리 업데이트
   */
  async updateShortTermMemory(
    gameId: string,
    botId: number,
    updates: Partial<BotMemory['shortTerm']>,
  ): Promise<void> {
    const memory = await this.getMemory(gameId, botId);
    if (!memory) {
      this.logger.warn(`메모리를 찾을 수 없음: ${gameId}:${botId}`);
      return;
    }

    memory.shortTerm = { ...memory.shortTerm, ...updates };
    memory.metadata.lastUpdated = new Date().toISOString();

    const key = `bot:memory:${gameId}:${botId}`;
    await this.redisService.stringifyAndSet(key, memory, 10800);
  }

  /**
   * 이전 턴 요약 조회
   */
  async getPreviousTurnSummary(gameId: string, botId: number): Promise<string> {
    let memory = await this.getMemory(gameId, botId);
    if (!memory) {
      // 메모리가 없으면 기본 메모리 생성
      console.log(`[MemoryService] 봇 ${botId} 메모리 초기화 (요약 조회용)`);
      await this.initializeMemory(gameId, botId, {
        mbti: 'INTJ',
        gender: 'male',
      });
      memory = await this.getMemory(gameId, botId);
    }

    if (!memory || memory.longTerm.turnSummaries.length === 0) {
      return '첫 번째 턴입니다.';
    }

    // 최근 2개 턴의 요약 반환
    const recentSummaries = memory.longTerm.turnSummaries.slice(-2);
    return recentSummaries.map((s) => `턴 ${s.turn}: ${s.summary}`).join(' ');
  }

  /**
   * 턴 요약 업데이트
   */
  async updateTurnSummary(
    gameId: string,
    botId: number,
    summary: string,
  ): Promise<void> {
    let memory = await this.getMemory(gameId, botId);
    if (!memory) {
      // 메모리가 없으면 기본 메모리 생성
      console.log(`[MemoryService] 봇 ${botId} 메모리 초기화 (턴 요약용)`);
      await this.initializeMemory(gameId, botId, {
        mbti: 'INTJ',
        gender: 'male',
      });
      memory = await this.getMemory(gameId, botId);
      if (!memory) {
        console.error(`[MemoryService] 봇 ${botId} 메모리 초기화 실패`);
        return;
      }
    }

    const currentTurn = memory.shortTerm.currentTurn;

    // 기존 요약 찾기 또는 새로 추가
    const existingIndex = memory.longTerm.turnSummaries.findIndex(
      (s) => s.turn === currentTurn,
    );

    if (existingIndex !== -1) {
      memory.longTerm.turnSummaries[existingIndex].summary = summary;
    } else {
      memory.longTerm.turnSummaries.push({ turn: currentTurn, summary });
    }

    // 최대 10개 턴만 유지
    if (memory.longTerm.turnSummaries.length > 10) {
      memory.longTerm.turnSummaries = memory.longTerm.turnSummaries.slice(-10);
    }

    memory.metadata.lastUpdated = new Date().toISOString();

    const key = `bot:memory:${gameId}:${botId}`;
    await this.redisService.stringifyAndSet(key, memory, 10800);
  }

  /**
   * 의심도 업데이트
   */
  async updateSuspicion(
    gameId: string,
    botId: number,
    playerId: string,
    suspicionLevel: number,
  ): Promise<void> {
    const memory = await this.getMemory(gameId, botId);
    if (!memory) {
      return;
    }

    memory.longTerm.suspicions[playerId] = Math.max(
      0,
      Math.min(1, suspicionLevel),
    );
    memory.metadata.lastUpdated = new Date().toISOString();

    const key = `bot:memory:${gameId}:${botId}`;
    await this.redisService.stringifyAndSet(key, memory, 10800);
  }

  /**
   * 무전 메시지 추가
   */
  async addWirelessMessage(
    gameId: string,
    botId: number,
    sender: string,
    message: string,
    turn: number,
  ): Promise<void> {
    const memory = await this.getMemory(gameId, botId);
    if (!memory) {
      this.logger.warn(`메모리를 찾을 수 없음: ${gameId}:${botId}`);
      return;
    }

    memory.shortTerm.wirelessMessages.push({
      sender,
      message,
      timestamp: new Date().toISOString(),
      turn,
    });

    // 최대 10개의 무전 메시지만 유지
    if (memory.shortTerm.wirelessMessages.length > 10) {
      memory.shortTerm.wirelessMessages =
        memory.shortTerm.wirelessMessages.slice(-10);
    }

    memory.metadata.lastUpdated = new Date().toISOString();

    const key = `bot:memory:${gameId}:${botId}`;
    await this.redisService.stringifyAndSet(key, memory, 10800);
  }

  /**
   * 현재 턴 이벤트 추가
   */
  async addEvent(
    gameId: string,
    botId: number,
    event: GameEvent,
  ): Promise<void> {
    const key = `${gameId}:${botId}`;

    if (!this.currentTurnEvents.has(key)) {
      this.currentTurnEvents.set(key, []);
    }

    const events = this.currentTurnEvents.get(key);
    events?.push(event);

    // 메모리에도 저장 (최근 채팅)
    if (event.type === 'chat') {
      const memory = await this.getMemory(gameId, botId);
      if (memory) {
        memory.shortTerm.recentChats.push({
          sender: event.data?.sender || 'Unknown',
          message: event.message,
          timestamp: event.timestamp.toISOString(),
        });

        // 최대 20개 채팅만 유지
        if (memory.shortTerm.recentChats.length > 20) {
          memory.shortTerm.recentChats =
            memory.shortTerm.recentChats.slice(-20);
        }

        const memKey = `bot:memory:${gameId}:${botId}`;
        await this.redisService.stringifyAndSet(memKey, memory, 10800);
      }
    }
  }

  /**
   * 현재 턴 이벤트 조회
   */
  async getCurrentTurnEvents(
    gameId: string,
    botId: number,
  ): Promise<GameEvent[]> {
    const key = `${gameId}:${botId}`;
    return this.currentTurnEvents.get(key) || [];
  }

  /**
   * 턴 종료 시 이벤트 정리
   */
  async clearTurnEvents(gameId: string, botId: number): Promise<void> {
    const key = `${gameId}:${botId}`;
    this.currentTurnEvents.delete(key);
  }

  /**
   * 메모리 삭제
   */
  async clearMemory(botId: number): Promise<void> {
    const keys = await this.redisService.scanKeys(`bot:memory:*:${botId}`);
    for (const key of keys) {
      await this.redisService.del(key);
    }

    // 이벤트도 정리
    for (const [key] of this.currentTurnEvents) {
      if (key.endsWith(`:${botId}`)) {
        this.currentTurnEvents.delete(key);
      }
    }
  }

  /**
   * 게임 컨텍스트를 위한 메모리 요약
   */
  async getMemorySummary(gameId: string, botId: number): Promise<any> {
    const memory = await this.getMemory(gameId, botId);
    if (!memory) {
      return null;
    }

    return {
      currentLocation: memory.shortTerm.location,
      items: memory.shortTerm.items,
      role: memory.shortTerm.role,
      canEscape: memory.shortTerm.canEscape,
      recentChats: memory.shortTerm.recentChats.slice(-5),
      wirelessMessages: memory.shortTerm.wirelessMessages.slice(-5),
      suspicions: Object.entries(memory.longTerm.suspicions)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([player, level]) => ({ player, level })),
      turnHistory: memory.longTerm.turnSummaries.slice(-3),
    };
  }
}

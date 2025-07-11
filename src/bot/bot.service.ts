import { Injectable, Logger, OnModuleInit, forwardRef, Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { RedisService } from '../redis/redis.service';
import { RedisPubSubService } from '../redis/redisPubSub.service';
import { PlayerManagerService } from '../socket/game/player-manager.service';
import { GameDataService } from '../socket/game/game-data.service';
import { GamePlayerInRedis } from '../socket/game/game.types';
import { BotConfig, BotPlayer, BotState } from './interfaces/bot.interface';
import { TriggerService } from './trigger.service';
import { LLMService } from './llm.service';
import { ActionService } from './action.service';
import { MemoryService } from './memory.service';

@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);
  private botIdCounter = -1;
  private playerManagerService: PlayerManagerService;
  private gameDataService: GameDataService;

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly redisService: RedisService,
    private readonly redisPubSubService: RedisPubSubService,
    @Inject(forwardRef(() => TriggerService))
    private readonly triggerService: TriggerService,
    private readonly llmService: LLMService,
    private readonly actionService: ActionService,
    private readonly memoryService: MemoryService,
  ) {}

  async onModuleInit() {
    // 순환 의존성 해결을 위해 지연 로딩
    this.playerManagerService = this.moduleRef.get(PlayerManagerService, { strict: false });
    this.gameDataService = this.moduleRef.get(GameDataService, { strict: false });
    
    // TriggerService에 BotService 참조 설정
    this.triggerService.setBotService(this);
  }

  /**
   * 봇 생성
   */
  async createBot(roomId: string, botConfig: BotConfig): Promise<BotPlayer> {
    const botId = this.getNextBotId();
    const botName = botConfig.name || `Bot_${Math.abs(botId)}`;
    
    const botPlayer: BotPlayer = {
      botId,
      roomId,
      config: botConfig,
      status: 'active',
      stats: {
        turnsAlive: 0,
        itemsUsed: 0,
        playersHelped: 0,
      },
    };

    // Redis에 봇 상태 저장
    const botState: BotState = {
      botId,
      roomId,
      personality: {
        mbti: botConfig.mbti,
        gender: botConfig.gender,
      },
      status: 'active',
      stats: botPlayer.stats,
    };
    
    await this.redisService.stringifyAndSet(
      `bot:state:${roomId}:${botId}`,
      botState,
      10800 // 3시간
    );

    // 플레이어 매니저에 봇 추가
    await this.playerManagerService.updateLocationState(botId, 'room', roomId);

    this.logger.log(`봇 생성 완료: ${botName} (ID: ${botId})`);
    return botPlayer;
  }

  /**
   * 봇 상태 조회
   */
  async getBotState(botId: number): Promise<BotState | null> {
    const keys = await this.redisService.scanKeys(`bot:state:*:${botId}`);
    if (keys.length === 0) {
      return null;
    }
    
    return await this.redisService.getAndParse(keys[0]);
  }

  /**
   * 봇 상태 업데이트
   */
  async updateBotState(botId: number, state: Partial<BotState>): Promise<void> {
    const keys = await this.redisService.scanKeys(`bot:state:*:${botId}`);
    if (keys.length === 0) {
      this.logger.warn(`봇을 찾을 수 없음: ${botId}`);
      return;
    }

    const currentState = await this.redisService.getAndParse(keys[0]);
    if (!currentState) {
      return;
    }

    const updatedState = { ...currentState, ...state };
    await this.redisService.stringifyAndSet(keys[0], updatedState, 10800);
  }

  /**
   * 봇 제거
   */
  async removeBot(botId: number): Promise<void> {
    const keys = await this.redisService.scanKeys(`bot:state:*:${botId}`);
    if (keys.length > 0) {
      await this.redisService.del(keys[0]);
    }

    // 트리거 정리
    await this.triggerService.clearTriggers(botId);
    
    // 메모리 정리
    await this.memoryService.clearMemory(botId);

    this.logger.log(`봇 제거 완료: ${botId}`);
  }

  /**
   * 게임 시작 시 봇 초기화
   */
  async initializeBotForGame(botId: number, gameId: string, playerId: number): Promise<void> {
    this.logger.log(`게임용 봇 초기화: botId=${botId}, gameId=${gameId}, playerId=${playerId}`);
    
    // 봇의 게임 컨텍스트 생성
    const gameContext = await this.buildGameContext(botId, gameId);
    
    // LLM을 통해 초기 트리거 생성
    const triggers = await this.llmService.generateTriggers(gameContext);
    
    // 트리거 저장
    await this.triggerService.saveTriggers(gameId, botId, triggers);
    
    // 트리거 모니터링 시작
    await this.triggerService.startMonitoring(gameId, botId);
    
    this.logger.log(`봇 초기화 완료: ${triggers.length}개 트리거 생성`);
  }

  /**
   * 턴 시작 시 봇 처리
   */
  async handleTurnStart(gameId: string): Promise<void> {
    const botPlayers = await this.getBotPlayersInGame(gameId);
    
    for (const botPlayer of botPlayers) {
      const gameContext = await this.buildGameContext(botPlayer.userId, gameId);
      
      // 새로운 트리거 생성
      const triggers = await this.llmService.generateTriggers(gameContext);
      await this.triggerService.saveTriggers(gameId, botPlayer.userId, triggers);
      
      // 트리거 모니터링 재시작
      await this.triggerService.startMonitoring(gameId, botPlayer.userId);
    }
  }

  /**
   * 턴 종료 시 봇 처리
   */
  async handleTurnEnd(gameId: string): Promise<void> {
    const botPlayers = await this.getBotPlayersInGame(gameId);
    
    for (const botPlayer of botPlayers) {
      // 이번 턴 요약 생성
      const events = await this.memoryService.getCurrentTurnEvents(gameId, botPlayer.userId);
      const summary = await this.llmService.summarizeTurn(events);
      
      // 메모리 업데이트
      await this.memoryService.updateTurnSummary(gameId, botPlayer.userId, summary);
      
      // 트리거 모니터링 중지
      await this.triggerService.stopMonitoring(gameId, botPlayer.userId);
    }
  }

  /**
   * 트리거 발동 시 처리
   */
  async handleTriggeredEvent(
    gameId: string,
    botId: number,
    triggeredEvent: any
  ): Promise<void> {
    try {
      // 현재 게임 컨텍스트 구성
      const gameContext = await this.buildGameContext(botId, gameId);
      
      // LLM에 행동 결정 요청
      const action = await this.llmService.decideAction(gameContext, triggeredEvent);
      
      // 행동 실행
      await this.actionService.executeAction(gameId, botId, action);
      
      // 통계 업데이트
      await this.updateBotStats(botId, action);
      
    } catch (error) {
      this.logger.error(`봇 행동 처리 실패: ${error.message}`, error.stack);
    }
  }

  /**
   * 게임 컨텍스트 구성
   */
  private async buildGameContext(botId: number, gameId: string): Promise<any> {
    const playerData = await this.playerManagerService.getPlayerDataByUserId(gameId, botId);
    if (!playerData) {
      throw new Error(`봇 플레이어 데이터를 찾을 수 없음: ${botId}`);
    }

    const gameData = await this.redisService.getAndParse(`game:${gameId}`);
    const currentTurn = gameData?.turn || 1;
    
    // 이전 턴 요약
    const previousTurnSummary = await this.memoryService.getPreviousTurnSummary(gameId, botId);
    
    // 현재 턴 채팅
    const regionData = await this.redisService.getAndParse(
      `game:${gameId}:region:${playerData.regionId}:${currentTurn}`
    );
    const currentTurnChats = regionData?.chatLog || [];
    
    // 같은 구역 플레이어
    const playersInRegion = await this.getPlayersInRegion(gameId, playerData.regionId);
    
    // 봇 상태
    const botState = await this.getBotState(botId);
    
    return {
      previousTurnSummary,
      currentTurnChats: currentTurnChats.map(chat => ({
        sender: chat.system ? 'System' : 'Player',
        message: chat.message,
        system: chat.system,
      })),
      currentItems: playerData.items || [],
      playersInRegion: playersInRegion.map(p => `Player_${p.playerId}`),
      currentTurn,
      regionGraffiti: regionData?.regionMessageList?.filter(msg => msg !== null) || [],
      canEscape: playerData.canEscape,
      role: this.getPlayerRole(playerData),
      currentRegion: this.getRegionName(playerData.regionId),
      personality: botState?.personality || { mbti: 'INTJ', gender: 'male' },
    };
  }

  /**
   * 게임 내 봇 플레이어 조회
   */
  private async getBotPlayersInGame(gameId: string): Promise<GamePlayerInRedis[]> {
    const gameData = await this.redisService.getAndParse(`game:${gameId}`);
    if (!gameData) {
      return [];
    }

    const botPlayers: GamePlayerInRedis[] = [];
    for (let i = 0; i < 20; i++) {
      const playerData = await this.redisService.getAndParse(`game:${gameId}:player:${i}`) as GamePlayerInRedis | null;
      if (playerData && playerData.userId < 0) {
        botPlayers.push(playerData);
      }
    }
    
    return botPlayers;
  }

  /**
   * 같은 구역의 플레이어 조회
   */
  private async getPlayersInRegion(gameId: string, regionId: number): Promise<GamePlayerInRedis[]> {
    const players: GamePlayerInRedis[] = [];
    for (let i = 0; i < 20; i++) {
      const playerData = await this.redisService.getAndParse(`game:${gameId}:player:${i}`) as GamePlayerInRedis | null;
      if (playerData && playerData.regionId === regionId && playerData.state !== 'left') {
        players.push(playerData);
      }
    }
    return players;
  }

  /**
   * 플레이어 역할 판단
   */
  private getPlayerRole(playerData: GamePlayerInRedis): 'survivor' | 'host' | 'zombie' {
    if (playerData.state === 'host') return 'host';
    if (playerData.state === 'zombie') return 'zombie';
    return 'survivor';
  }

  /**
   * 지역 이름 반환
   */
  private getRegionName(regionId: number): string {
    const regions = ['해안', '폐건물', '정글', '동굴', '산 정상', '개울'];
    return regions[regionId] || '알 수 없음';
  }

  /**
   * 봇 통계 업데이트
   */
  private async updateBotStats(botId: number, action: { action: string; params: Record<string, unknown> }): Promise<void> {
    const botState = await this.getBotState(botId);
    if (!botState) return;

    if (action.action === 'useItem') {
      botState.stats.itemsUsed++;
    }
    
    if (action.action === 'giveItem') {
      botState.stats.playersHelped++;
    }

    await this.updateBotState(botId, { stats: botState.stats });
  }

  /**
   * 다음 봇 ID 생성
   */
  private getNextBotId(): number {
    return this.botIdCounter--;
  }
}
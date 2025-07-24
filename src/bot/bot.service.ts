import {
  Injectable,
  Logger,
  OnModuleInit,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { GameDataService } from '../socket/game/game-data.service';
import { PlayerManagerService } from '../socket/game/player-manager.service';
import { BotConfig, GameContext } from './interfaces/bot.interface';
import { LLMService } from './llm.service';
import { ActionService } from './action.service';
import { MemoryService } from './memory.service';
import { ChatService } from '../socket/game/chat.service';
import { GamePlayerInRedis, ITEM_NAMES } from '../socket/game/game.types';
import { ANIMAL_NICKNAMES } from './constants/animal-nicknames';

// 타입 정의 추가
interface BotStateInRedis {
  botId: number;
  roomId: string;
  personality: {
    mbti: string;
    gender: string;
  };
  name: string;
  createdAt: string;
  isActive: boolean;
  playerId?: number;
  stats: {
    turnsAlive: number;
    itemsUsed: number;
    playersHelped: number;
  };
}

interface GameDataInRedis {
  turn: number;
  [key: string]: unknown;
}

interface RegionDataInRedis {
  chatLog: Array<{
    sender?: string;
    message: string;
    system?: boolean;
    playerId?: number;
  }>;
  regionMessageList?: Array<string | null>;
  [key: string]: unknown;
}

interface ChatLogEntry {
  sender?: string;
  message: string;
  system?: boolean;
  playerId?: number;
}

interface WirelessMessage {
  sender: string;
  message: string;
  turn: number;
}

@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);
  private chatTimers = new Map<string, NodeJS.Timeout>();
  private activeBots = new Map<string, boolean>(); // gameId:botId -> active status

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => GameDataService))
    private readonly gameDataService: GameDataService,
    @Inject(forwardRef(() => PlayerManagerService))
    private readonly playerManagerService: PlayerManagerService,
    private readonly llmService: LLMService,
    private readonly actionService: ActionService,
    private readonly memoryService: MemoryService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
  ) {}

  onModuleInit() {
    this.logger.log('BotService 초기화 완료');
  }

  /**
   * 봇 생성
   */
  async createBot(roomId: string, config: BotConfig): Promise<number> {
    const botId = await this.generateBotId();

    const botState = {
      botId,
      roomId,
      personality: config.mbti,
      gender: config.gender,
      name: config.name,
      createdAt: new Date().toISOString(),
      isActive: false,
    };

    await this.redisService.stringifyAndSet(
      `bot:state:${roomId}:${botId}`,
      botState,
      3600,
    );

    this.logger.log(
      `봇 생성 완료: ${config.name} (${config.mbti}/${config.gender})`,
    );
    return botId;
  }

  /**
   * 봇 상태 조회
   */
  async getBotState(botId: number): Promise<BotStateInRedis | null> {
    const keys = await this.redisService.scanKeys(`bot:state:*:${botId}`);
    if (keys.length === 0) {
      return null;
    }

    const state = (await this.redisService.getAndParse(
      keys[0],
    )) as BotStateInRedis | null;
    return state;
  }

  /**
   * 봇 상태 업데이트
   */
  async updateBotState(
    botId: number,
    state: Partial<BotStateInRedis>,
  ): Promise<void> {
    const keys = await this.redisService.scanKeys(`bot:state:*:${botId}`);
    if (keys.length === 0) {
      this.logger.warn(`봇을 찾을 수 없음: ${botId}`);
      return;
    }

    const currentState = (await this.redisService.getAndParse(
      keys[0],
    )) as BotStateInRedis;
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

    // 메모리 정리
    await this.memoryService.clearMemory(botId);

    this.logger.log(`봇 제거 완료: ${botId}`);
  }

  /**
   * 게임 시작 시 봇 초기화
   */
  async initializeBotForGame(
    botId: number,
    gameId: string,
    playerId: number,
  ): Promise<void> {
    this.logger.log(
      `게임용 봇 초기화: botId=${botId}, gameId=${gameId}, playerId=${playerId}`,
    );

    // 봇 상태 활성화
    const botKey = `bot:state:${gameId}:${botId}`;
    const botState = (await this.redisService.getAndParse(
      botKey,
    )) as BotStateInRedis | null;
    if (botState) {
      botState.isActive = true;
      botState.playerId = playerId;
      await this.redisService.stringifyAndSet(botKey, botState, 10800);
    }

    // 봇 채팅 타이머 시작
    this.startBotChatTimer(gameId, botId);

    // 봇 행동 타이머 시작
    this.startBotActionTimer(gameId, botId);

    this.logger.log(`봇 초기화 완료: 채팅 및 행동 타이머 시작`);
  }

  /**
   * 턴 시작 시 봇 처리
   */
  async handleTurnStart(gameId: string): Promise<void> {
    const botPlayers = await this.getBotPlayersInGame(gameId);

    for (const botPlayer of botPlayers) {
      // 봇 채팅 타이머 재시작
      this.startBotChatTimer(gameId, botPlayer.userId);

      // 봇 행동 타이머 재시작
      this.startBotActionTimer(gameId, botPlayer.userId);
    }
  }

  /**
   * 턴 종료 시 봇 처리
   */
  async handleTurnEnd(gameId: string): Promise<void> {
    const botPlayers = await this.getBotPlayersInGame(gameId);

    for (const botPlayer of botPlayers) {
      // 봇 채팅 타이머 정지
      this.stopBotChatTimer(gameId, botPlayer.userId);

      // 봇 행동 타이머 정지
      this.stopBotActionTimer(gameId, botPlayer.userId);
    }
  }

  /**
   * 게임 컨텍스트 구성
   */
  private async buildGameContext(
    botId: number,
    gameId: string,
  ): Promise<GameContext> {
    const playerData = await this.playerManagerService.getPlayerDataByUserId(
      gameId,
      botId,
    );
    if (!playerData) {
      throw new Error(`봇 플레이어 데이터를 찾을 수 없음: ${botId}`);
    }

    const gameData = (await this.redisService.getAndParse(
      `game:${gameId}`,
    )) as GameDataInRedis | null;
    const currentTurn = gameData?.turn || 1;

    // 이전 턴 요약
    const previousTurnSummary = await this.memoryService.getPreviousTurnSummary(
      gameId,
      botId,
    );

    // 현재 턴 채팅
    const regionData = (await this.redisService.getAndParse(
      `game:${gameId}:region:${playerData.regionId}:${currentTurn}`,
    )) as RegionDataInRedis | null;
    const currentTurnChats: ChatLogEntry[] = regionData?.chatLog || [];

    // 봇 메모리에서 무전 메시지 가져오기
    const botMemory = await this.memoryService.getMemory(gameId, botId);
    const wirelessMessages = botMemory?.shortTerm.wirelessMessages || [];

    // 같은 구역 플레이어
    const playersInRegion = await this.getPlayersInRegion(
      gameId,
      playerData.regionId,
    );

    // 봇 상태
    const botState = await this.getBotState(botId);

    // 전체 플레이어 정보 가져오기
    const allPlayers =
      await this.playerManagerService.getAllPlayersInGame(gameId);
    const allPlayerNames = allPlayers
      .filter((p) => p.state !== 'left')
      .map((p) => ANIMAL_NICKNAMES[p.playerId] || `Player_${p.playerId}`);

    // 호스트인 경우 좀비 리스트 추가
    let zombieList: Array<{ nickname: string; location: string }> | undefined;
    if (playerData.state === 'host') {
      zombieList = allPlayers
        .filter((p) => p.state === 'zombie')
        .map((zombie) => ({
          nickname:
            ANIMAL_NICKNAMES[zombie.playerId] || `Player_${zombie.playerId}`,
          location: this.getRegionName(zombie.regionId),
        }));
    }

    return {
      previousTurnSummary,
      currentTurnChats: currentTurnChats.map((chat) => ({
        sender: chat.system
          ? 'System'
          : chat.playerId !== undefined
            ? ANIMAL_NICKNAMES[chat.playerId] || `Player_${chat.playerId}`
            : 'Player',
        message: chat.message,
        system: chat.system || false,
      })),
      wirelessMessages: wirelessMessages.map((msg: WirelessMessage) => ({
        sender: msg.sender,
        message: msg.message,
        turn: msg.turn,
      })),
      currentItems:
        playerData.items?.map((item) => ITEM_NAMES[item] || item) || [],
      playersInRegion: playersInRegion.map(
        (p) => ANIMAL_NICKNAMES[p.playerId] || `Player_${p.playerId}`,
      ),
      allPlayers: allPlayerNames,
      currentTurn,
      regionGraffiti:
        regionData?.regionMessageList?.filter((msg) => msg !== null) || [],
      canEscape: playerData.canEscape,
      role: this.getPlayerRole(playerData),
      currentRegion: this.getRegionName(playerData.regionId),
      personality: botState?.personality || { mbti: 'INTJ', gender: 'male' },
      botPlayerId: playerData.playerId,
      zombieList,
    };
  }

  /**
   * 게임 내 봇 플레이어 조회
   */
  private async getBotPlayersInGame(
    gameId: string,
  ): Promise<GamePlayerInRedis[]> {
    const gameData = (await this.redisService.getAndParse(
      `game:${gameId}`,
    )) as GameDataInRedis | null;
    if (!gameData) {
      return [];
    }

    const botPlayers: GamePlayerInRedis[] = [];
    for (let i = 0; i < 20; i++) {
      const playerData = (await this.redisService.getAndParse(
        `game:${gameId}:player:${i}`,
      )) as GamePlayerInRedis | null;
      if (playerData && playerData.userId < 0) {
        botPlayers.push(playerData);
      }
    }

    return botPlayers;
  }

  /**
   * 같은 구역의 플레이어 조회
   */
  private async getPlayersInRegion(
    gameId: string,
    regionId: number,
  ): Promise<GamePlayerInRedis[]> {
    const players: GamePlayerInRedis[] = [];
    for (let i = 0; i < 20; i++) {
      const playerData = (await this.redisService.getAndParse(
        `game:${gameId}:player:${i}`,
      )) as GamePlayerInRedis | null;
      if (
        playerData &&
        playerData.regionId === regionId &&
        playerData.state !== 'left'
      ) {
        players.push(playerData);
      }
    }
    return players;
  }

  /**
   * 플레이어 역할 판단
   */
  private getPlayerRole(
    playerData: GamePlayerInRedis,
  ): 'survivor' | 'host' | 'zombie' {
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
   * 메시지에서 아이템 코드를 한글로 변환
   */
  private convertItemCodesInMessage(message: string): string {
    if (!message) return message;

    let convertedMessage = message;

    // 모든 아이템 코드를 한글로 변환
    Object.entries(ITEM_NAMES).forEach(([code, koreanName]) => {
      if (koreanName && convertedMessage.includes(code)) {
        // 단어 경계를 확인하여 정확한 매칭만 변환
        const regex = new RegExp(`\\b${code}\\b`, 'g');
        convertedMessage = convertedMessage.replace(regex, koreanName);
      }
    });

    // 영어 지역 이름도 한글로 변환
    const regionMappings: Record<string, string> = {
      Savannah: '해안',
      Jungle: '정글',
      Quarry: '동굴',
      Cave: '동굴',
      Mountain: '산 정상',
      Stream: '개울',
      Ruins: '폐건물',
    };

    Object.entries(regionMappings).forEach(([eng, kor]) => {
      const regex = new RegExp(`\\b${eng}\\b`, 'gi');
      convertedMessage = convertedMessage.replace(regex, kor);
    });

    return convertedMessage;
  }

  /**
   * 봇 통계 업데이트
   */
  private async updateBotStats(
    botId: number,
    action: { action: string; params: Record<string, unknown> },
  ): Promise<void> {
    const botState = await this.getBotState(botId);
    if (!botState) return;

    // 기본 stats 구조가 없으면 초기화
    if (!botState.stats) {
      botState.stats = {
        turnsAlive: 0,
        itemsUsed: 0,
        playersHelped: 0,
      };
    }

    if (action.action === 'useItem') {
      botState.stats.itemsUsed++;
    }

    if (action.action === 'giveItem') {
      botState.stats.playersHelped++;
    }

    await this.updateBotState(botId, { stats: botState.stats });
  }

  /**
   * 봇 채팅 타이머 시작 (8-12초 간격)
   */
  private startBotChatTimer(gameId: string, botId: number): void {
    const timerKey = `${gameId}:${botId}`;

    // 기존 타이머가 있으면 정지
    this.stopBotChatTimer(gameId, botId);

    // 봇 활성화
    this.activeBots.set(timerKey, true);

    const scheduleNextChat = () => {
      if (!this.activeBots.get(timerKey)) {
        return; // 봇이 비활성화되면 중지
      }

      // 8-12초 사이 랜덤 간격
      const delay = Math.random() * 4000 + 8000; // 8000-12000ms

      const timer = setTimeout(() => {
        void (async () => {
          try {
            await this.processBotChat(gameId, botId);
            scheduleNextChat(); // 다음 채팅 예약
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`봇 채팅 처리 실패: ${errorMessage}`, errorStack);
            scheduleNextChat(); // 에러가 있어도 계속 진행
          }
        })();
      }, delay);

      this.chatTimers.set(timerKey, timer);
    };

    scheduleNextChat();
    this.logger.log(`봇 채팅 타이머 시작: ${timerKey}`);
  }

  /**
   * 봇 채팅 타이머 정지
   */
  private stopBotChatTimer(gameId: string, botId: number): void {
    const timerKey = `${gameId}:${botId}`;

    // 봇 비활성화
    this.activeBots.set(timerKey, false);

    // 타이머 정지
    const timer = this.chatTimers.get(timerKey);
    if (timer) {
      clearTimeout(timer);
      this.chatTimers.delete(timerKey);
      this.logger.log(`봇 채팅 타이머 정지: ${timerKey}`);
    }
  }

  /**
   * 봇 채팅 처리 (수정됨 - 채팅만 처리)
   */
  private async processBotChat(gameId: string, botId: number): Promise<void> {
    try {
      // 플레이어 상태 확인
      const playerData = await this.playerManagerService.getPlayerDataByUserId(
        gameId,
        botId,
      );
      if (!playerData) {
        this.logger.warn(`봇 플레이어 데이터를 찾을 수 없음: ${botId}`);
        return;
      }

      // 죽었거나 좀비인 경우 채팅 불가
      if (playerData.state === 'killed' || playerData.state === 'zombie') {
        this.logger.debug(
          `봇이 죽었거나 좀비 상태여서 채팅 불가: ${botId} (${playerData.state})`,
        );
        return;
      }

      // 현재 게임 컨텍스트 구성
      const gameContext = await this.buildGameContext(botId, gameId);

      // LLM에 채팅 메시지 결정 요청 (새로운 분리된 함수 사용)
      const chatDecision = await this.llmService.decideChatOnly(gameContext);

      if (
        chatDecision.shouldChat &&
        chatDecision.message &&
        chatDecision.message.trim() !== '###'
      ) {
        // 채팅 메시지 전송
        await this.actionService.executeAction(gameId, botId, {
          action: 'chatMessage',
          params: { message: chatDecision.message },
        });

        // 동물 닉네임으로 로그 표시
        const botNickname =
          ANIMAL_NICKNAMES[playerData.playerId] || `Bot_${Math.abs(botId)}`;
        this.logger.log(
          `봇 채팅 전송: ${botNickname} - ${chatDecision.message}`,
        );
      }

      // 추가로 행동 판단도 수행 (선택적)
      if (Math.random() < 0.3) {
        // 30% 확률로 행동도 수행
        await this.processBotAction(gameId, botId);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`봇 채팅 처리 실패: ${errorMessage}`, errorStack);
    }
  }

  /**
   * 봇 행동 처리 (새로 추가됨 - 행동만 처리)
   */
  private async processBotAction(gameId: string, botId: number): Promise<void> {
    try {
      // 플레이어 상태 확인
      const playerData = await this.playerManagerService.getPlayerDataByUserId(
        gameId,
        botId,
      );
      if (!playerData) {
        this.logger.warn(`봇 플레이어 데이터를 찾을 수 없음: ${botId}`);
        return;
      }

      // 죽은 경우 행동 불가
      if (playerData.state === 'killed') {
        this.logger.debug(`봇이 죽어서 행동 불가: ${botId}`);
        return;
      }

      // 현재 게임 컨텍스트 구성
      const gameContext = await this.buildGameContext(botId, gameId);

      // LLM에 행동 결정 요청 (새로운 분리된 함수 사용)
      const actionDecision =
        await this.llmService.decideGameAction(gameContext);

      if (actionDecision.action) {
        // 행동 실행
        await this.actionService.executeAction(gameId, botId, {
          action: actionDecision.action,
          params: actionDecision.params,
        });

        // 동물 닉네임으로 로그 표시
        const botNickname =
          ANIMAL_NICKNAMES[playerData.playerId] || `Bot_${Math.abs(botId)}`;
        this.logger.log(
          `봇 행동 실행: ${botNickname} - ${actionDecision.action} ${JSON.stringify(actionDecision.params)}`,
        );

        // 봇 통계 업데이트
        await this.updateBotStats(botId, actionDecision);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`봇 행동 처리 실패: ${errorMessage}`, errorStack);
    }
  }

  /**
   * 봇 행동 타이머 시작 (행동 전용, 10-30초 간격)
   */
  private startBotActionTimer(gameId: string, botId: number): void {
    const timerKey = `${gameId}:${botId}:action`;

    // 기존 타이머가 있으면 정지
    this.stopBotActionTimer(gameId, botId);

    const scheduleNextAction = () => {
      if (!this.activeBots.get(`${gameId}:${botId}`)) {
        return; // 봇이 비활성화되면 중지
      }

      // 10-30초 사이 랜덤 간격 (행동은 채팅보다 덜 빈번)
      const delay = Math.random() * 20000 + 10000; // 10000-30000ms

      const timer = setTimeout(() => {
        void (async () => {
          try {
            await this.processBotAction(gameId, botId);
            scheduleNextAction(); // 다음 행동 예약
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`봇 행동 처리 실패: ${errorMessage}`, errorStack);
            scheduleNextAction(); // 에러가 있어도 계속 진행
          }
        })();
      }, delay);

      this.chatTimers.set(timerKey, timer);
    };

    scheduleNextAction();
    this.logger.log(`봇 행동 타이머 시작: ${timerKey}`);
  }

  /**
   * 봇 행동 타이머 정지
   */
  private stopBotActionTimer(gameId: string, botId: number): void {
    const timerKey = `${gameId}:${botId}:action`;

    // 타이머 정지
    const timer = this.chatTimers.get(timerKey);
    if (timer) {
      clearTimeout(timer);
      this.chatTimers.delete(timerKey);
      this.logger.log(`봇 행동 타이머 정지: ${timerKey}`);
    }
  }

  /**
   * 게임 종료 시 봇 정리
   */
  async cleanupBotsForGame(gameId: string): Promise<void> {
    const botPlayers = await this.getBotPlayersInGame(gameId);

    for (const botPlayer of botPlayers) {
      this.stopBotChatTimer(gameId, botPlayer.userId);
      this.stopBotActionTimer(gameId, botPlayer.userId);
    }

    this.logger.log(`게임 ${gameId}의 모든 봇 정리 완료`);
  }

  /**
   * 다음 봇 ID 생성
   */
  private async generateBotId(): Promise<number> {
    // 현재 봇 ID 범위를 확인하여 다음 ID를 생성
    const keys = await this.redisService.scanKeys('bot:state:*');
    const botIds = keys.map((key) => parseInt(key.split(':').pop() || '0', 10));
    const maxBotId = Math.max(...botIds);
    return maxBotId <= 0 ? -1 : maxBotId - 1; // 음수 ID로 생성
  }
}

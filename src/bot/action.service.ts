import { Injectable, Logger } from '@nestjs/common';
import { RedisPubSubService } from '../redis/redisPubSub.service';
import { PlayerManagerService } from '../socket/game/player-manager.service';
import { GameDataService } from '../socket/game/game-data.service';
import { GamePlayerInRedis, ItemCode } from '../socket/game/game.types';
import { userRequest, AuthUser } from '../socket/payload.types';

@Injectable()
export class ActionService {
  private readonly logger = new Logger(ActionService.name);

  // 액션 매핑
  private readonly actionMap = {
    'myStatus.next': this.handleMoveAction.bind(this),
    'myStatus.act': this.handleZombieResponseAction.bind(this),
    'chatMessage': this.handleChatAction.bind(this),
    'useItem': this.handleUseItemAction.bind(this),
    'giveItem': this.handleGiveItemAction.bind(this),
    'hostAct.infect': this.handleInfectAction.bind(this),
    'hostAct.zombieList': this.handleZombieControlAction.bind(this),
    'wait': this.handleWaitAction.bind(this),
  };

  constructor(
    private readonly redisPubSubService: RedisPubSubService,
    private readonly playerManagerService: PlayerManagerService,
    private readonly gameDataService: GameDataService,
  ) {}

  /**
   * 액션 실행
   */
  async executeAction(gameId: string, botId: number, action: { action: string; params: Record<string, unknown> }): Promise<void> {
    try {
      const handler = this.actionMap[action.action];
      if (!handler) {
        throw new Error(`알 수 없는 액션: ${action.action}`);
      }

      // 봇의 플레이어 데이터 조회
      const playerData = await this.playerManagerService.getPlayerDataByUserId(gameId, botId);
      if (!playerData) {
        throw new Error(`봇 플레이어 데이터를 찾을 수 없음: ${botId}`);
      }

      // 액션 실행
      await handler(gameId, botId, playerData, action.params);
      
      this.logger.log(`액션 실행 완료: ${action.action}`, action.params);
      
    } catch (error) {
      this.logger.error(`액션 실행 실패: ${error.message}`, error.stack);
    }
  }

  /**
   * 이동 액션
   */
  private async handleMoveAction(
    gameId: string, 
    botId: number, 
    playerData: GamePlayerInRedis, 
    params: Record<string, unknown>
  ): Promise<void> {
    const location = params.location as string;
    const regionMap: Record<string, number> = {
      '해안': 0,
      '폐건물': 1,
      '정글': 2,
      '동굴': 3,
      '산 정상': 4,
      '개울': 5,
    };
    
    const regionId = regionMap[location];
    if (regionId === undefined) {
      throw new Error(`잘못된 지역: ${location}`);
    }

    // Socket.io를 통한 요청 시뮬레이션
    const request: Partial<userRequest> = {
      token: `bot_${botId}`,
      user: { id: botId, nickname: `Bot_${Math.abs(botId)}` } as AuthUser,
      roomId: gameId,
      myStatus: { next: regionId },
    };

    // 플레이어 상태 업데이트를 위한 내부 호출
    await this.updatePlayerStatus(gameId, playerData.playerId, { next: regionId });
  }

  /**
   * 좀비 대응 액션
   */
  private async handleZombieResponseAction(
    gameId: string,
    botId: number,
    playerData: GamePlayerInRedis,
    params: Record<string, unknown>
  ): Promise<void> {
    const action = params.action as string;
    const validActions = ['runaway', 'hide', 'lure'];
    
    if (!validActions.includes(action)) {
      throw new Error(`잘못된 좀비 대응 액션: ${action}`);
    }

    await this.updatePlayerStatus(gameId, playerData.playerId, { act: action });
  }

  /**
   * 채팅 액션
   */
  private async handleChatAction(
    gameId: string,
    botId: number,
    playerData: GamePlayerInRedis,
    params: Record<string, unknown>
  ): Promise<void> {
    const message = params.message as string;
    
    if (!message) {
      throw new Error('메시지가 비어있음');
    }

    // 채팅 메시지 발송
    await this.redisPubSubService.publishChatMessage(
      gameId,
      playerData.playerId,
      message,
      playerData.regionId,
      false
    );
  }

  /**
   * 아이템 사용 액션
   */
  private async handleUseItemAction(
    gameId: string,
    botId: number,
    playerData: GamePlayerInRedis,
    params: Record<string, unknown>
  ): Promise<void> {
    const item = params.item as ItemCode;
    const target = params.target as number | undefined;
    const content = params.content as string | undefined;
    
    // 아이템 보유 확인
    if (!playerData.items.includes(item)) {
      throw new Error(`아이템을 보유하지 않음: ${item}`);
    }

    // 아이템별 처리
    switch (item) {
      case 'spray':
        if (!content) throw new Error('그래피티 내용이 없음');
        await this.useSpray(gameId, playerData, content);
        break;
        
      case 'wireless':
        if (target === undefined) throw new Error('무전기 대상이 없음');
        if (!content) throw new Error('무전기 메시지가 없음');
        await this.useWireless(gameId, playerData, target, content);
        break;
        
      case 'microphone':
        if (!content) throw new Error('마이크 메시지가 없음');
        await this.useMicrophone(gameId, playerData, content);
        break;
        
      case 'shotgun':
      case 'vaccine':
        if (target === undefined) throw new Error('대상이 없음');
        await this.useCombatItem(gameId, playerData, item, target);
        break;
        
      default:
        await this.useSimpleItem(gameId, playerData, item);
    }

    // 아이템 제거
    await this.removeItemFromInventory(gameId, playerData.playerId, item);
  }

  /**
   * 아이템 전달 액션
   */
  private async handleGiveItemAction(
    gameId: string,
    botId: number,
    playerData: GamePlayerInRedis,
    params: Record<string, unknown>
  ): Promise<void> {
    const target = params.target as string | number;
    const item = params.item as ItemCode;
    
    if (!playerData.items.includes(item)) {
      throw new Error(`아이템을 보유하지 않음: ${item}`);
    }

    // 대상 플레이어 찾기
    let targetPlayerId: number;
    if (typeof target === 'string') {
      // Player_X 형식에서 ID 추출
      const match = target.match(/Player_(\d+)/);
      targetPlayerId = match ? parseInt(match[1]) : -1;
    } else {
      targetPlayerId = target as number;
    }

    if (targetPlayerId < 0 || targetPlayerId >= 20) {
      throw new Error(`잘못된 대상: ${target}`);
    }

    // 같은 구역인지 확인
    const targetData = await this.playerManagerService.getPlayerData(gameId, targetPlayerId);
    if (!targetData || targetData.regionId !== playerData.regionId) {
      throw new Error('대상이 같은 구역에 없음');
    }

    // 아이템 전달 처리 (실제 구현은 GameService의 로직 활용)
    this.logger.log(`아이템 전달: ${item} → Player_${targetPlayerId}`);
  }

  /**
   * 감염 액션 (호스트 전용)
   */
  private async handleInfectAction(
    gameId: string,
    botId: number,
    playerData: GamePlayerInRedis,
    params: Record<string, unknown>
  ): Promise<void> {
    if (playerData.state !== 'host') {
      throw new Error('호스트만 감염시킬 수 있음');
    }

    const target = params.target as number;
    
    // 호스트 액션 업데이트
    await this.updatePlayerStatus(gameId, playerData.playerId, { 
      hostAct: { infect: target } 
    });
  }

  /**
   * 좀비 제어 액션 (호스트 전용)
   */
  private async handleZombieControlAction(
    gameId: string,
    botId: number,
    playerData: GamePlayerInRedis,
    params: Record<string, unknown>
  ): Promise<void> {
    if (playerData.state !== 'host') {
      throw new Error('호스트만 좀비를 제어할 수 있음');
    }

    const zombies = params.zombies as Array<{ playerId: number; next: number; target: number }>;
    
    // 좀비 리스트 업데이트
    await this.updatePlayerStatus(gameId, playerData.playerId, { 
      hostAct: { zombieList: zombies } 
    });
  }

  /**
   * 대기 액션
   */
  private async handleWaitAction(
    gameId: string,
    botId: number,
    playerData: GamePlayerInRedis,
    params: Record<string, unknown>
  ): Promise<void> {
    this.logger.debug(`봇 ${botId} 대기 중`);
    // 아무 행동도 하지 않음
  }

  /**
   * 플레이어 상태 업데이트 헬퍼
   */
  private async updatePlayerStatus(
    gameId: string,
    playerId: number,
    status: Record<string, unknown>
  ): Promise<void> {
    await this.redisPubSubService.publishPlayerStatus(gameId, playerId, status);
  }

  /**
   * 스프레이 사용
   */
  private async useSpray(gameId: string, playerData: GamePlayerInRedis, content: string): Promise<void> {
    // 지역 메시지 추가 로직
    this.logger.log(`그래피티 추가: ${content}`);
  }

  /**
   * 무전기 사용
   */
  private async useWireless(
    gameId: string,
    playerData: GamePlayerInRedis,
    targetId: number,
    message: string
  ): Promise<void> {
    // 개인 메시지 전송 로직
    this.logger.log(`무전기 메시지: ${message} → Player_${targetId}`);
  }

  /**
   * 마이크 사용
   */
  private async useMicrophone(
    gameId: string,
    playerData: GamePlayerInRedis,
    message: string
  ): Promise<void> {
    // 전체 방송 로직
    for (let regionId = 0; regionId < 6; regionId++) {
      await this.redisPubSubService.publishChatMessage(
        gameId,
        playerData.playerId,
        `[방송] ${message}`,
        regionId,
        false
      );
    }
  }

  /**
   * 전투 아이템 사용
   */
  private async useCombatItem(
    gameId: string,
    playerData: GamePlayerInRedis,
    item: string,
    targetId: number
  ): Promise<void> {
    this.logger.log(`전투 아이템 사용: ${item} → Player_${targetId}`);
  }

  /**
   * 단순 아이템 사용
   */
  private async useSimpleItem(
    gameId: string,
    playerData: GamePlayerInRedis,
    item: string
  ): Promise<void> {
    this.logger.log(`아이템 사용: ${item}`);
  }

  /**
   * 인벤토리에서 아이템 제거
   */
  private async removeItemFromInventory(
    gameId: string,
    playerId: number,
    item: string
  ): Promise<void> {
    const playerData = await this.playerManagerService.getPlayerData(gameId, playerId);
    if (playerData && playerData.items) {
      const itemIndex = playerData.items.indexOf(item as ItemCode);
      if (itemIndex !== -1) {
        playerData.items.splice(itemIndex, 1);
        await this.gameDataService.savePlayerData(gameId, playerId, playerData);
      }
    }
  }
}
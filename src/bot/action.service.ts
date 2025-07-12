import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { RedisPubSubService } from '../redis/redisPubSub.service';
import { PlayerManagerService } from '../socket/game/player-manager.service';
import { GameDataService } from '../socket/game/game-data.service';
import { GamePlayerInRedis, ItemCode } from '../socket/game/game.types';
import { userRequest, AuthUser, HostAct, Act } from '../socket/payload.types';
import { ANIMAL_NICKNAMES } from './constants/animal-nicknames';
import { convertKoreanToItemCode, extractAndConvertItems, extractPlayerIdFromNickname } from './constants/item-mappings';
import { HostActionService } from '../socket/game/host-action.service';
import { GameService } from '../socket/game/game.service';
import { ZombieService } from '../socket/game/zombie.service';

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
    @Inject(forwardRef(() => PlayerManagerService))
    private readonly playerManagerService: PlayerManagerService,
    @Inject(forwardRef(() => GameDataService))
    private readonly gameDataService: GameDataService,
    @Inject(forwardRef(() => HostActionService))
    private readonly hostActionService: HostActionService,
    @Inject(forwardRef(() => GameService))
    private readonly gameService: GameService,
    @Inject(forwardRef(() => ZombieService))
    private readonly zombieService: ZombieService,
  ) {}

  /**
   * 액션 실행
   */
  async executeAction(gameId: string, botId: number, action: { action: string; params: Record<string, unknown> }): Promise<void> {
    try {
      // 파라미터에서 한글 아이템 이름을 코드로 변환
      const convertedParams = this.convertKoreanParamsToCode(action.params);
      
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
      await handler(gameId, botId, playerData, convertedParams);
      
      this.logger.log(`액션 실행 완료: ${action.action}`, convertedParams);
      
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

    // 실제 GameService를 통해 플레이어 상태 업데이트
    await this.gameService.updatePlayerStatus(botId, { next: regionId });

    // 동물 닉네임으로 로그 출력
    const botNickname = ANIMAL_NICKNAMES[playerData.playerId] || `Bot_${Math.abs(botId)}`;
    this.logger.log(`${botNickname}이(가) ${location}으로 이동 예정`);
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

    // 실제 GameService를 통해 플레이어 상태 업데이트
    await this.gameService.updatePlayerStatus(botId, { act: action as Act });

    // 동물 닉네임으로 로그 출력
    const botNickname = ANIMAL_NICKNAMES[playerData.playerId] || `Bot_${Math.abs(botId)}`;
    const actionNames = { runaway: '도주', hide: '숨기', lure: '유인' };
    this.logger.log(`${botNickname}이(가) ${actionNames[action]} 선택`);
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

    // 봇의 동물 닉네임 가져오기
    const botNickname = ANIMAL_NICKNAMES[playerData.playerId] || `Bot_${Math.abs(botId)}`;
    
    // 메시지에 닉네임 포함 (이미 포함되어 있지 않은 경우에만)
    const formattedMessage = message.startsWith(`[${botNickname}]`) 
      ? message 
      : `${botNickname}: ${message}`;

    // 채팅 메시지 발송
    await this.redisPubSubService.publishChatMessage(
      gameId,
      playerData.playerId,
      formattedMessage,
      playerData.regionId,
      false
    );
  }

  /**
   * 한글 파라미터를 코드로 변환
   */
  private convertKoreanParamsToCode(params: Record<string, unknown>): Record<string, unknown> {
    const converted = { ...params };
    
    // 아이템 이름 변환
    if (typeof converted.item === 'string') {
      const itemCode = convertKoreanToItemCode(converted.item);
      if (itemCode) {
        converted.item = itemCode;
      }
    }
    
    // 대상 플레이어 이름 변환 (동물 닉네임 -> 플레이어 ID)
    if (typeof converted.target === 'string') {
      const playerId = extractPlayerIdFromNickname(converted.target, ANIMAL_NICKNAMES);
      if (playerId !== null) {
        converted.target = playerId;
      }
    }
    
    // receiver 파라미터도 변환 (giveItem에서 사용)
    if (typeof converted.receiver === 'string') {
      const playerId = extractPlayerIdFromNickname(converted.receiver, ANIMAL_NICKNAMES);
      if (playerId !== null) {
        converted.receiver = playerId;
      }
    }
    
    // 메시지 내용에서 아이템 이름 변환
    if (typeof converted.message === 'string') {
      let message = converted.message;
      const items = extractAndConvertItems(message);
      items.forEach(({ korean, code }) => {
        message = message.replace(korean, code);
      });
      converted.message = message;
    }
    
    // 내용(content)에서 아이템 이름 변환
    if (typeof converted.content === 'string') {
      let content = converted.content;
      const items = extractAndConvertItems(content);
      items.forEach(({ korean, code }) => {
        content = content.replace(korean, code);
      });
      converted.content = content;
    }
    
    return converted;
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
    const receiver = params.receiver as number;
    const item = params.item as ItemCode;
    
    if (!playerData.items.includes(item)) {
      throw new Error(`아이템을 보유하지 않음: ${item}`);
    }

    if (typeof receiver !== 'number') {
      throw new Error('받는 사람이 올바르지 않음');
    }

    // 실제 GameService를 통해 아이템 전달 처리
    await this.gameService.handleGiveItem(botId, { receiver, item }, gameId);
    
    // 동물 닉네임으로 로그 출력
    const botNickname = ANIMAL_NICKNAMES[playerData.playerId] || `Bot_${Math.abs(botId)}`;
    const targetNickname = ANIMAL_NICKNAMES[receiver] || `Player_${receiver}`;
    this.logger.log(`${botNickname}이(가) ${targetNickname}에게 ${item} 전달`);
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
    
    if (typeof target !== 'number') {
      throw new Error('감염 대상이 올바르지 않음');
    }

    // 실제 HostActionService를 통해 감염 처리
    const hostAct: HostAct = { infect: target };
    await this.hostActionService.handleHostAction(botId, hostAct);
    
    // 동물 닉네임으로 로그 출력
    const botNickname = ANIMAL_NICKNAMES[playerData.playerId] || `Bot_${Math.abs(botId)}`;
    const targetNickname = ANIMAL_NICKNAMES[target] || `Player_${target}`;
    this.logger.log(`${botNickname}이(가) ${targetNickname}을(를) 감염시킴`);
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

    const zombies = params.zombies as Array<{ playerId: number; targetId?: number; nextRegion?: number }>;
    
    if (!Array.isArray(zombies)) {
      throw new Error('좀비 리스트가 올바르지 않음');
    }

    // 동물 닉네임으로 로그 출력
    const botNickname = ANIMAL_NICKNAMES[playerData.playerId] || `Bot_${Math.abs(botId)}`;
    this.logger.log(`${botNickname}이(가) 좀비 ${zombies.length}마리에게 명령 전달`);

    // ZombieCommand를 사용하여 직접 ZombieService 호출
    for (const zombie of zombies) {
      if (zombie.playerId !== undefined) {
        await this.zombieService.setZombieCommand(gameId, {
          playerId: zombie.playerId,
          targetId: zombie.targetId,
          nextRegion: zombie.nextRegion
        });
      }
    }
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
    // 봇의 동물 닉네임 가져오기
    const botNickname = ANIMAL_NICKNAMES[playerData.playerId] || `Bot_${Math.abs(playerData.playerId)}`;
    const targetNickname = ANIMAL_NICKNAMES[targetId] || `Player_${targetId}`;
    
    // 개인 메시지 전송 로직 (실제 구현 필요)
    this.logger.log(`무전기 메시지: [${botNickname}] : ${message} → ${targetNickname}`);
    
    // TODO: 실제 무전기 메시지 전송 로직 구현
    // 현재는 로그만 출력
  }

  /**
   * 마이크 사용
   */
  private async useMicrophone(
    gameId: string,
    playerData: GamePlayerInRedis,
    message: string
  ): Promise<void> {
    // 봇의 동물 닉네임 가져오기
    const botNickname = ANIMAL_NICKNAMES[playerData.playerId] || `Bot_${Math.abs(playerData.playerId)}`;
    
    // 전체 방송 로직
    for (let regionId = 0; regionId < 6; regionId++) {
      await this.redisPubSubService.publishChatMessage(
        gameId,
        playerData.playerId,
        `[방송] [${botNickname}] : ${message}`,
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
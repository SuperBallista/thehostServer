import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { RedisPubSubService } from '../redis/redisPubSub.service';
import { PlayerManagerService } from '../socket/game/player-manager.service';
import { GameDataService } from '../socket/game/game-data.service';
import { GamePlayerInRedis, ItemCode } from '../socket/game/game.types';
import { userRequest, AuthUser, HostAct, Act } from '../socket/payload.types';
import { ANIMAL_NICKNAMES } from './constants/animal-nicknames';
import { convertKoreanToItemCode, extractAndConvertItems, extractPlayerIdFromNickname, convertZombieControlParams } from './constants/item-mappings';
import { HostActionService } from '../socket/game/host-action.service';
import { GameService } from '../socket/game/game.service';
import { ZombieService } from '../socket/game/zombie.service';
import { ChatService } from '../socket/game/chat.service';

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
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
  ) {}

  /**
   * 액션 실행
   */
  async executeAction(gameId: string, botId: number, action: { action: string; params: Record<string, unknown> }): Promise<void> {
    try {
      // 액션 유효성 검증
      if (!action || !action.action) {
        this.logger.warn(`봇 ${botId}: 유효하지 않은 액션 - action이 없음`);
        return;
      }

      // 파라미터에서 한글 아이템 이름을 코드로 변환
      const convertedParams = this.convertKoreanParamsToCode(action.params || {});
      
      const handler = this.actionMap[action.action];
      if (!handler) {
        this.logger.warn(`봇 ${botId}: 알 수 없는 액션: ${action.action}`);
        return;
      }

      // 봇의 플레이어 데이터 조회
      const playerData = await this.playerManagerService.getPlayerDataByUserId(gameId, botId);
      if (!playerData) {
        this.logger.warn(`봇 플레이어 데이터를 찾을 수 없음: ${botId}`);
        return;
      }

      // 특정 액션에 대한 사전 검증
      if (action.action === 'useItem' || action.action === 'giveItem') {
        const item = convertedParams.item as string;
        if (!item) {
          this.logger.warn(`봇 ${botId}: ${action.action} - 아이템이 지정되지 않음`);
          return;
        }
        if (!playerData.items || !playerData.items.includes(item as ItemCode)) {
          this.logger.warn(`봇 ${botId}: ${action.action} - 보유하지 않은 아이템: ${item}`);
          this.logger.warn(`현재 보유 아이템: ${playerData.items?.join(', ') || '없음'}`);
          return;
        }
      }

      // 액션 실행
      await handler(gameId, botId, playerData, convertedParams);
      
      this.logger.log(`봇 ${botId}: 액션 실행 완료: ${action.action}`, convertedParams);
      
    } catch (error) {
      this.logger.error(`봇 ${botId}: 액션 실행 실패: ${error.message}`, error.stack);
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
    
    if (!location) {
      this.logger.warn(`봇 ${botId}: myStatus.next - 지역이 지정되지 않음`);
      this.logger.warn(`전체 params: ${JSON.stringify(params)}`);
      throw new Error('이동할 지역이 지정되지 않음');
    }
    
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
      this.logger.warn(`봇 ${botId}: 잘못된 지역명: ${location}`);
      this.logger.warn(`가능한 지역: ${Object.keys(regionMap).join(', ')}`);
      throw new Error(`잘못된 지역: ${location}`);
    }

    // 봇은 location state가 없으므로 gameId를 직접 전달해야 함
    // GameService의 updatePlayerStatus는 봇을 위한 특별 처리를 포함하고 있음
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
    let action = params.action as string;
    
    // 한글 액션을 영어로 변환
    const actionMap: Record<string, string> = {
      '도주': 'runaway',
      '숨기': 'hide',
      '유인': 'lure'
    };
    
    if (actionMap[action]) {
      action = actionMap[action];
    }
    
    const validActions = ['runaway', 'hide', 'lure'];
    
    if (!validActions.includes(action)) {
      throw new Error(`잘못된 좀비 대응 액션: ${action}`);
    }

    // 봇은 location state가 없으므로 gameId를 직접 전달해야 함
    // GameService의 updatePlayerStatus는 봇을 위한 특별 처리를 포함하고 있음
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

    // 죽었거나 좀비인 경우 채팅 불가
    if (playerData.state === 'killed' || playerData.state === 'zombie') {
      this.logger.warn(`봇이 죽었거나 좀비 상태여서 채팅 불가: ${botId} (${playerData.state})`);
      return;
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
      this.logger.debug(`receiver 변환: "${converted.receiver}" -> ${playerId}`);
      if (playerId !== null) {
        converted.receiver = playerId;
      } else {
        this.logger.warn(`receiver 닉네임을 플레이어 ID로 변환 실패: "${converted.receiver}"`);
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
    if (!playerData.items || !playerData.items.includes(item)) {
      this.logger.warn(`봇 ${botId}이(가) 보유하지 않은 아이템 사용 시도: ${item}`);
      this.logger.warn(`현재 보유 아이템: ${playerData.items?.join(', ') || '없음'}`);
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

    // 아이템 제거는 GameService에서 자동으로 처리됨
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
    
    if (!playerData.items || !playerData.items.includes(item)) {
      this.logger.warn(`봇 ${botId}이(가) 보유하지 않은 아이템 전달 시도: ${item}`);
      this.logger.warn(`현재 보유 아이템: ${playerData.items?.join(', ') || '없음'}`);
      throw new Error(`아이템을 보유하지 않음: ${item}`);
    }

    if (typeof receiver !== 'number') {
      this.logger.warn(`받는 사람이 올바르지 않음. receiver 타입: ${typeof receiver}, 값: ${receiver}`);
      this.logger.warn(`전체 params: ${JSON.stringify(params)}`);
      throw new Error(`받는 사람이 올바르지 않음: ${receiver} (${typeof receiver})`);
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

    // 닉네임 기반 좀비 리스트를 ID 기반으로 변환
    let zombies: Array<{ playerId: number; targetId?: number; nextRegion?: number }>;
    
    if (Array.isArray(params.zombies)) {
      // 첫 번째 요소를 확인하여 형식 판단
      const firstZombie = (params.zombies as any[])[0];
      if (firstZombie && typeof firstZombie.zombie === 'string') {
        // 닉네임 형식으로 전달된 경우 변환
        zombies = convertZombieControlParams(params.zombies as any[], ANIMAL_NICKNAMES);
      } else {
        // 이미 ID 형식인 경우 (레거시 지원)
        zombies = params.zombies as Array<{ playerId: number; targetId?: number; nextRegion?: number }>;
      }
    } else {
      throw new Error('좀비 리스트가 올바르지 않음');
    }

    // 동물 닉네임으로 로그 출력
    const botNickname = ANIMAL_NICKNAMES[playerData.playerId] || `Bot_${Math.abs(botId)}`;
    this.logger.log(`${botNickname}이(가) 좀비 ${zombies.length}마리에게 명령 전달`);

    // ZombieCommand를 사용하여 직접 ZombieService 호출
    for (const zombie of zombies) {
      if (zombie.playerId !== undefined && zombie.playerId !== -1) {
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
    // 실제 GameService의 handleUseItem을 통해 스프레이 사용 처리
    await this.gameService.handleUseItem(playerData.userId, {
      item: 'spray',
      content: content,
      playerId: playerData.playerId
    }, gameId);
    
    // 동물 닉네임으로 로그 출력
    const botNickname = ANIMAL_NICKNAMES[playerData.playerId] || `Bot_${Math.abs(playerData.userId)}`;
    this.logger.log(`${botNickname}이(가) 그래피티 추가: ${content}`);
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
    // 실제 GameService의 handleUseItem을 통해 무전기 사용 처리
    await this.gameService.handleUseItem(playerData.userId, {
      item: 'wireless',
      targetPlayer: targetId,
      content: message,
      playerId: playerData.playerId
    }, gameId);
    
    // 동물 닉네임으로 로그 출력
    const botNickname = ANIMAL_NICKNAMES[playerData.playerId] || `Bot_${Math.abs(playerData.userId)}`;
    const targetNickname = ANIMAL_NICKNAMES[targetId] || `Player_${targetId}`;
    this.logger.log(`${botNickname}이(가) ${targetNickname}에게 무전기 메시지 전송: ${message}`);
  }

  /**
   * 마이크 사용
   */
  private async useMicrophone(
    gameId: string,
    playerData: GamePlayerInRedis,
    message: string
  ): Promise<void> {
    // 실제 GameService의 handleUseItem을 통해 마이크 사용 처리
    await this.gameService.handleUseItem(playerData.userId, {
      item: 'microphone',
      content: message,
      playerId: playerData.playerId
    }, gameId);
    
    // 동물 닉네임으로 로그 출력
    const botNickname = ANIMAL_NICKNAMES[playerData.playerId] || `Bot_${Math.abs(playerData.userId)}`;
    this.logger.log(`${botNickname}이(가) 마이크로 방송: ${message}`);
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
    // 실제 GameService의 handleUseItem을 통해 전투 아이템 사용 처리
    await this.gameService.handleUseItem(playerData.userId, {
      item: item as ItemCode,
      targetPlayer: targetId,
      playerId: playerData.playerId
    }, gameId);
    
    // 동물 닉네임으로 로그 출력
    const botNickname = ANIMAL_NICKNAMES[playerData.playerId] || `Bot_${Math.abs(playerData.userId)}`;
    const targetNickname = ANIMAL_NICKNAMES[targetId] || `Player_${targetId}`;
    this.logger.log(`${botNickname}이(가) ${targetNickname}에게 ${item} 사용`);
  }

  /**
   * 단순 아이템 사용
   */
  private async useSimpleItem(
    gameId: string,
    playerData: GamePlayerInRedis,
    item: string
  ): Promise<void> {
    // 실제 GameService의 handleUseItem을 통해 아이템 사용 처리
    await this.gameService.handleUseItem(playerData.userId, {
      item: item as ItemCode,
      playerId: playerData.playerId
    }, gameId);
    
    // 동물 닉네임으로 로그 출력
    const botNickname = ANIMAL_NICKNAMES[playerData.playerId] || `Bot_${Math.abs(playerData.userId)}`;
    this.logger.log(`${botNickname}이(가) ${item} 사용`);
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
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { RedisPubSubService } from '../../redis/redisPubSub.service';
import { ITEM_NAMES, ANIMAL_NICKNAMES, GamePlayerInRedis } from './game.types';
import { MyPlayerState, ItemInterface } from '../payload.types';
import { PlayerManagerService } from './player-manager.service';
import { GameDataService } from './game-data.service';
import { GameStateService } from './game-state.service';
import { ChatService } from './chat.service';
import { MemoryService } from '../../bot/memory.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class ItemHandlerService {
  constructor(
    private readonly redisPubSubService: RedisPubSubService,
    private readonly playerManagerService: PlayerManagerService,
    private readonly gameDataService: GameDataService,
    private readonly gameStateService: GameStateService,
    private readonly chatService: ChatService,
    @Inject(forwardRef(() => MemoryService))
    private readonly memoryService: MemoryService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 아이템 전달 처리
   */
  async handleGiveItem(gameId: string, playerData: GamePlayerInRedis, giveItem: { item: ItemInterface; receiver: number }) {
    // 아이템 소유 확인
    const itemIndex = playerData.items.indexOf(giveItem.item);
    if (itemIndex === -1) {
      throw new Error('해당 아이템을 가지고 있지 않습니다');
    }

    // 받는 사람 데이터 가져오기
    const receiverData = await this.playerManagerService.getPlayerData(gameId, giveItem.receiver);
    if (!receiverData) {
      throw new Error('받는 사람을 찾을 수 없습니다');
    }

    // 같은 지역인지 확인
    if (playerData.regionId !== receiverData.regionId) {
      throw new Error('같은 지역에 있는 플레이어에게만 아이템을 전달할 수 있습니다');
    }

    // 죽은 플레이어에게는 아이템을 줄 수 없음
    if (receiverData.state === 'killed') {
      throw new Error('죽은 플레이어에게는 아이템을 전달할 수 없습니다');
    }

    // 아이템 전달 처리
    playerData.items.splice(itemIndex, 1);
    receiverData.items.push(giveItem.item);

    // 데이터 저장
    await this.gameDataService.savePlayerData(gameId, playerData.playerId, playerData);
    await this.gameDataService.savePlayerData(gameId, receiverData.playerId, receiverData);

    // 아이템 이름과 닉네임 준비
    const itemName = ITEM_NAMES[giveItem.item] || giveItem.item;
    const giverNickname = ANIMAL_NICKNAMES[playerData.playerId] || `플레이어${playerData.playerId}`;
    const receiverNickname = ANIMAL_NICKNAMES[receiverData.playerId] || `플레이어${receiverData.playerId}`;

    // 받는 사람이 실제 플레이어인 경우 개인 메시지와 아이템 목록 업데이트 전송
    if (receiverData.userId > 0) {
      await this.redisPubSubService.publishPlayerStatus(gameId, receiverData.playerId, {
        myStatus: {
          state: (receiverData.state === 'host' ? 'host' : 'alive') as MyPlayerState,
          items: receiverData.items,
          region: receiverData.regionId,
          nextRegion: receiverData.next,
          act: receiverData.act
        },
        alarm: {
          message: `${giverNickname}으로부터 ${itemName}을(를) 받았습니다.`,
          img: 'info'
        }
      }, receiverData.playerId);
    }

    return {
      myStatus: {
        state: (playerData.state === 'host' ? 'host' : 'alive') as MyPlayerState,
        items: playerData.items,
        region: playerData.regionId,
        nextRegion: playerData.next,
        act: playerData.act
      },
      alarm: {
        message: `${receiverNickname}에게 ${itemName}을(를) 전달했습니다.`,
        img: 'info'
      }
    };
  }

  /**
   * 낙서스프레이 사용 처리
   */
  async handleSprayUse(gameId: string, playerData: GamePlayerInRedis, content?: string) {
    if (!content || content.trim() === '') {
      throw new Error('낙서 내용을 입력해주세요');
    }

    // 구역 데이터 가져오기
    const regionData = await this.gameDataService.getRegionData(gameId, playerData.regionId);
    if (!regionData) {
      throw new Error('구역 데이터를 찾을 수 없습니다');
    }

    // 메시지 추가
    regionData.regionMessageList.push(content.trim());
    await this.gameDataService.saveRegionData(gameId, playerData.regionId, regionData);

    // 아이템 소모
    const itemIndex = playerData.items.indexOf('spray');
    playerData.items.splice(itemIndex, 1);
    await this.gameDataService.savePlayerData(gameId, playerData.playerId, playerData);

    // 익명성을 위해 시스템 메시지는 보내지 않음
    // 구역 정보 업데이트를 같은 지역의 모든 플레이어에게 전송
    await this.redisPubSubService.publishToRegion(gameId, playerData.regionId, {
      region: regionData
    });

    return this.gameStateService.createPlayerGameUpdate(gameId, playerData.userId, {
      myStatus: {
        state: (playerData.state === 'host' ? 'host' : 'alive') as MyPlayerState,
        items: playerData.items,
        region: playerData.regionId,
        nextRegion: playerData.next,
        act: playerData.act
      },
      alarm: {
        message: '낙서를 성공적으로 남겼습니다.',
        img: 'info'
      }
    });
  }

  /**
   * 지우개 사용 처리
   */
  async handleEraserUse(gameId: string, playerData: GamePlayerInRedis, targetMessage?: number) {
    if (targetMessage === undefined) {
      throw new Error('지울 메시지를 선택해주세요');
    }

    // 구역 데이터 가져오기
    const regionData = await this.gameDataService.getRegionData(gameId, playerData.regionId);
    if (!regionData) {
      throw new Error('구역 데이터를 찾을 수 없습니다');
    }

    // 메시지 인덱스 확인
    if (targetMessage < 0 || targetMessage >= regionData.regionMessageList.length) {
      throw new Error('존재하지 않는 메시지입니다');
    }

    // 메시지 삭제 (null로 설정하여 삭제 흔적 남김)
    regionData.regionMessageList[targetMessage] = null;
    await this.gameDataService.saveRegionData(gameId, playerData.regionId, regionData);

    // 아이템 소모
    const itemIndex = playerData.items.indexOf('eraser');
    playerData.items.splice(itemIndex, 1);
    await this.gameDataService.savePlayerData(gameId, playerData.playerId, playerData);

    // 구역 정보 업데이트를 모든 플레이어에게 전송
    await this.redisPubSubService.publishToRegion(gameId, playerData.regionId, {
      region: regionData
    });

    return this.gameStateService.createPlayerGameUpdate(gameId, playerData.userId, {
      myStatus: {
        state: (playerData.state === 'host' ? 'host' : 'alive') as MyPlayerState,
        items: playerData.items,
        region: playerData.regionId,
        nextRegion: playerData.next,
        act: playerData.act
      },
      alarm: {
        message: '낙서를 성공적으로 지웠습니다.',
        img: 'info'
      }
    });
  }

  /**
   * 진단키트 사용 처리
   */
  async handleVirusCheckerUse(gameId: string, playerData: GamePlayerInRedis) {
    // 아이템 소모
    const itemIndex = playerData.items.indexOf('virusChecker');
    playerData.items.splice(itemIndex, 1);
    await this.gameDataService.savePlayerData(gameId, playerData.playerId, playerData);

    // 감염 여부 확인
    const isInfected = playerData.infected !== null;
    const message = isInfected 
      ? '바이러스에 감염되어 있습니다.'
      : '감염되지 않았습니다.';

    return this.gameStateService.createPlayerGameUpdate(gameId, playerData.userId, {
      myStatus: {
        state: (playerData.state === 'host' ? 'host' : 'alive') as MyPlayerState,
        items: playerData.items,
        region: playerData.regionId,
        nextRegion: playerData.next,
        act: playerData.act
      },
      alarm: {
        message,
        img: isInfected ? 'warning' : 'info'
      }
    });
  }

  /**
   * 응급치료제 사용 처리
   */
  async handleMedicineUse(gameId: string, playerData: GamePlayerInRedis) {
    // 아이템 소모 (감염 여부와 상관없이 소모)
    const itemIndex = playerData.items.indexOf('medicine');
    playerData.items.splice(itemIndex, 1);
    
    // 감염되어 있었다면 치료 (조용히 처리)
    if (playerData.infected !== null && playerData.infected > 0) {
      playerData.infected = null;
    }
    
    await this.gameDataService.savePlayerData(gameId, playerData.playerId, playerData);

    // 감염 여부와 상관없이 동일한 메시지 반환
    return this.gameStateService.createPlayerGameUpdate(gameId, playerData.userId, {
      myStatus: {
        state: (playerData.state === 'host' ? 'host' : 'alive') as MyPlayerState,
        items: playerData.items,
        region: playerData.regionId,
        nextRegion: playerData.next,
        act: playerData.act
      },
      alarm: {
        message: '응급치료제를 사용했습니다.',
        img: 'info'
      }
    });
  }

  /**
   * 백신 재료 조합 처리
   */
  async handleVaccineMaterialUse(gameId: string, playerData: GamePlayerInRedis) {
    // 필요한 재료들
    const requiredMaterials: ItemInterface[] = ['vaccineMaterialA', 'vaccineMaterialB', 'vaccineMaterialC'];
    
    // 모든 재료를 가지고 있는지 확인
    const hasMaterials = requiredMaterials.every(material => playerData.items.includes(material));
    
    if (!hasMaterials) {
      throw new Error('백신을 만들기 위한 재료가 부족합니다');
    }

    // 재료 소모
    for (const material of requiredMaterials) {
      const index = playerData.items.indexOf(material);
      if (index !== -1) {
        playerData.items.splice(index, 1);
      }
    }

    // 백신 추가
    playerData.items.push('vaccine');
    await this.gameDataService.savePlayerData(gameId, playerData.playerId, playerData);

    // 시스템 메시지 전송
    const playerNickname = ANIMAL_NICKNAMES[playerData.playerId] || `플레이어${playerData.playerId}`;
    const systemMessage = `${playerNickname}이(가) 백신을 제작했습니다!`;
    await this.chatService.sendSystemMessage(gameId, systemMessage, playerData.regionId);

    return this.gameStateService.createPlayerGameUpdate(gameId, playerData.userId, {
      myStatus: {
        state: (playerData.state === 'host' ? 'host' : 'alive') as MyPlayerState,
        items: playerData.items,
        region: playerData.regionId,
        nextRegion: playerData.next,
        act: playerData.act
      },
      alarm: {
        message: '백신 재료를 조합하여 백신을 만들었습니다!',
        img: 'success'
      }
    });
  }

  /**
   * 마이크 사용 처리
   */
  async handleMicrophoneUse(gameId: string, playerData: GamePlayerInRedis, content?: string) {
    if (!content || content.trim() === '') {
      throw new Error('방송할 메시지를 입력해주세요');
    }

    // 아이템 소모
    const itemIndex = playerData.items.indexOf('microphone');
    playerData.items.splice(itemIndex, 1);
    await this.gameDataService.savePlayerData(gameId, playerData.playerId, playerData);

    // 전체 방송 - 통합된 마이크 방송 기능 사용
    const playerNickname = ANIMAL_NICKNAMES[playerData.playerId] || `플레이어${playerData.playerId}`;
    await this.chatService.sendMicrophoneBroadcast(gameId, playerData.playerId, playerNickname, content);

    return this.gameStateService.createPlayerGameUpdate(gameId, playerData.userId, {
      myStatus: {
        state: (playerData.state === 'host' ? 'host' : 'alive') as MyPlayerState,
        items: playerData.items,
        region: playerData.regionId,
        nextRegion: playerData.next,
        act: playerData.act
      },
      alarm: {
        message: '전체 방송을 전송했습니다.',
        img: 'info'
      }
    });
  }

  /**
   * 무전기 사용 처리
   */
  async handleWirelessUse(gameId: string, playerData: GamePlayerInRedis, targetPlayer?: number, content?: string) {
    if (targetPlayer === undefined || !content || content.trim() === '') {
      throw new Error('대상과 메시지를 입력해주세요');
    }

    // 대상 플레이어 데이터 가져오기
    const targetData = await this.playerManagerService.getPlayerData(gameId, targetPlayer);
    if (!targetData) {
      throw new Error('대상을 찾을 수 없습니다');
    }

    // 자기 자신에게는 무전을 보낼 수 없음
    if (playerData.playerId === targetPlayer) {
      throw new Error('자기 자신에게는 무전을 보낼 수 없습니다');
    }

    // 아이템 소모
    const itemIndex = playerData.items.indexOf('wireless');
    playerData.items.splice(itemIndex, 1);
    await this.gameDataService.savePlayerData(gameId, playerData.playerId, playerData);

    const messageContent = content.trim();
    const playerNickname = ANIMAL_NICKNAMES[playerData.playerId] || `플레이어${playerData.playerId}`;
    const targetNickname = ANIMAL_NICKNAMES[targetPlayer] || `플레이어${targetPlayer}`;

    // 발신자에게 전송한 메시지 표시
    await this.chatService.sendSystemMessage(
      gameId, 
      `(귓속말) ${targetNickname}에게: ${messageContent}`, 
      playerData.regionId
    );

    // 수신자에게 무전 메시지 전송 (살아있는 플레이어에게만)
    if (['alive', 'host'].includes(targetData.state)) {
      // 봇인 경우 메모리에 저장
      if (targetData.userId < 0) {
        // 현재 게임 턴 가져오기
        const gameData = await this.redisService.getAndParse(`game:${gameId}`);
        const currentTurn = gameData?.turn || 1;
        
        // 봇 메모리에 무전 메시지 저장
        await this.memoryService.addWirelessMessage(
          gameId,
          targetData.userId,
          playerNickname,
          messageContent,
          currentTurn
        );
      } else {
        // 실제 플레이어에게 전송
        await this.redisPubSubService.publishPlayerStatus(gameId, targetData.playerId, {
          region: {
            chatLog: [{
              system: false,
              message: `(무전) ${playerNickname}: ${messageContent}`,
              timeStamp: new Date()
            }],
            regionMessageList: []
          }
        }, targetData.playerId);
      }
    }

    return this.gameStateService.createPlayerGameUpdate(gameId, playerData.userId, {
      myStatus: {
        state: (playerData.state === 'host' ? 'host' : 'alive') as MyPlayerState,
        items: playerData.items,
        region: playerData.regionId,
        nextRegion: playerData.next,
        act: playerData.act
      },
      alarm: {
        message: `${targetNickname}에게 무전을 전송했습니다.`,
        img: 'info'
      }
    });
  }
}
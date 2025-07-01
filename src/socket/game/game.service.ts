// src/socket/game/game.service.ts
import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { RedisPubSubService } from '../../redis/redisPubSub.service';
import { Game, GamePlayer, REGION_NAMES, ITEM_NAMES } from './game.types';
import { Room, ItemInterface } from '../payload.types';
import { getOrderRandom } from '../utils/randomManager';
import { userDataResponse } from '../payload.types';
import { userShortInfo } from '../data.types';
import { GameTurnService } from './gameTurn.service';
import { PlayerManagerService } from './player-manager.service';
import { GameDataService } from './game-data.service';
import { GameStateService } from './game-state.service';
import { ChatService } from './chat.service';
import { HostActionService } from './host-action.service';
import { ConnectionService } from '../connection.service';
import { Socket } from 'socket.io';

@Injectable()
export class GameService {
  constructor(
    private readonly redisPubSubService: RedisPubSubService,
    private readonly gameTurnService: GameTurnService,
    private readonly playerManagerService: PlayerManagerService,
    private readonly gameDataService: GameDataService,
    private readonly gameStateService: GameStateService,
    private readonly chatService: ChatService,
    private readonly hostActionService: HostActionService,
    private readonly connectionService: ConnectionService,
  ) {}

  /**
   * 게임 시작
   */
  async gameStart(userId: number): Promise<userDataResponse> {
    const locationState = await this.playerManagerService.getPlayerLocationState(userId);
    if (!locationState.roomId) {
      throw new WsException('방 정보를 찾을 수 없습니다');
    }
    
    const roomData = await this.gameDataService.getWaitRoomData(locationState.roomId);
    
    // 방장 권한 확인
    if (roomData.hostUserId !== userId) {
      throw new WsException('게임을 시작할 권한이 없습니다');
    }
    
    const gameData = await this.makeGameData(roomData);
    
    if (!roomData.date) {
      throw new WsException('색인 오류가 발생하였습니다');
    }
    
    await this.gameDataService.deleteWaitingRoomList(roomData.id, roomData.date);

    return gameData;
  }

  /**
   * 게임 참가 (클라이언트별 초기화)
   */
  async subscribeGameStart(client: Socket, userId: number, users: userShortInfo[], roomId: string) {
    // 1. 사용자 확인
    if (!this.isUserInRoom(userId, users)) {
      throw new WsException(`유저가 게임방에 없습니다`);
    }

    // 2. 위치 상태 업데이트
    await this.playerManagerService.updateLocationState(userId, 'game', roomId);
    
    try {
      // 3. 게임 데이터 로드
      const gameData = await this.gameDataService.getGameData(roomId);
      
      // 4. 플레이어 데이터 로드
      const playerDataResult = await this.playerManagerService.loadAllPlayersWithRetry(roomId, userId);
      
      if (!playerDataResult.myPlayerData) {
        throw new WsException(`게임 데이터를 찾을 수 없습니다. 잠시 후 다시 시도해주세요.`);
      }

      // 5. 플레이어를 게임 room과 region room에 join
      client.join(`game:${roomId}`);
      await this.playerManagerService.movePlayerToRegion(
        client, 
        roomId, 
        userId, 
        playerDataResult.myPlayerData.regionId, 
        true
      );
      
      // 6. 응답 생성 (시스템 메시지는 응답에 포함)
      const response = await this.gameStateService.createGameStartResponse(
        gameData,
        playerDataResult.myPlayerData,
        playerDataResult.allPlayers,
        roomId
      );
      
      client.emit('update', response);
      return response;
      
    } catch (error) {
      throw new WsException(`게임 시작 처리 중 오류: ${error}`);
    }
  }

  /**
   * 채팅 메시지 처리 위임
   */
  async handleChatMessage(userId: number, chatMessage: any): Promise<userDataResponse> {
    return this.chatService.handleChatMessage(userId, chatMessage);
  }

  /**
   * 호스트 액션 처리 위임
   */
  async handleHostAction(userId: number, hostAct: any): Promise<userDataResponse> {
    return this.hostActionService.handleHostAction(userId, hostAct);
  }

  /**
   * 플레이어 상태 업데이트 (이동 장소 설정 등)
   */
  async updatePlayerStatus(userId: number, status: any): Promise<userDataResponse> {
    console.log('updatePlayerStatus 호출:', { userId, status });
    
    // 현재 위치 상태 확인
    const locationState = await this.playerManagerService.getPlayerLocationState(userId);
    if (locationState.state !== 'game' || !locationState.roomId) {
      throw new WsException('게임 중이 아닙니다');
    }

    const gameId = locationState.roomId;
    
    // 플레이어 데이터 가져오기
    const playerData = await this.playerManagerService.getPlayerDataByUserId(gameId, userId);
    if (!playerData) {
      throw new WsException('플레이어 데이터를 찾을 수 없습니다');
    }

    // next 필드가 있으면 다음 이동 장소 업데이트
    if (status.next !== undefined && status.next !== playerData.next) {
      console.log('이동 장소 업데이트:', {
        currentNext: playerData.next,
        newNext: status.next,
        type: typeof status.next,
        regionNames: REGION_NAMES
      });
      
      // Redis에 다음 이동 장소 저장
      playerData.next = Number(status.next); // 숫자로 변환
      await this.gameDataService.savePlayerData(gameId, playerData.playerId, playerData);
      
      // 시스템 메시지 전송
      const nextRegion = Number(status.next);
      const regionName = REGION_NAMES[nextRegion] || '알 수 없는 지역';
      const systemMessage = `다음 턴에 ${regionName}으로 이동합니다.`;
      console.log('시스템 메시지:', { nextRegion, regionName, systemMessage });
      
      await this.chatService.sendSystemMessage(gameId, systemMessage, playerData.regionId);
    }

    // 업데이트된 상태 반환
    return this.gameStateService.createPlayerGameUpdate(gameId, userId, {});
  }

  /**
   * 플레이어 region 이동 위임
   */
  async movePlayerToRegion(
    client: Socket, 
    gameId: string, 
    userId: number, 
    newRegionId: number, 
    isFirstJoin: boolean = false
  ): Promise<void> {
    return this.playerManagerService.movePlayerToRegion(
      client, 
      gameId, 
      userId, 
      newRegionId, 
      isFirstJoin
    );
  }

  // === Private Helper Methods ===

  private isUserInRoom(userId: number, users: userShortInfo[]): boolean {
    return users.some(user => user.id === userId);
  }

  private async makeGameData(roomData: Room): Promise<userDataResponse> {
    roomData.players = await this.fillBotPlayer(roomData);
    const hostPlayer = await this.selectHost(roomData.players);
    const selectedHost = roomData.players[hostPlayer];
    const isRealPlayer = selectedHost.id > 0;
    
    console.log(`\n=== 숙주 선택 ===`);
    console.log(`인덱스: ${hostPlayer}, ${isRealPlayer ? '🎮 실제 플레이어' : '🤖 봇'}: ${selectedHost.nickname} (ID: ${selectedHost.id})`);
    console.log(`실제 플레이어 목록:`, roomData.players.filter(p => p.id > 0).map(p => `${p.nickname}(ID:${p.id})`));
    console.log(`==================\n`);
    
    const shuffledPlayer = getOrderRandom(roomData.players);
    const players = await this.setPlayerInformation(shuffledPlayer, hostPlayer);
    
    // 게임 데이터 세팅 준비 완료
    await this.createNewGameData(roomData.id, hostPlayer, players);
    
    // 첫 턴 아이템 지급
    await this.gameTurnService.onTurnStart(roomData.id, 1);

    // 모든 플레이어에게 게임 시작 알림
    const playerIds = roomData.players.map(p => p.id);
    await this.redisPubSubService.publishGameStart(roomData.id, roomData.id, playerIds);
    
    // PubSub 이벤트 처리를 위한 짧은 대기
    await new Promise(resolve => setTimeout(resolve, 100));

    return { locationState: 'game' };
  }

  private async selectHost(players: userShortInfo[]): Promise<number> {
    return Math.floor(Math.random() * players.length);
  }

  private async fillBotPlayer(roomData: Room): Promise<userShortInfo[]> {
    if (roomData.bot) {
      let i = 1;
      while (roomData.players.length < 20) {
        roomData.players.push({ nickname: `botPlayer${i}`, id: i * -1 });
        i++;
      }
    }
    return roomData.players;
  }

  private setPlayerInformation(players: userShortInfo[], hostPlayer: number): GamePlayer[] {
    let regionNumber = 6;
    if (players.length < 10) {
      regionNumber = 3;
    } else if (players.length < 14) {
      regionNumber = 4;
    } else if (players.length < 18) {
      regionNumber = 5;
    }

    const gamePlayers = players.map((player, index) => 
      new GamePlayer(index, player.id, index % regionNumber, index === hostPlayer, regionNumber)
    );

    return gamePlayers;
  }

  private async createNewGameData(roomId: string, hostPlayer: number, players: GamePlayer[]) {
    // 게임 메인 데이터 생성
    const game = new Game(roomId, players[hostPlayer].userId);
    await this.gameDataService.saveGameData(roomId, game.recordData());

    // 호스트 데이터 초기화
    await this.hostActionService.initializeHost(roomId, hostPlayer);

    // 플레이어 데이터 저장
    for (const player of players) {
      await this.gameDataService.savePlayerData(roomId, player.playerId, player.recordData());
    }
  }

  /**
   * 아이템 전달 처리
   */
  async handleGiveItem(userId: number, giveItem: { receiver: number; item: ItemInterface }, gameId: string): Promise<userDataResponse> {
    console.log('handleGiveItem 시작:', { userId, giveItem, gameId });
    
    // gameId가 직접 전달되므로 location state 확인 불필요
    const playerData = await this.playerManagerService.getPlayerDataByUserId(gameId, userId);
    if (!playerData) {
      throw new Error('플레이어 데이터를 찾을 수 없습니다');
    }

    // 죽은 플레이어는 아이템을 줄 수 없음
    if (playerData.state === 'killed') {
      throw new Error('죽은 플레이어는 아이템을 전달할 수 없습니다');
    }

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

    // 시스템 메시지 전송
    const itemName = ITEM_NAMES[giveItem.item] || giveItem.item;
    
    // 닉네임 리스트 (프론트엔드와 동일)
    const nicknameList = [`자책하는두더지`, `말많은다람쥐`, `웃는얼굴의하마`, `엿듣는호랑이`, `눈치빠른고양이`, `조용한여우`, `겁많은토끼`, `고집센너구리`, `유난떠는수달`, `낙서많은부엉이`, `분위기타는족제비`, `장난기있는펭귄`, `침착한판다`, `의심많은고슴도치`, `폭로하는까마귀`, `살금살금곰`, `혼잣말하는늑대`, `사람좋은삵`, `침묵하는도롱뇽`, `거짓말하는수리부엉이`];
    
    const giverNickname = nicknameList[playerData.playerId] || `플레이어${playerData.playerId}`;
    const receiverNickname = nicknameList[receiverData.playerId] || `플레이어${receiverData.playerId}`;

    // 같은 지역의 모든 플레이어에게 공개 메시지 전송
    const publicMessage = `${giverNickname}이(가) ${receiverNickname}에게 ${itemName}을(를) 전달했습니다.`;
    await this.chatService.sendSystemMessage(gameId, publicMessage, playerData.regionId);

    // 주는 사람에게 개인 메시지 (현재 함수 호출자가 받음)
    // 이미 return에서 처리됨

    // 받는 사람이 실제 플레이어인 경우 개인 메시지와 아이템 목록 업데이트 전송
    if (receiverData.userId > 0) {
      await this.redisPubSubService.publishPlayerStatus(gameId, receiverData.playerId, {
        myStatus: {
          state: receiverData.state,
          items: receiverData.items,
          region: receiverData.regionId,
          next: receiverData.next,
          act: receiverData.act
        },
        alarm: {
          message: `${giverNickname}으로부터 ${itemName}을(를) 받았습니다.`,
          img: 'info'
        }
      }, receiverData.playerId);
    }

    // 아이템을 준 사람에게 업데이트된 상태와 개인 알림 반환
    return this.gameStateService.createPlayerGameUpdate(gameId, userId, {
      myStatus: {
        state: playerData.state,
        items: playerData.items,
        region: playerData.regionId,
        next: playerData.next,
        act: playerData.act
      },
      alarm: {
        message: `${receiverNickname}에게 ${itemName}을(를) 전달했습니다.`,
        img: 'info'
      }
    });
  }
}
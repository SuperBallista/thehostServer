// src/socket/game/game.service.ts
import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { RedisPubSubService } from '../../redis/redisPubSub.service';
import { Game, GamePlayer, GamePlayerInRedis, REGION_NAMES, ITEM_NAMES, ANIMAL_NICKNAMES } from './game.types';
import { Room, ItemInterface, MyPlayerState } from '../payload.types';
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
    console.log(`[subscribeGameStart] 위치 상태 업데이트 완료 - userId: ${userId}, state: 'game', roomId: ${roomId}`);
    
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

    // 구역 데이터 초기화 (모든 구역에 대해 빈 채팅 로그와 메시지 리스트 생성)
    const maxRegions = Math.max(...players.map(p => p.regionId)) + 1;
    for (let regionId = 0; regionId < maxRegions; regionId++) {
      const regionData = {
        chatLog: [],
        regionMessageList: []
      };
      await this.gameDataService.saveRegionData(roomId, regionId, regionData);
    }
  }

  /**
   * 게임 중 나가기 처리
   */
  async exitGame(userId: number, client?: Socket): Promise<userDataResponse> {
    console.log('게임 나가기 요청:', { userId });
    
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

    // 플레이어 상태를 left로 변경
    playerData.state = 'left';
    await this.gameDataService.savePlayerData(gameId, playerData.playerId, playerData);
    
    console.log('플레이어 게임 나가기 처리:', { 
      userId, 
      playerId: playerData.playerId,
      gameId 
    });

    // 동물 닉네임 가져오기 (게임 중에는 실제 닉네임 노출 금지)
    const animalNickname = ANIMAL_NICKNAMES[playerData.playerId] || '알 수 없는 플레이어';

    // 같은 지역의 플레이어들에게 시스템 메시지 전송
    const exitMessage = `${animalNickname}님이 게임에서 나갔습니다`;
    console.log(`시스템 메시지 전송 시도: ${exitMessage}, region: ${playerData.regionId}`);
    await this.chatService.sendSystemMessage(gameId, exitMessage, playerData.regionId);

    // 게임의 모든 플레이어 데이터 가져오기
    const { allPlayers } = await this.playerManagerService.loadAllPlayersWithRetry(gameId, userId);
    console.log(`전체 플레이어 수: ${allPlayers.length}`);
    
    // 생존자 리스트 업데이트를 위한 데이터 준비
    const survivorListUpdates: { [userId: number]: any } = {};
    
    for (const player of allPlayers) {
      if (player.userId > 0 && player.state !== 'left') {
        const survivorList = await this.gameStateService.createSurvivorList(allPlayers, player);
        survivorListUpdates[player.userId] = { survivorList };
      }
    }
    
    // Socket.IO 서버가 있는지 확인
    if (!this.redisPubSubService.io) {
      console.error('Socket.IO 서버가 초기화되지 않음');
    } else {
      // 게임 룸의 모든 소켓 가져오기
      const gameSockets = await this.redisPubSubService.io.in(`game:${gameId}`).fetchSockets();
      console.log(`게임 룸의 소켓 수: ${gameSockets.length}`);
      
      // 각 플레이어에게 개인화된 생존자 리스트 전송
      for (const socket of gameSockets) {
        const socketUserId = socket.data.id;
        if (socketUserId && survivorListUpdates[socketUserId]) {
          socket.emit('update', survivorListUpdates[socketUserId]);
          console.log(`생존자 리스트 업데이트 전송: userId=${socketUserId}`);
        }
      }
    }

    // 소켓에서 room 나가기 (client가 전달된 경우)
    if (client) {
      await client.leave(`game:${gameId}`);
      await client.leave(`game:${gameId}:region:${playerData.regionId}`);
    }

    // 위치 상태를 로비로 변경
    await this.playerManagerService.updateLocationState(userId, 'lobby', '');

    // 게임 중에는 방 데이터가 없으므로 게임 데이터 정리만 확인
    // 남은 실제 플레이어가 있는지 확인
    const remainingPlayers = allPlayers.filter(p => p.userId > 0 && p.state !== 'left');
    if (remainingPlayers.length === 0) {
      console.log('남은 플레이어가 없음 - 게임 데이터 정리');
      await this.cleanupGameData(gameId);
    }

    return { 
      exitRoom: true, 
      locationState: 'lobby' 
    };
  }

  /**
   * 게임 데이터 정리
   */
  private async cleanupGameData(gameId: string): Promise<void> {
    // 게임 데이터 정리는 GameDataService에 위임
    await this.gameDataService.cleanupGameData(gameId);
    console.log(`게임 데이터 정리 완료: ${gameId}`);
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
    
    const giverNickname = ANIMAL_NICKNAMES[playerData.playerId] || `플레이어${playerData.playerId}`;
    const receiverNickname = ANIMAL_NICKNAMES[receiverData.playerId] || `플레이어${receiverData.playerId}`;

    // 같은 지역의 모든 플레이어에게 공개 메시지 전송
    const publicMessage = `${giverNickname}이(가) ${receiverNickname}에게 ${itemName}을(를) 전달했습니다.`;
    await this.chatService.sendSystemMessage(gameId, publicMessage, playerData.regionId);

    // 주는 사람에게 개인 메시지 (현재 함수 호출자가 받음)
    // 이미 return에서 처리됨

    // 받는 사람이 실제 플레이어인 경우 개인 메시지와 아이템 목록 업데이트 전송
    if (receiverData.userId > 0) {
      await this.redisPubSubService.publishPlayerStatus(gameId, receiverData.playerId, {
        myStatus: {
          state: (receiverData.state === 'host' ? 'host' : 'alive') as MyPlayerState,
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
        state: (playerData.state === 'host' ? 'host' : 'alive') as MyPlayerState,
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

  /**
   * 아이템 사용 처리
   */
  async handleUseItem(userId: number, useItem: { item: ItemInterface; targetPlayer?: number; content?: string; targetMessage?: number }, gameId: string): Promise<userDataResponse> {
    console.log('handleUseItem 시작:', { userId, useItem, gameId });
    
    // 플레이어 데이터 가져오기
    const playerData = await this.playerManagerService.getPlayerDataByUserId(gameId, userId);
    if (!playerData) {
      throw new Error('플레이어 데이터를 찾을 수 없습니다');
    }

    // 죽은 플레이어는 아이템을 사용할 수 없음
    if (playerData.state === 'killed') {
      throw new Error('죽은 플레이어는 아이템을 사용할 수 없습니다');
    }

    // 아이템 소유 확인
    const itemIndex = playerData.items.indexOf(useItem.item);
    if (itemIndex === -1) {
      throw new Error('해당 아이템을 가지고 있지 않습니다');
    }

    // 아이템별 처리
    switch (useItem.item) {
      case 'spray':
        return await this.handleSprayUse(gameId, playerData, useItem.content);
      case 'eraser':
        return await this.handleEraserUse(gameId, playerData, useItem.targetMessage);
      case 'virusChecker':
        return await this.handleVirusCheckerUse(gameId, playerData);
      case 'medicine':
        return await this.handleMedicineUse(gameId, playerData);
      case 'vaccine':
        return await this.handleVaccineUse(gameId, playerData);
      case 'shotgun':
        return await this.handleShotgunUse(gameId, playerData, useItem.targetPlayer);
      case 'wireless':
        return await this.handleWirelessUse(gameId, playerData, useItem.targetPlayer, useItem.content);
      case 'microphone':
        return await this.handleMicrophoneUse(gameId, playerData, useItem.content);
      case 'vaccineMaterialA':
      case 'vaccineMaterialB':
      case 'vaccineMaterialC':
        return await this.handleVaccineMaterialUse(gameId, playerData, useItem.item);
      default:
        throw new Error('알 수 없는 아이템입니다');
    }
  }

  /**
   * 낙서스프레이 사용 처리
   */
  private async handleSprayUse(gameId: string, playerData: any, content?: string): Promise<userDataResponse> {
    if (!content || content.trim() === '') {
      throw new Error('낙서 내용을 입력해주세요');
    }

    // 현재 구역의 낙서 목록 가져오기
    const regionData = await this.gameDataService.getRegionData(gameId, playerData.regionId);
    if (!regionData) {
      throw new Error('구역 데이터를 찾을 수 없습니다');
    }

    // 낙서 추가
    regionData.regionMessageList.push(content.trim());
    await this.gameDataService.saveRegionData(gameId, playerData.regionId, regionData);

    // 아이템 소모
    const itemIndex = playerData.items.indexOf('spray');
    playerData.items.splice(itemIndex, 1);
    await this.gameDataService.savePlayerData(gameId, playerData.playerId, playerData);

    // 익명성을 위해 시스템 메시지 제거 - 작성자에게만 개인 알림
    // 구역 정보 업데이트를 모든 플레이어에게 전송 (낙서 내용은 익명으로 표시)
    await this.redisPubSubService.publishToRegion(gameId, playerData.regionId, {
      region: regionData
    });

    return this.gameStateService.createPlayerGameUpdate(gameId, playerData.userId, {
      myStatus: {
        state: (playerData.state === 'host' ? 'host' : 'alive') as MyPlayerState,
        items: playerData.items,
        region: playerData.regionId,
        next: playerData.next,
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
  private async handleEraserUse(gameId: string, playerData: any, targetMessage?: number): Promise<userDataResponse> {
    if (targetMessage === undefined) {
      throw new Error('지울 메시지를 선택해주세요');
    }

    // 현재 구역의 낙서 목록 가져오기
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

    // 익명성을 위해 시스템 메시지 제거 - 작성자에게만 개인 알림
    // 구역 정보 업데이트를 모든 플레이어에게 전송 (낙서 삭제는 익명으로 표시)
    await this.redisPubSubService.publishToRegion(gameId, playerData.regionId, {
      region: regionData
    });

    return this.gameStateService.createPlayerGameUpdate(gameId, playerData.userId, {
      myStatus: {
        state: (playerData.state === 'host' ? 'host' : 'alive') as MyPlayerState,
        items: playerData.items,
        region: playerData.regionId,
        next: playerData.next,
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
  private async handleVirusCheckerUse(gameId: string, playerData: any): Promise<userDataResponse> {
    // 아이템 소모
    const itemIndex = playerData.items.indexOf('virusChecker');
    playerData.items.splice(itemIndex, 1);
    await this.gameDataService.savePlayerData(gameId, playerData.playerId, playerData);

    // 감염 여부 확인
    const isInfected = playerData.infected !== null && playerData.infected > 0;
    const message = isInfected 
      ? `감염되어 있습니다. ${playerData.infected}턴 후에 좀비로 변이됩니다.`
      : '감염되지 않았습니다.';

    return this.gameStateService.createPlayerGameUpdate(gameId, playerData.userId, {
      myStatus: {
        state: (playerData.state === 'host' ? 'host' : 'alive') as MyPlayerState,
        items: playerData.items,
        region: playerData.regionId,
        next: playerData.next,
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
  private async handleMedicineUse(gameId: string, playerData: any): Promise<userDataResponse> {
    // 감염 상태 확인
    if (playerData.infected === null || playerData.infected <= 0) {
      throw new Error('감염되지 않은 상태입니다');
    }

    // 아이템 소모
    const itemIndex = playerData.items.indexOf('medicine');
    playerData.items.splice(itemIndex, 1);
    
    // 감염 치료
    playerData.infected = null;
    await this.gameDataService.savePlayerData(gameId, playerData.playerId, playerData);

    return this.gameStateService.createPlayerGameUpdate(gameId, playerData.userId, {
      myStatus: {
        state: (playerData.state === 'host' ? 'host' : 'alive') as MyPlayerState,
        items: playerData.items,
        region: playerData.regionId,
        next: playerData.next,
        act: playerData.act
      },
      alarm: {
        message: '감염이 치료되었습니다.',
        img: 'success'
      }
    });
  }

  /**
   * 백신 사용 처리
   */
  private async handleVaccineUse(gameId: string, playerData: any): Promise<userDataResponse> {
    // 숙주인지 확인
    if (playerData.state !== 'host') {
      throw new Error('숙주에게만 백신을 사용할 수 있습니다');
    }

    // 아이템 소모
    const itemIndex = playerData.items.indexOf('vaccine');
    playerData.items.splice(itemIndex, 1);
    await this.gameDataService.savePlayerData(gameId, playerData.playerId, playerData);

    // 게임 종료 처리 (생존자 승리)
    await this.gameDataService.setGameEnd(gameId, 'cure');

    // 모든 플레이어에게 게임 종료 알림
    await this.redisPubSubService.publishToGame(gameId, {
      endGame: 'cure',
      alarm: {
        message: '백신 투여 성공! 생존자들이 승리했습니다!',
        img: 'success'
      }
    });

    return {
      endGame: 'cure',
      alarm: {
        message: '백신 투여 성공! 생존자들이 승리했습니다!',
        img: 'success'
      }
    };
  }

  /**
   * 산탄총 사용 처리
   */
  private async handleShotgunUse(gameId: string, playerData: any, targetPlayer?: number): Promise<userDataResponse> {
    if (targetPlayer === undefined) {
      throw new Error('대상을 선택해주세요');
    }

    // 대상 플레이어 데이터 가져오기
    const targetData = await this.playerManagerService.getPlayerData(gameId, targetPlayer);
    if (!targetData) {
      throw new Error('대상을 찾을 수 없습니다');
    }

    // 좀비인지 확인
    if (targetData.state !== 'zombie') {
      throw new Error('좀비에게만 사용할 수 있습니다');
    }

    // 같은 지역인지 확인
    if (playerData.regionId !== targetData.regionId) {
      throw new Error('같은 지역에 있는 좀비에게만 사용할 수 있습니다');
    }

    // 아이템 소모
    const itemIndex = playerData.items.indexOf('shotgun');
    playerData.items.splice(itemIndex, 1);
    await this.gameDataService.savePlayerData(gameId, playerData.playerId, playerData);

    // 좀비 제거
    targetData.state = 'killed';
    await this.gameDataService.savePlayerData(gameId, targetData.playerId, targetData);

    // 시스템 메시지 전송
    const playerNickname = ANIMAL_NICKNAMES[playerData.playerId] || `플레이어${playerData.playerId}`;
    const targetNickname = ANIMAL_NICKNAMES[targetData.playerId] || `플레이어${targetData.playerId}`;
    const systemMessage = `${playerNickname}이(가) ${targetNickname}을(를) 사살했습니다.`;
    await this.chatService.sendSystemMessage(gameId, systemMessage, playerData.regionId);

    return this.gameStateService.createPlayerGameUpdate(gameId, playerData.userId, {
      myStatus: {
        state: (playerData.state === 'host' ? 'host' : 'alive') as MyPlayerState,
        items: playerData.items,
        region: playerData.regionId,
        next: playerData.next,
        act: playerData.act
      },
      alarm: {
        message: `${targetNickname}을(를) 성공적으로 사살했습니다.`,
        img: 'success'
      }
    });
  }

  /**
   * 무전기 사용 처리
   */
  private async handleWirelessUse(gameId: string, playerData: any, targetPlayer?: number, content?: string): Promise<userDataResponse> {
    if (targetPlayer === undefined || !content || content.trim() === '') {
      throw new Error('대상과 메시지를 입력해주세요');
    }

    // 대상 플레이어 데이터 가져오기
    const targetData = await this.playerManagerService.getPlayerData(gameId, targetPlayer);
    if (!targetData) {
      throw new Error('대상을 찾을 수 없습니다');
    }

    // 아이템 소모
    const itemIndex = playerData.items.indexOf('wireless');
    playerData.items.splice(itemIndex, 1);
    await this.gameDataService.savePlayerData(gameId, playerData.playerId, playerData);

    // 무전 메시지 전송 (대상에게만)
    if (targetData.userId > 0) {
      const playerNickname = ANIMAL_NICKNAMES[playerData.playerId] || `플레이어${playerData.playerId}`;
      await this.redisPubSubService.publishPlayerStatus(gameId, targetData.playerId, {
        alarm: {
          message: `${playerNickname}의 무전: ${content.trim()}`,
          img: 'info'
        }
      }, targetData.playerId);
    }

    return this.gameStateService.createPlayerGameUpdate(gameId, playerData.userId, {
      myStatus: {
        state: (playerData.state === 'host' ? 'host' : 'alive') as MyPlayerState,
        items: playerData.items,
        region: playerData.regionId,
        next: playerData.next,
        act: playerData.act
      },
      alarm: {
        message: '무전 메시지를 전송했습니다.',
        img: 'info'
      }
    });
  }

  /**
   * 마이크 사용 처리
   */
  private async handleMicrophoneUse(gameId: string, playerData: any, content?: string): Promise<userDataResponse> {
    if (!content || content.trim() === '') {
      throw new Error('방송할 메시지를 입력해주세요');
    }

    // 아이템 소모
    const itemIndex = playerData.items.indexOf('microphone');
    playerData.items.splice(itemIndex, 1);
    await this.gameDataService.savePlayerData(gameId, playerData.playerId, playerData);

    // 전체 방송 메시지 전송
    const playerNickname = ANIMAL_NICKNAMES[playerData.playerId] || `플레이어${playerData.playerId}`;
    const broadcastMessage = `📢 ${playerNickname}의 방송: ${content.trim()}`;
    
    await this.redisPubSubService.publishToGame(gameId, {
      alarm: {
        message: broadcastMessage,
        img: 'info'
      }
    });

    return this.gameStateService.createPlayerGameUpdate(gameId, playerData.userId, {
      myStatus: {
        state: (playerData.state === 'host' ? 'host' : 'alive') as MyPlayerState,
        items: playerData.items,
        region: playerData.regionId,
        next: playerData.next,
        act: playerData.act
      },
      alarm: {
        message: '전체 방송을 완료했습니다.',
        img: 'info'
      }
    });
  }

  /**
   * 백신 재료 사용 처리
   */
  private async handleVaccineMaterialUse(gameId: string, playerData: any, materialType: ItemInterface): Promise<userDataResponse> {
    // 백신 재료는 조합용이므로 사용 불가
    throw new Error('백신 재료는 조합해서 사용해야 합니다');
  }
}
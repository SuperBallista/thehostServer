// src/socket/game/game.service.ts
import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { RedisPubSubService } from '../../redis/redisPubSub.service';
import { Game, GamePlayer, GamePlayerInRedis, REGION_NAMES, ITEM_NAMES, ANIMAL_NICKNAMES } from './game.types';
import { Room, ItemInterface, MyPlayerState, ChatMessage, HostAct, GamePlayerStatusInterface, SurvivorInterface } from '../payload.types';
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
import { ItemHandlerService } from './item-handler.service';
import { CombatHandlerService } from './combat-handler.service';
import { ZombieService } from './zombie.service';
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
    private readonly itemHandlerService: ItemHandlerService,
    private readonly combatHandlerService: CombatHandlerService,
    private readonly zombieService: ZombieService,
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
  async handleChatMessage(userId: number, chatMessage: ChatMessage): Promise<userDataResponse> {
    return this.chatService.handleChatMessage(userId, chatMessage);
  }

  /**
   * 호스트 액션 처리 위임
   */
  async handleHostAction(userId: number, hostAct: HostAct): Promise<userDataResponse> {
    return this.hostActionService.handleHostAction(userId, hostAct);
  }

  /**
   * 플레이어 상태 업데이트 (이동 장소 설정 등)
   */
  async updatePlayerStatus(userId: number, status: GamePlayerStatusInterface): Promise<userDataResponse> {
    console.log('updatePlayerStatus 호출:', { 
      userId, 
      status,
      hasAct: status.act !== undefined,
      actValue: status.act,
      hasNext: status.next !== undefined,
      nextValue: status.next
    });
    
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
    
    // 좀비 대처 행동이 변경되었는지 추적
    let actChanged = false;

    // act 필드가 있으면 좀비 대처 행동 업데이트
    if (status.act !== undefined) {
      console.log('좀비 대처 행동 체크:', {
        statusAct: status.act,
        playerAct: playerData.act,
        isEqual: status.act === playerData.act,
        willUpdate: status.act !== playerData.act
      });
      
      if (status.act !== playerData.act) {
        console.log('좀비 대처 행동 업데이트 진행');
        actChanged = true; // 변경됨을 표시
        
        // 도주 선택 시 canEscape를 false로 설정
        if (status.act === 'runaway') {
          if (!playerData.canEscape) {
            throw new WsException('이미 도주를 선택하여 다시 도주할 수 없습니다');
          }
          playerData.canEscape = false;
        }
        
        playerData.act = status.act;
        await this.gameDataService.savePlayerData(gameId, playerData.playerId, playerData);
        
        // 좀비 대처 행동은 본인에게만 보이므로 여기서는 시스템 메시지를 보내지 않음
      }
    }

    // next 필드가 있으면 다음 이동 장소 업데이트
    if (status.next !== undefined) {
      console.log('이동 장소 체크:', {
        statusNext: status.next,
        playerNext: playerData.next,
        isEqual: status.next === playerData.next,
        willUpdate: status.next !== playerData.next,
        typeOfStatusNext: typeof status.next,
        typeOfPlayerNext: typeof playerData.next
      });
      
      // 숫자로 변환하여 비교
      const newNext = Number(status.next);
      const currentNext = Number(playerData.next);
      
      if (newNext !== currentNext) {
        console.log('이동 장소 업데이트 진행');
        
        // Redis에 다음 이동 장소 저장
        playerData.next = newNext;
        await this.gameDataService.savePlayerData(gameId, playerData.playerId, playerData);
        
        // 시스템 메시지 전송
        const nextRegion = Number(status.next);
        const regionName = REGION_NAMES[nextRegion] || '알 수 없는 지역';
        const systemMessage = `다음 턴에 ${regionName}으로 이동합니다.`;
        console.log('시스템 메시지:', { nextRegion, regionName, systemMessage });
        
        await this.chatService.sendSystemMessage(gameId, systemMessage, playerData.regionId);
      }
    }

    // 업데이트된 상태 반환
    const response = await this.gameStateService.createPlayerGameUpdate(gameId, userId, {});
    
    // 좀비 대처 행동 메시지는 본인에게만 보여야 함
    if (actChanged && status.act !== undefined) {
      let personalMessage = '';
      switch (status.act) {
        case 'hide':
          personalMessage = '이번 턴에 좀비로부터 숨기로 결정했습니다.';
          break;
        case 'lure':
          personalMessage = '이번 턴에 좀비를 유인하기로 결정했습니다.';
          break;
        case 'runaway':
          personalMessage = '이번 턴에 좀비로부터 도주하기로 결정했습니다. (연속 도주 불가)';
          break;
      }
      
      if (personalMessage) {
        // 본인에게만 보이는 메시지로 응답에 포함
        response.region = {
          chatLog: [{
            system: true,
            message: personalMessage,
            timeStamp: new Date()
          }],
          regionMessageList: []
        };
      }
    }
    
    return response;
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

    // 원본 코드 (프로덕션용)
    // const gamePlayers = players.map((player, index) => 
    //   new GamePlayer(index, player.id, index % regionNumber, index === hostPlayer, regionNumber)
    // );

    // 🧪 테스트 코드 시작 (프로덕션에서는 위 원본 코드 주석 해제하고 아래 테스트 코드 주석 처리)
    const gamePlayers = players.map((player, index) => {
      const gamePlayer = new GamePlayer(index, player.id, index % regionNumber, index === hostPlayer, regionNumber);
      
      // 봇 플레이어(id < 0)이고 호스트가 아닌 경우, 30% 확률로 좀비로 시작
      // if (player.id < 0 && index !== hostPlayer && Math.random() < 0.3) {
      //   gamePlayer.state = 'zombie';
      //   console.log(`🧟 테스트: 봇 플레이어 ${player.nickname}(ID: ${player.id})를 좀비로 시작`);
      // }
      
      return gamePlayer;
    });

    // 좀비 수 확인 로그
    const zombieCount = gamePlayers.filter(p => p.state === 'zombie').length;
    console.log(`🧪 테스트 모드: 총 ${zombieCount}명의 봇이 좀비로 시작합니다.`);
    // 🧪 테스트 코드 끝

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
      
      // 🧪 테스트: 좀비 상태인 플레이어는 ZombieService에도 등록
      if (player.state === 'zombie') {
        await this.zombieService.createZombie(roomId, player.playerId, player.regionId);
        console.log(`🧟 테스트: 좀비 ${player.playerId}를 ZombieService에 등록`);
      }
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
    const survivorListUpdates: { [userId: number]: { survivorList: SurvivorInterface[] } } = {};
    
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
      // 로비로 이동
      await client.join('lobby');
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

    // ItemHandlerService에 위임
    return await this.itemHandlerService.handleGiveItem(gameId, playerData, giveItem);
  }

  /**
   * 턴 남은 시간 가져오기
   */
  async getRemainingTurnTime(userId: number): Promise<userDataResponse> {
    const locationState = await this.playerManagerService.getPlayerLocationState(userId);
    if (locationState.state !== 'game' || !locationState.roomId) {
      throw new WsException('게임 중이 아닙니다');
    }
    
    const gameId = locationState.roomId;
    const remainingTime = await this.gameTurnService.getRemainingTurnTime(gameId);
    
    return {
      count: remainingTime
    };
  }

  /**
   * 아이템 사용 처리
   */
  async handleUseItem(userId: number, useItem: { item: ItemInterface; targetPlayer?: number; content?: string; targetMessage?: number; playerId?: number }, gameId: string): Promise<userDataResponse> {
    console.log('handleUseItem 시작:', { userId, useItem, gameId });
    
    // 플레이어 데이터 가져오기
    let playerData;
    
    // playerId가 전달된 경우 직접 조회 (더 빠름)
    if (useItem.playerId !== undefined) {
      playerData = await this.playerManagerService.getPlayerData(gameId, useItem.playerId);
      // 보안 검증: playerId와 userId가 일치하는지 확인
      if (playerData && playerData.userId !== userId) {
        throw new Error('권한이 없습니다');
      }
    } else {
      // playerId가 없으면 userId로 조회 (느림)
      playerData = await this.playerManagerService.getPlayerDataByUserId(gameId, userId);
    }
    
    if (!playerData) {
      console.error('플레이어 데이터를 찾을 수 없습니다:', { gameId, userId, playerId: useItem.playerId });
      
      // 디버깅을 위해 모든 플레이어 확인
      const allPlayers = await this.playerManagerService.getAllPlayersInGame(gameId);
      console.log('게임 내 모든 플레이어:', allPlayers.map(p => ({ playerId: p.playerId, userId: p.userId })));
      
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

    // 아이템별 처리 - 리팩토링된 서비스들에 위임
    switch (useItem.item) {
      case 'spray':
        return await this.itemHandlerService.handleSprayUse(gameId, playerData, useItem.content);
      case 'eraser':
        return await this.itemHandlerService.handleEraserUse(gameId, playerData, useItem.targetMessage);
      case 'virusChecker':
        return await this.itemHandlerService.handleVirusCheckerUse(gameId, playerData);
      case 'medicine':
        return await this.itemHandlerService.handleMedicineUse(gameId, playerData);
      case 'vaccine':
        return await this.combatHandlerService.handleVaccineUse(gameId, playerData, useItem.targetPlayer);
      case 'shotgun':
        return await this.combatHandlerService.handleShotgunUse(gameId, playerData, useItem.targetPlayer);
      case 'wireless':
        return await this.itemHandlerService.handleWirelessUse(gameId, playerData, useItem.targetPlayer, useItem.content);
      case 'microphone':
        return await this.itemHandlerService.handleMicrophoneUse(gameId, playerData, useItem.content);
      case 'vaccineMaterialA':
      case 'vaccineMaterialB':
      case 'vaccineMaterialC':
        return await this.itemHandlerService.handleVaccineMaterialUse(gameId, playerData);
      default:
        throw new Error('알 수 없는 아이템입니다');
    }
  }
}
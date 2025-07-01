// src/socket/game/game.service.ts
import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { RedisPubSubService } from '../../redis/redisPubSub.service';
import { Game, GamePlayer, REGION_NAMES, ITEM_NAMES } from './game.types';
import { Room } from '../payload.types';
import { getOrderRandom } from '../utils/randomManager';
import { userDataResponse } from '../payload.types';
import { userShortInfo } from '../data.types';
import { GameTurnService } from './gameTurn.service';
import { PlayerManagerService } from './player-manager.service';
import { GameDataService } from './game-data.service';
import { GameStateService } from './game-state.service';
import { ChatService } from './chat.service';
import { HostActionService } from './host-action.service';
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
      
      // 6. 게임 시작 시 초기 시스템 메시지 전송
      const regionName = REGION_NAMES[playerDataResult.myPlayerData.regionId] || '알 수 없는 지역';
      let systemMessage = `${regionName}으로 진입하였습니다.`;
      
      // 플레이어의 현재 아이템 확인
      if (playerDataResult.myPlayerData.items && playerDataResult.myPlayerData.items.length > 0) {
        const lastItem = playerDataResult.myPlayerData.items[playerDataResult.myPlayerData.items.length - 1];
        const itemName = ITEM_NAMES[lastItem] || '알 수 없는 아이템';
        systemMessage += ` 이곳에서 ${itemName}을 획득하였습니다.`;
      }
      
      // 시스템 메시지 전송
      await this.chatService.sendSystemMessage(roomId, systemMessage, playerDataResult.myPlayerData.regionId);
      
      // 7. 응답 생성 및 전송
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
}
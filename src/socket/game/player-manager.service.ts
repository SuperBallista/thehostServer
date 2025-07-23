import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { RedisService } from 'src/redis/redis.service';
import { GamePlayerInRedis } from './game.types';
import { LocationState } from '../data.types';
import { Socket } from 'socket.io';

@Injectable()
export class PlayerManagerService {
  constructor(
    private readonly redisService: RedisService,
  ) {}

  /**
   * 플레이어 데이터 가져오기
   */
  async getPlayerData(gameId: string, playerId: number): Promise<GamePlayerInRedis | null> {
    return await this.redisService.getAndParse(`game:${gameId}:player:${playerId}`);
  }

  /**
   * userId로 플레이어 데이터 찾기
   */
  async getPlayerDataByUserId(gameId: string, userId: number): Promise<GamePlayerInRedis | null> {
    // 모든 플레이어를 순회하며 userId로 찾기
    for (let i = 0; i < 20; i++) {
      const playerData = await this.getPlayerData(gameId, i);
      if (playerData && playerData.userId === userId) {
        return playerData;
      }
    }
    return null;
  }

  /**
   * 플레이어의 위치 상태 가져오기
   */
  async getPlayerLocationState(userId: number): Promise<LocationState | null> {
    // 봇 플레이어(userId < 0)는 location state가 없으므로 null 반환
    if (userId < 0) {
      return null;
    }
    
    const locationState: LocationState = await this.redisService.getAndParse(`locationState:${userId}`);
    if (!locationState || !locationState.roomId) {
      throw new WsException('위치 정보를 찾을 수 없습니다');
    }
    return locationState;
  }

  /**
   * 플레이어 위치 상태 업데이트
   */
  async updateLocationState(userId: number, state: string, roomId: string): Promise<void> {
    const locationData = { state, roomId };
    await this.redisService.stringifyAndSet(`locationState:${userId}`, locationData);
  }

  /**
   * 플레이어를 region별 room에 이동
   */
  async movePlayerToRegion(
    client: Socket, 
    gameId: string, 
    userId: number, 
    newRegionId: number, 
    isFirstJoin: boolean = false
  ): Promise<void> {
    try {
      // 플레이어 데이터 가져오기
      const playerData = await this.getPlayerDataByUserId(gameId, userId);
      if (!playerData) {
        throw new WsException('플레이어 데이터를 찾을 수 없습니다');
      }

      // 첫 입장이 아닌 경우에만 이전 region room에서 나가기
      if (!isFirstJoin) {
        const oldRegionRoom = `game:${gameId}:region:${playerData.regionId}`;
        await client.leave(oldRegionRoom);
      }

      // 새로운 region room에 들어가기
      const newRegionRoom = `game:${gameId}:region:${newRegionId}`;
      await client.join(newRegionRoom);

      const action = isFirstJoin ? '입장' : `이동: region ${playerData.regionId} →`;
      console.log(`플레이어 ${playerData.playerId} ${action} ${newRegionId}`);
    } catch (error) {
      console.error(`플레이어 region 이동 중 오류: ${error}`);
      throw error;
    }
  }

  /**
   * 모든 플레이어 데이터 로드 (재시도 포함)
   */
  async loadAllPlayersWithRetry(
    roomId: string, 
    userId: number
  ): Promise<{ myPlayerData: GamePlayerInRedis | undefined, allPlayers: GamePlayerInRedis[] }> {
    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 500;
    const MAX_PLAYERS = 20;
    
    let myPlayerData: GamePlayerInRedis | undefined;
    const playerMap = new Map<number, GamePlayerInRedis>();
    
    for (let retry = 0; retry < MAX_RETRIES && !myPlayerData; retry++) {
      if (retry > 0) {
        await this.delay(RETRY_DELAY_MS);
      }
      
      // 플레이어 데이터 수집
      for (let i = 0; i < MAX_PLAYERS; i++) {
        const playerData = await this.getPlayerData(roomId, i);
        if (playerData) {
          playerMap.set(playerData.playerId, playerData);
          if (playerData.userId === userId) {
            myPlayerData = playerData;
          }
        }
      }
    }
    
    return {
      myPlayerData,
      allPlayers: Array.from(playerMap.values())
    };
  }

  /**
   * 게임 내 모든 플레이어 가져오기
   */
  async getAllPlayersInGame(gameId: string): Promise<GamePlayerInRedis[]> {
    const players: GamePlayerInRedis[] = [];
    const MAX_PLAYERS = 20;

    for (let i = 0; i < MAX_PLAYERS; i++) {
      const player = await this.getPlayerData(gameId, i);
      if (player) {
        players.push(player);
      }
    }

    return players;
  }

  /**
   * 게임의 모든 봇 플레이어 조회 (userId < 0인 플레이어들)
   */
  async getBotPlayers(gameId: string): Promise<GamePlayerInRedis[]> {
    const botPlayers: GamePlayerInRedis[] = [];
    
    // playerId 0-19 슬롯을 순회하면서 봇 플레이어 찾기
    for (let playerId = 0; playerId < 20; playerId++) {
      const playerData = await this.getPlayerData(gameId, playerId);
      if (playerData && playerData.userId < 0) { // userId가 음수인 경우 봇
        botPlayers.push(playerData);
      }
    }
    
    return botPlayers;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
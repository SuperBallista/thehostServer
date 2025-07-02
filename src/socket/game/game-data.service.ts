import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { RedisService } from 'src/redis/redis.service';
import { GameInRedis, Host } from './game.types';
import { Room } from '../payload.types';

@Injectable()
export class GameDataService {
  constructor(
    private readonly redisService: RedisService,
  ) {}

  /**
   * 게임 데이터 가져오기
   */
  async getGameData(gameId: string): Promise<GameInRedis> {
    const gameData = await this.redisService.getAndParse(`game:${gameId}`);
    if (!gameData) {
      throw new WsException('게임 데이터를 찾을 수 없습니다');
    }
    return gameData;
  }

  /**
   * 게임 데이터 저장
   */
  async saveGameData(gameId: string, gameData: GameInRedis): Promise<void> {
    await this.redisService.stringifyAndSet(`game:${gameId}`, gameData);
  }

  /**
   * 대기실 데이터 가져오기
   */
  async getWaitRoomData(roomId: string): Promise<Room> {
    const roomData = await this.redisService.getAndParse(`room:data:${roomId}`);
    if (!roomData) {
      throw new WsException('방정보가 없습니다');
    }
    return roomData;
  }

  /**
   * 호스트 데이터 가져오기
   */
  async getHostData(gameId: string): Promise<Host | null> {
    return await this.redisService.getAndParse(`game:${gameId}:host`);
  }

  /**
   * 호스트 데이터 저장
   */
  async saveHostData(gameId: string, hostData: Host): Promise<void> {
    await this.redisService.stringifyAndSet(`game:${gameId}:host`, hostData);
  }

  /**
   * 대기실 목록에서 삭제
   */
  async deleteWaitingRoomList(roomId: string, timeStamp: number): Promise<void> {
    await this.redisService.del(`room:list:${timeStamp}`);
    await this.redisService.del(`room:data:${roomId}`);
  }

  /**
   * 플레이어 데이터 저장
   */
  async savePlayerData(gameId: string, playerId: number, playerData: any): Promise<void> {
    await this.redisService.stringifyAndSet(
      `game:${gameId}:player:${playerId}`, 
      playerData
    );
  }

  /**
   * 게임 관련 모든 데이터 삭제 (게임 종료 시)
   */
  async deleteGameData(gameId: string): Promise<void> {
    // 게임 메인 데이터 삭제
    await this.redisService.del(`game:${gameId}`);
    
    // 호스트 데이터 삭제
    await this.redisService.del(`game:${gameId}:host`);
    
    // 플레이어 데이터 삭제 (0-19)
    for (let i = 0; i < 20; i++) {
      await this.redisService.del(`game:${gameId}:player:${i}`);
    }
    
    // 좀비 데이터 삭제
    const zombieKeys = await this.redisService.client.keys(`game:${gameId}:zombie:*`);
    if (zombieKeys.length > 0) {
      await Promise.all(zombieKeys.map(key => this.redisService.del(key)));
    }
    
    // 지역 데이터 삭제
    const regionKeys = await this.redisService.client.keys(`game:${gameId}:region:*`);
    if (regionKeys.length > 0) {
      await Promise.all(regionKeys.map(key => this.redisService.del(key)));
    }
  }

  /**
   * 현재 턴 가져오기
   */
  async getCurrentTurn(gameId: string): Promise<number> {
    const gameData = await this.getGameData(gameId);
    return gameData.turn;
  }

  /**
   * 턴 업데이트
   */
  async updateTurn(gameId: string, newTurn: number): Promise<void> {
    const gameData = await this.getGameData(gameId);
    gameData.turn = newTurn;
    await this.saveGameData(gameId, gameData);
  }

  /**
   * 게임 대기실 데이터 저장
   */
  async saveWaitRoomData(roomId: string, roomData: Room): Promise<void> {
    await this.redisService.stringifyAndSet(`room:data:${roomId}`, roomData);
  }

  /**
   * 게임 데이터 정리
   */
  async cleanupGameData(gameId: string): Promise<void> {
    // 게임 관련 모든 데이터 삭제
    const patterns = [
      `game:${gameId}`,
      `game:${gameId}:*`,
      `room:data:${gameId}`
      // room:list:* 제거 - 다른 방의 리스트까지 삭제하면 안됨
    ];

    for (const pattern of patterns) {
      const keys = await this.redisService.scanKeys(pattern);
      if (keys.length > 0) {
        // Redis del 명령어 사용
        const pipeline = this.redisService.pipeline();
        keys.forEach(key => pipeline.del(key));
        await pipeline.exec();
      }
    }
  }
}
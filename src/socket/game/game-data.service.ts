import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { RedisService } from 'src/redis/redis.service';
import { GameInRedis, Host, GamePlayerInRedis } from './game.types';
import { Room, Region } from '../payload.types';

@Injectable()
export class GameDataService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * 게임 데이터 가져오기
   */
  async getGameData(gameId: string): Promise<GameInRedis> {
    const gameData = (await this.redisService.getAndParse(
      `game:${gameId}`,
    )) as GameInRedis | null;
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
    const roomData = (await this.redisService.getAndParse(
      `room:data:${roomId}`,
    )) as Room | null;
    if (!roomData) {
      throw new WsException('방정보가 없습니다');
    }
    return roomData;
  }

  /**
   * 호스트 데이터 가져오기
   */
  async getHostData(gameId: string): Promise<Host | null> {
    return (await this.redisService.getAndParse(
      `game:${gameId}:host`,
    )) as Host | null;
  }

  /**
   * 호스트 유저 ID 가져오기
   */
  async getHostUserId(gameId: string): Promise<number> {
    const gameData = await this.getGameData(gameId);
    return gameData.hostId;
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
  async deleteWaitingRoomList(
    roomId: string,
    timeStamp: number,
  ): Promise<void> {
    await this.redisService.del(`room:list:${timeStamp}`);
    await this.redisService.del(`room:data:${roomId}`);
  }

  /**
   * 플레이어 데이터 저장
   */
  async savePlayerData(
    gameId: string,
    playerId: number,
    playerData: GamePlayerInRedis,
  ): Promise<void> {
    await this.redisService.stringifyAndSet(
      `game:${gameId}:player:${playerId}`,
      playerData,
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
    const zombieKeys = await this.redisService.client.keys(
      `game:${gameId}:zombie:*`,
    );
    if (zombieKeys.length > 0) {
      await Promise.all(zombieKeys.map((key) => this.redisService.del(key)));
    }

    // 지역 데이터 삭제 (Redis ERD에 맞게 키 패턴 수정)
    const regionKeys = await this.redisService.client.keys(
      `game:${gameId}:region:*`,
    );
    if (regionKeys.length > 0) {
      await Promise.all(regionKeys.map((key) => this.redisService.del(key)));
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
   * 게임 데이터 정리 (게임 종료 시)
   */
  async cleanupGameData(gameId: string): Promise<void> {
    // 게임 데이터 삭제
    await this.deleteGameData(gameId);
  }

  /**
   * 구역 데이터 가져오기
   */
  async getRegionData(gameId: string, regionId: number): Promise<Region> {
    // Redis ERD에 맞게 키 수정: game:gameId:region:turn:regionId
    const gameData = (await this.redisService.getAndParse(
      `game:${gameId}`,
    )) as GameInRedis | null;
    const turn = gameData?.turn || 1;
    const regionData = (await this.redisService.getAndParse(
      `game:${gameId}:region:${turn}:${regionId}`,
    )) as Region | null;

    if (!regionData) {
      // 구역 데이터가 없으면 기본 구조 생성
      return {
        chatLog: [],
        regionMessageList: [],
      };
    }
    return regionData;
  }

  /**
   * 구역 데이터 저장
   */
  async saveRegionData(
    gameId: string,
    regionId: number,
    regionData: Region,
  ): Promise<void> {
    // Redis ERD에 맞게 키 수정: game:gameId:region:turn:regionId
    const gameData = (await this.redisService.getAndParse(
      `game:${gameId}`,
    )) as GameInRedis | null;
    const turn = gameData?.turn || 1;
    await this.redisService.stringifyAndSet(
      `game:${gameId}:region:${turn}:${regionId}`,
      regionData,
    );
  }

  /**
   * 게임 종료 설정
   */
  async setGameEnd(
    gameId: string,
    endType: 'infected' | 'killed' | 'cure',
  ): Promise<void> {
    const gameData = await this.getGameData(gameId);
    gameData.endGame = endType;
    await this.saveGameData(gameId, gameData);
  }
}

import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { WsException } from '@nestjs/websockets';

// Redis에 저장되는 실제 좀비 상태
export interface ZombieState {
  playerId: number;
  region: number;      // 현재 위치
  leftTurn: number;    // 이동까지 남은 턴 (5~0)
  targetId: number | null;  // 공격 대상
  nextRegion: number;  // 다음 이동할 지역
}

// 호스트가 내리는 명령
export interface ZombieCommand {
  playerId: number;
  targetId?: number | null;  // 공격 대상 변경
  nextRegion?: number;      // 다음 지역 변경
}

// 호스트에게 전송되는 좀비 정보
export interface HostZombieInfo {
  playerId: number;
  targetId: number | null;
  next: number;
  leftTurn: number;
  region: number;
}

@Injectable()
export class ZombieService {
  constructor(
    private readonly redisService: RedisService,
  ) {}

  // 1. 좀비 생성 (플레이어가 감염되었을 때)
  async createZombie(gameId: string, playerId: number, currentRegion: number): Promise<void> {
    const zombieState: ZombieState = {
      playerId,
      region: currentRegion,
      leftTurn: 5,  // 5턴 후에 이동 가능
      targetId: null,
      nextRegion: Math.floor(Math.random() * 6)  // 랜덤 지역 설정
    };

    // Redis에 좀비 상태 저장
    await this.redisService.stringifyAndSet(
      `game:${gameId}:zombie:${playerId}`,
      zombieState
    );

    // 좀비 목록에 추가
    await this.redisService.client.sadd(`game:${gameId}:zombies`, playerId.toString());
  }

  // 2. 좀비 명령 설정 (호스트가 명령 내릴 때)
  async setZombieCommand(gameId: string, command: ZombieCommand): Promise<void> {
    const zombieKey = `game:${gameId}:zombie:${command.playerId}`;
    const zombieState = await this.redisService.getAndParse(zombieKey) as ZombieState | null;
    
    if (!zombieState) {
      throw new WsException('좀비를 찾을 수 없습니다');
    }

    // 명령에 따라 상태 업데이트
    if (command.targetId !== undefined) {
      zombieState.targetId = command.targetId;
    }
    if (command.nextRegion !== undefined) {
      zombieState.nextRegion = command.nextRegion;
    }

    await this.redisService.stringifyAndSet(zombieKey, zombieState);
  }

  // 3. 턴 진행시 좀비 상태 업데이트
  async processZombieTurn(gameId: string, zombieId: number): Promise<{
    moved: boolean;
    newRegion?: number;
    attacked?: number;
  }> {
    const zombieKey = `game:${gameId}:zombie:${zombieId}`;
    const zombieState = await this.redisService.getAndParse(zombieKey) as ZombieState | null;
    
    if (!zombieState) {
      throw new WsException('좀비를 찾을 수 없습니다');
    }

    const result = {
      moved: false,
      newRegion: undefined as number | undefined,
      attacked: zombieState.targetId || undefined
    };

    // leftTurn 감소
    zombieState.leftTurn--;

    // 0이 되면 이동
    if (zombieState.leftTurn === 0) {
      zombieState.region = zombieState.nextRegion;
      zombieState.leftTurn = 5;  // 다시 5턴으로 리셋
      zombieState.nextRegion = Math.floor(Math.random() * 6);  // 새로운 랜덤 목적지
      
      result.moved = true;
      result.newRegion = zombieState.region;
    }

    await this.redisService.stringifyAndSet(zombieKey, zombieState);
    return result;
  }

  // 4. 좀비 상태 조회
  async getZombieState(gameId: string, zombieId: number): Promise<ZombieState | null> {
    return await this.redisService.getAndParse(
      `game:${gameId}:zombie:${zombieId}`
    ) as ZombieState | null;
  }

  // 5. 모든 좀비 상태 조회
  async getAllZombies(gameId: string): Promise<ZombieState[]> {
    const zombieIds = await this.redisService.client.smembers(`game:${gameId}:zombies`);
    const zombies: ZombieState[] = [];

    for (const zombieId of zombieIds) {
      const zombie = await this.getZombieState(gameId, parseInt(zombieId));
      if (zombie) {
        zombies.push(zombie);
      }
    }

    return zombies;
  }

  // 6. 호스트에게 보낼 좀비 정보 변환
  async getZombiesForHost(gameId: string): Promise<HostZombieInfo[]> {
    const zombies = await this.getAllZombies(gameId);
    
    return zombies.map(zombie => ({
      playerId: zombie.playerId,
      targetId: zombie.targetId,
      next: zombie.nextRegion,
      leftTurn: zombie.leftTurn,
      region: zombie.region
    }));
  }

  // 7. 좀비 제거 (치료되었을 때)
  async removeZombie(gameId: string, zombieId: number): Promise<void> {
    await this.redisService.del(`game:${gameId}:zombie:${zombieId}`);
    await this.redisService.client.srem(`game:${gameId}:zombies`, zombieId.toString());
  }
}
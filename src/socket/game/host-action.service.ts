import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Host, ANIMAL_NICKNAMES } from './game.types';
import { userDataResponse } from '../payload.types';
import { PlayerManagerService } from './player-manager.service';
import { GameDataService } from './game-data.service';
import { ZombieService } from './zombie.service';
import { GameStateService } from './game-state.service';
import { ChatService } from './chat.service';

@Injectable()
export class HostActionService {
  constructor(
    private readonly playerManagerService: PlayerManagerService,
    private readonly gameDataService: GameDataService,
    private readonly zombieService: ZombieService,
    private readonly gameStateService: GameStateService,
    private readonly chatService: ChatService,
  ) {}

  /**
   * 호스트 액션 처리 (감염, 좀비 명령)
   */
  async handleHostAction(userId: number, hostAct: any): Promise<userDataResponse> {
    // 현재 위치 상태 확인
    const locationState = await this.playerManagerService.getPlayerLocationState(userId);
    if (locationState.state !== 'game' || !locationState.roomId) {
      throw new WsException('게임 중이 아닙니다');
    }

    const gameId = locationState.roomId;
    
    // 플레이어가 호스트인지 확인
    const playerData = await this.playerManagerService.getPlayerDataByUserId(gameId, userId);
    if (!playerData || playerData.state !== 'host') {
      throw new WsException('호스트 권한이 없습니다');
    }

    // 호스트 데이터 가져오기
    const hostData = await this.gameDataService.getHostData(gameId);
    if (!hostData) {
      throw new WsException('호스트 데이터를 찾을 수 없습니다');
    }

    // 감염 대상 설정
    if (hostAct.infect !== undefined) {
      await this.setInfectTarget(gameId, hostData, hostAct.infect);
      
      // 호스트에게만 시스템 메시지 전송
      if (hostAct.infect !== undefined) {
        const targetAnimalName = ANIMAL_NICKNAMES[hostAct.infect] || `플레이어${hostAct.infect}`;
        const systemMessage = `${targetAnimalName}에게 좀비 바이러스를 감염시킵니다. (턴 종료시 적용)`;
        
        // 호스트의 현재 지역에만 시스템 메시지 전송
        await this.chatService.sendSystemMessage(gameId, systemMessage, playerData.regionId);
      }
    }

    // 좀비 명령 처리
    if (hostAct.zombieList && Array.isArray(hostAct.zombieList)) {
      await this.processZombieCommands(gameId, hostAct.zombieList);
    }

    // 업데이트된 상태 반환
    return this.gameStateService.createPlayerGameUpdate(gameId, userId, {});
  }

  /**
   * 감염 대상 설정
   */
  private async setInfectTarget(gameId: string, hostData: Host, targetId: number | undefined): Promise<void> {
    if (!hostData.canInfect) {
      throw new WsException('이번 턴에는 감염시킬 수 없습니다');
    }
    
    if (targetId !== undefined) {
      hostData.infect = targetId;
    } else {
      delete hostData.infect;
    }
    await this.gameDataService.saveHostData(gameId, hostData);
  }

  /**
   * 좀비 명령 처리
   */
  private async processZombieCommands(gameId: string, zombieCommands: any[]): Promise<void> {
    for (const zombieCommand of zombieCommands) {
      await this.zombieService.setZombieCommand(gameId, {
        playerId: zombieCommand.playerId,
        targetId: zombieCommand.targetId,
        nextRegion: zombieCommand.next
      });
    }
  }

  /**
   * 호스트 초기화 (게임 시작 시)
   */
  async initializeHost(gameId: string, hostPlayerId: number): Promise<void> {
    const hostData: Host = {
      hostId: hostPlayerId,
      canInfect: true,
      // infect는 초기에 undefined로 생략
      zombieList: []
    };

    await this.gameDataService.saveHostData(gameId, hostData);
  }

  /**
   * 호스트 턴 처리
   */
  async processHostTurn(gameId: string): Promise<{
    infectTarget: number | undefined,
    zombieAttacks: (number | null)[]
  }> {
    const hostData = await this.gameDataService.getHostData(gameId);
    if (!hostData) {
      throw new WsException('호스트 데이터를 찾을 수 없습니다');
    }

    // 감염 처리
    const infectTarget = hostData.infect;
    if (infectTarget !== undefined) {
      delete hostData.infect;  // undefined로 만들기
      hostData.canInfect = false;
    } else {
      hostData.canInfect = true;
    }

    await this.gameDataService.saveHostData(gameId, hostData);

    // 좀비 공격 대상 수집
    const zombies = await this.zombieService.getAllZombies(gameId);
    const zombieAttacks = zombies.map(zombie => zombie.targetId);

    return {
      infectTarget,
      zombieAttacks
    };
  }
}
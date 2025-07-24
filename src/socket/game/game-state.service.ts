import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import {
  GameInRedis,
  GamePlayerInRedis,
  REGION_NAMES,
  ITEM_NAMES,
  ItemCode,
} from './game.types';
import {
  PlayerState,
  SurvivorInterface,
  MyPlayerState,
  Act,
} from '../payload.types';
import { userDataResponse } from '../payload.types';
import { PlayerManagerService } from './player-manager.service';
import { GameDataService } from './game-data.service';
import { ZombieService } from './zombie.service';
import { GameTurnService } from './gameTurn.service';

@Injectable()
export class GameStateService {
  constructor(
    private readonly playerManagerService: PlayerManagerService,
    private readonly gameDataService: GameDataService,
    private readonly zombieService: ZombieService,
    @Inject(forwardRef(() => GameTurnService))
    private readonly gameTurnService: GameTurnService,
  ) {}

  /**
   * 게임 시작 응답 생성
   */
  async createGameStartResponse(
    gameData: GameInRedis,
    myPlayerData: GamePlayerInRedis,
    allPlayers: GamePlayerInRedis[],
    roomId: string,
  ): Promise<userDataResponse> {
    // 사용 중인 지역 수 계산
    const uniqueRegions = new Set(allPlayers.map((p) => p.regionId));
    const useRegionsNumber = Math.max(...Array.from(uniqueRegions)) + 1;

    // 현재 구역의 데이터 가져오기
    const regionData = await this.gameDataService.getRegionData(
      roomId,
      myPlayerData.regionId,
    );

    // 초기 시스템 메시지 생성
    const regionName = REGION_NAMES[myPlayerData.regionId] || '알 수 없는 지역';
    let systemMessage = `${regionName}으로 진입하였습니다.`;

    // 플레이어의 현재 아이템 확인
    if (myPlayerData.items && myPlayerData.items.length > 0) {
      const lastItem = myPlayerData.items[myPlayerData.items.length - 1];
      const itemName = ITEM_NAMES[lastItem] || '알 수 없는 아이템';
      systemMessage += ` 이곳에서 ${itemName}을 획득하였습니다.`;
    }

    // 시스템 메시지를 채팅 로그에 추가
    const initialChatLog = [
      {
        system: true,
        message: systemMessage,
        timeStamp: new Date(),
      },
    ];

    const response: userDataResponse = {
      locationState: 'game',
      playerId: myPlayerData.playerId,
      myStatus: {
        state: (myPlayerData.state === 'host'
          ? 'host'
          : 'alive') as MyPlayerState,
        items: myPlayerData.items as ItemCode[],
        region: myPlayerData.regionId,
        nextRegion: myPlayerData.next,
        act: myPlayerData.act as Act,
        canEscape: myPlayerData.canEscape,
      },
      gameTurn: gameData.turn,
      count: await this.getRemainingTime(roomId, gameData.turn),
      useRegionsNumber: useRegionsNumber,
      survivorList: this.createSurvivorList(allPlayers, myPlayerData),
      region: {
        chatLog: [...initialChatLog, ...(regionData.chatLog || [])],
        regionMessageList: regionData.regionMessageList || [],
      },
    };

    // 호스트 플레이어인 경우에만 hostAct 데이터 추가
    if (myPlayerData.state === 'host') {
      const hostData = await this.gameDataService.getHostData(roomId);
      if (hostData) {
        // ZombieService를 사용하여 좀비 정보 가져오기
        const zombieList = await this.zombieService.getZombiesForHost(roomId);

        response.hostAct = {
          infect: hostData.infect,
          canInfect: hostData.canInfect,
          zombieList: zombieList,
        };
      }
    }

    return response;
  }

  /**
   * 플레이어별 게임 업데이트 생성
   */
  async createPlayerGameUpdate(
    gameId: string,
    userId: number,
    updateData: Partial<userDataResponse>,
  ): Promise<userDataResponse> {
    // 플레이어 데이터 가져오기
    const playerData = await this.playerManagerService.getPlayerDataByUserId(
      gameId,
      userId,
    );
    if (!playerData) {
      throw new WsException('플레이어 데이터를 찾을 수 없습니다');
    }

    const response: userDataResponse = {
      ...updateData,
    };

    // 호스트 플레이어인 경우에만 hostAct 데이터 추가
    if (playerData.state === 'host') {
      const hostData = await this.gameDataService.getHostData(gameId);
      if (hostData) {
        // ZombieService를 사용하여 좀비 정보 가져오기
        const zombieList = await this.zombieService.getZombiesForHost(gameId);

        response.hostAct = {
          infect: hostData.infect,
          canInfect: hostData.canInfect,
          zombieList: zombieList,
        };
      }
    }

    return response;
  }

  /**
   * 생존자 리스트 생성
   */
  createSurvivorList(
    allPlayers: GamePlayerInRedis[],
    myPlayerData: GamePlayerInRedis,
  ): SurvivorInterface[] {
    return allPlayers
      .filter((player) => player.playerId !== myPlayerData.playerId) // 자신 제외
      .map((player) => ({
        playerId: player.playerId,
        state: this.getVisiblePlayerState(player, myPlayerData),
        sameRegion: player.regionId === myPlayerData.regionId,
      }));
  }

  /**
   * 다른 플레이어의 보이는 상태 결정
   */
  private getVisiblePlayerState(
    player: GamePlayerInRedis,
    myPlayerData: GamePlayerInRedis,
  ): PlayerState {
    if (player.playerId === myPlayerData.playerId) return 'you';
    if (player.state === 'host') return 'alive';
    return player.state;
  }

  /**
   * 턴별 시간 계산
   */
  private getTurnDuration(turn: number): number {
    return turn < 5 ? 60 : 90;
  }

  /**
   * 남은 시간 가져오기 (Redis에서)
   */
  private async getRemainingTime(
    gameId: string,
    currentTurn: number,
  ): Promise<number> {
    try {
      // gameTurnService가 주입되었는지 확인
      if (this.gameTurnService && this.gameTurnService.getRemainingTurnTime) {
        const remainingTime =
          await this.gameTurnService.getRemainingTurnTime(gameId);
        if (remainingTime > 0) {
          return remainingTime;
        }
      }
    } catch (error) {
      console.error('[GameStateService] 남은 시간 가져오기 실패:', error);
    }

    // Redis에서 가져오지 못한 경우 기본값 반환
    return this.getTurnDuration(currentTurn);
  }

  /**
   * 게임 종료 상태 생성
   */
  createGameEndResponse(
    endType: 'infected' | 'killed' | 'cure',
  ): userDataResponse {
    return {
      endGame: endType,
      alarm: {
        message: this.getEndGameMessage(endType),
        img: endType === 'cure' ? 'success' : 'danger',
      },
    };
  }

  /**
   * 게임 종료 메시지
   */
  private getEndGameMessage(endType: 'infected' | 'killed' | 'cure'): string {
    switch (endType) {
      case 'infected':
        return '모든 생존자가 감염되었습니다. 좀비팀 승리!';
      case 'killed':
        return '모든 생존자가 사망했습니다. 좀비팀 승리!';
      case 'cure':
        return '백신이 투여되었습니다. 생존자팀 승리!';
      default:
        return '게임이 종료되었습니다.';
    }
  }
}

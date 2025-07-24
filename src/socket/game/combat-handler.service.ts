import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { RedisPubSubService } from '../../redis/redisPubSub.service';
import { ANIMAL_NICKNAMES, GamePlayerInRedis } from './game.types';
import { userDataResponse, MyPlayerState } from '../payload.types';
import { PlayerManagerService } from './player-manager.service';
import { GameDataService } from './game-data.service';
import { GameStateService } from './game-state.service';
import { ChatService } from './chat.service';
import { ZombieService } from './zombie.service';

@Injectable()
export class CombatHandlerService {
  constructor(
    private readonly redisPubSubService: RedisPubSubService,
    private readonly playerManagerService: PlayerManagerService,
    private readonly gameDataService: GameDataService,
    private readonly gameStateService: GameStateService,
    private readonly chatService: ChatService,
    private readonly zombieService: ZombieService,
  ) {}

  /**
   * 백신 사용 처리
   */
  async handleVaccineUse(
    gameId: string,
    playerData: GamePlayerInRedis,
    targetPlayer?: number,
  ): Promise<userDataResponse> {
    if (targetPlayer === undefined) {
      throw new Error('백신을 투여할 대상을 선택해주세요');
    }

    // 대상 플레이어 데이터 가져오기
    const targetData = await this.playerManagerService.getPlayerData(
      gameId,
      targetPlayer,
    );
    if (!targetData) {
      throw new Error('대상을 찾을 수 없습니다');
    }

    // 같은 구역인지 확인
    if (playerData.regionId !== targetData.regionId) {
      throw new Error(
        '같은 구역에 있는 생존자에게만 백신을 사용할 수 있습니다',
      );
    }

    // 생존자인지 확인 (alive 또는 host)
    if (targetData.state !== 'alive' && targetData.state !== 'host') {
      throw new Error('생존자에게만 백신을 사용할 수 있습니다');
    }

    // 자기 자신에게 사용하는지 확인
    if (playerData.playerId === targetPlayer) {
      throw new Error('자기 자신에게는 백신을 사용할 수 없습니다');
    }

    // 아이템 소모
    const itemIndex = playerData.items.indexOf('vaccine');
    playerData.items.splice(itemIndex, 1);
    await this.gameDataService.savePlayerData(
      gameId,
      playerData.playerId,
      playerData,
    );

    const playerNickname =
      ANIMAL_NICKNAMES[playerData.playerId] || `플레이어${playerData.playerId}`;
    const targetNickname =
      ANIMAL_NICKNAMES[targetData.playerId] || `플레이어${targetData.playerId}`;

    // 대상이 숙주인지 확인
    if (targetData.state === 'host') {
      // 게임 종료 처리 (생존자 승리)
      await this.gameDataService.setGameEnd(gameId, 'cure');

      // 숙주에게 패배 알림 전송
      if (targetData.userId > 0) {
        await this.redisPubSubService.publishToRegion(
          gameId,
          targetData.regionId,
          {
            endGame: 'cure',
            alarm: {
              message: `💉 ${playerNickname}님이 당신에게 백신을 투여했습니다.\n\n🏥 치료 성공! 당신은 패배했습니다.`,
              img: 'error',
            },
          },
        );
      }

      // 모든 플레이어에게 게임 종료 알림 (숙주 제외)
      const allPlayers =
        await this.playerManagerService.getAllPlayersInGame(gameId);
      for (const player of allPlayers) {
        if (player.playerId !== targetData.playerId) {
          await this.redisPubSubService.publishToRegion(
            gameId,
            player.regionId,
            {
              endGame: 'cure',
              alarm: {
                message: `🎉 ${playerNickname}님이 숙주에게 백신을 투여했습니다!\n\n✨ 숙주가 치료되어 생존자들이 승리했습니다!\n\n🦠 숙주는 ${targetNickname}님이었습니다.`,
                img: 'success',
              },
            },
          );
        }
      }

      return {
        endGame: 'cure',
        alarm: {
          message: `🎯 백신 투여 성공!\n\n🏆 숙주를 치료하여 게임에서 승리했습니다!\n\n🦠 숙주는 ${targetNickname}님이었습니다.`,
          img: 'success',
        },
      };
    } else {
      // 일반 생존자에게 사용한 경우 - 효과 없음
      await this.chatService.sendSystemMessage(
        gameId,
        `${playerNickname}이(가) ${targetNickname}에게 백신을 투여했습니다.`,
        playerData.regionId,
      );

      return this.gameStateService.createPlayerGameUpdate(
        gameId,
        playerData.userId,
        {
          myStatus: {
            state: (playerData.state === 'host'
              ? 'host'
              : 'alive') as MyPlayerState,
            items: playerData.items,
            region: playerData.regionId,
            next: playerData.next,
            act: playerData.act,
          },
          alarm: {
            message: `💉 ${targetNickname}님에게 백신을 투여했습니다.\n\n❓ 아무런 반응이 없었습니다...`,
            img: 'alert',
          },
        },
      );
    }
  }

  /**
   * 산탄총 사용 처리
   */
  async handleShotgunUse(
    gameId: string,
    playerData: GamePlayerInRedis,
    targetPlayer?: number,
  ): Promise<userDataResponse> {
    if (targetPlayer === undefined) {
      throw new Error('대상을 선택해주세요');
    }

    // 대상 플레이어 데이터 가져오기
    const targetData = await this.playerManagerService.getPlayerData(
      gameId,
      targetPlayer,
    );
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
    await this.gameDataService.savePlayerData(
      gameId,
      playerData.playerId,
      playerData,
    );

    // 좀비 제거
    targetData.state = 'killed';
    await this.gameDataService.savePlayerData(
      gameId,
      targetData.playerId,
      targetData,
    );

    // 시스템 메시지 전송
    const playerNickname =
      ANIMAL_NICKNAMES[playerData.playerId] || `플레이어${playerData.playerId}`;
    const targetNickname =
      ANIMAL_NICKNAMES[targetData.playerId] || `플레이어${targetData.playerId}`;
    const systemMessage = `${playerNickname}이(가) 좀비가 된 ${targetNickname}을(를) 사살했습니다.`;
    await this.chatService.sendSystemMessage(
      gameId,
      systemMessage,
      playerData.regionId,
    );

    // 모든 플레이어에게 업데이트된 게임 상태 전송
    await this.updateAllPlayersSurvivorList(gameId, targetData.playerId);

    // 숙주에게 좀비가 사살됨을 알림
    await this.notifyHostOfZombieKill(
      gameId,
      targetData.playerId,
      targetNickname,
    );

    return this.gameStateService.createPlayerGameUpdate(
      gameId,
      playerData.userId,
      {
        myStatus: {
          state: (playerData.state === 'host'
            ? 'host'
            : 'alive') as MyPlayerState,
          items: playerData.items,
          region: playerData.regionId,
          next: playerData.next,
          act: playerData.act,
        },
        alarm: {
          message: `💥 좀비가 된 ${targetNickname}을(를) 성공적으로 사살했습니다.`,
          img: 'success',
        },
      },
    );
  }

  /**
   * 모든 플레이어에게 생존자 리스트 업데이트 전송
   */
  private async updateAllPlayersSurvivorList(
    gameId: string,
    killedPlayerId: number,
  ) {
    const allPlayers =
      await this.playerManagerService.getAllPlayersInGame(gameId);

    // Socket.IO 서버가 있는지 확인
    if (!this.redisPubSubService.io) {
      console.error('Socket.IO 서버가 초기화되지 않음');
      return;
    }

    // 좀비가 사살된 것을 모든 플레이어에게 알림
    for (const player of allPlayers) {
      if (player.userId > 0 && player.state !== 'left') {
        // 각 플레이어별로 맞춤형 생존자 리스트 생성
        const survivorList = await this.gameStateService.createSurvivorList(
          allPlayers,
          player,
        );

        // 플레이어에게 업데이트 전송
        const updateData: Partial<userDataResponse> = {
          survivorList,
          gameTurn: (await this.gameDataService.getGameData(gameId)).turn,
        };

        // 해당 플레이어의 소켓을 찾아서 직접 emit
        const playerSockets = await this.redisPubSubService.io
          .in(`game:${gameId}`)
          .fetchSockets();
        const targetSocket = playerSockets.find(
          (s) => s.data.id === player.userId,
        );

        if (targetSocket) {
          targetSocket.emit('update', updateData);
          console.log(
            `생존자 리스트 업데이트 전송: userId=${player.userId}, zombieKilled=${killedPlayerId}`,
          );
        }
      }
    }
  }

  /**
   * 숙주에게 좀비 사살 알림
   */
  private async notifyHostOfZombieKill(
    gameId: string,
    killedPlayerId: number,
    targetNickname: string,
  ) {
    const gameData = await this.gameDataService.getGameData(gameId);
    if (gameData && gameData.hostId > 0) {
      const hostPlayerData =
        await this.playerManagerService.getPlayerDataByUserId(
          gameId,
          gameData.hostId,
        );
      if (hostPlayerData) {
        // 숙주의 좀비 리스트 업데이트
        const hostData = await this.gameDataService.getHostData(gameId);
        if (hostData) {
          // 사살된 좀비를 리스트에서 제거
          hostData.zombieList = hostData.zombieList.filter(
            (z) => z.playerId !== killedPlayerId,
          );
          await this.gameDataService.saveHostData(gameId, hostData);

          // 숙주에게만 개별적으로 업데이트 전송
          const zombieList = await this.zombieService.getZombiesForHost(gameId);
          await this.redisPubSubService.publishToRegion(
            gameId,
            hostPlayerData.regionId,
            {
              hostAct: {
                canInfect: hostData.canInfect,
                zombieList: zombieList.map((z) => ({
                  playerId: z.playerId,
                  targetId: z.targetId,
                  nextRegion: z.nextRegion,
                  leftTurn: z.leftTurn,
                  region: z.region,
                })),
              },
              alarm: {
                message: `💥 좀비가 된 ${targetNickname}이(가) 산탄총에 사살되었습니다.`,
                img: 'alert',
              },
            },
          );
        }
      }
    }
  }
}

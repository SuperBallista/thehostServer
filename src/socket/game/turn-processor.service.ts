import { Injectable } from '@nestjs/common';
import { BotService } from '../../bot/bot.service';
import { GameDataService } from './game-data.service';
import { PlayerManagerService } from './player-manager.service';
import { ZombieService } from './zombie.service';
import { HostActionService } from './host-action.service';
import { GameTurnService } from './gameTurn.service';
import { ChatService } from './chat.service';
import { RedisPubSubService } from '../../redis/redisPubSub.service';
import { RedisService } from '../../redis/redis.service';
import { GameStateService } from './game-state.service';
import { GamePlayerInRedis } from './game.types';
import { ZombieState } from './zombie.service';
import { userDataResponse } from '../payload.types';

const ANIMAL_NICKNAMES = [
  '호랑이', '사자', '곰', '늑대', '여우', '토끼', '사슴', '다람쥐', '코끼리', '기린',
  '펭귄', '독수리', '올빼미', '고래', '돌고래', '상어', '문어', '해파리', '거북이', '악어'
];

@Injectable()
export class TurnProcessorService {
  constructor(
    private readonly botService: BotService,
    private readonly gameDataService: GameDataService,
    private readonly playerManagerService: PlayerManagerService,
    private readonly zombieService: ZombieService,
    private readonly hostActionService: HostActionService,
    private readonly gameTurnService: GameTurnService,
    private readonly chatService: ChatService,
    private readonly redisPubSubService: RedisPubSubService,
    private readonly redisService: RedisService,
    private readonly gameStateService: GameStateService,
  ) {}

  /**
   * 턴 종료 시 호출되는 메인 메서드
   */
  async processTurnEnd(gameId: string): Promise<void> {
    console.log(`[TurnProcessor] 턴 종료 처리 시작 - gameId: ${gameId}`);
    
    try {
      // 1단계: 현재 위치에서의 처리
      // 1-1. 숙주 감염 처리 (현재 위치에서)
      await this.processHostInfection(gameId);
      
      // 1-2. 좀비 조우 결과 처리 (현재 위치에서 도주/유인/숨기)
      await this.processZombieEncounters(gameId);
      
      // 2단계: 이동 처리
      // 2-1. 플레이어 이동 (next → region)
      await this.processPlayerMovements(gameId);
      
      // 2-2. 좀비 이동 카운트 및 이동
      await this.processZombieMovements(gameId);
      
      // 3단계: 이동 후 처리
      // 3-1. 감염된 플레이어의 좀비 변이 체크 (새 위치에서)
      await this.processZombieTransformations(gameId);
      
      
      // 4단계: 다음 턴 시작
      await this.startNextTurn(gameId);
      
      console.log(`[TurnProcessor] 턴 종료 처리 완료 - gameId: ${gameId}`);
    } catch (error) {
      console.error(`[TurnProcessor] 턴 종료 처리 중 오류:`, error);
      throw error;
    }
  }

  /**
   * 1-1. 숙주 감염 처리
   */
  private async processHostInfection(gameId: string): Promise<void> {
    console.log(`[TurnProcessor] 숙주 감염 처리 시작`);
    
    const hostData = await this.gameDataService.getHostData(gameId);
    if (!hostData) return;
    
    // 감염 대상이 설정되어 있으면 처리
    if (hostData.infect !== undefined) {
      const targetPlayer = await this.playerManagerService.getPlayerData(gameId, hostData.infect);
      if (targetPlayer && (targetPlayer.state === 'alive')) {
        // 감염 처리
        const gameData = await this.gameDataService.getGameData(gameId);
        targetPlayer.infected = gameData.turn; // 현재 턴 번호 저장
        await this.gameDataService.savePlayerData(gameId, targetPlayer.playerId, targetPlayer);
        
        const targetNickname = ANIMAL_NICKNAMES[targetPlayer.playerId] || `플레이어${targetPlayer.playerId}`;
        console.log(`[TurnProcessor] ${targetNickname}이(가) 감염되었습니다. (${gameData.turn + 5}턴에 변이)`);
        
        // 감염은 비밀이므로 공개 메시지 없음
      }
      
      // 감염 사용 후 초기화
      hostData.infect = undefined;
      hostData.canInfect = false;
    } else {
      // 감염을 사용하지 않았으면 다음 턴에 사용 가능
      hostData.canInfect = true;
    }
    
    await this.gameDataService.saveHostData(gameId, hostData);
  }

  /**
   * 1-2. 좀비 조우 결과 처리
   */
  private async processZombieEncounters(gameId: string): Promise<void> {
    console.log(`[TurnProcessor] 좀비 조우 처리 시작`);
    
    const allPlayers = await this.playerManagerService.getAllPlayersInGame(gameId);
    const zombies = await this.zombieService.getAllZombies(gameId);
    
    // 지역별로 생존자와 좀비 그룹화
    const regionMap = new Map<number, {
      survivors: GamePlayerInRedis[],
      zombies: ZombieState[]
    }>();
    
    // 생존자 매핑
    for (const player of allPlayers) {
      if (player.state === 'alive' || player.state === 'host') {
        if (!regionMap.has(player.regionId)) {
          regionMap.set(player.regionId, { survivors: [], zombies: [] });
        }
        regionMap.get(player.regionId)!.survivors.push(player);
      }
    }
    
    // 좀비 매핑
    for (const zombie of zombies) {
      if (!regionMap.has(zombie.region)) {
        regionMap.set(zombie.region, { survivors: [], zombies: [] });
      }
      regionMap.get(zombie.region)!.zombies.push(zombie);
    }
    
    // 각 지역에서 좀비 조우 처리
    for (const [regionId, { survivors, zombies: regionZombies }] of regionMap) {
      if (regionZombies.length > 0 && survivors.length > 0) {
        await this.processRegionEncounter(gameId, regionId, survivors, regionZombies);
      }
    }
  }

  /**
   * 특정 지역의 좀비 조우 처리
   */
  private async processRegionEncounter(
    gameId: string, 
    regionId: number, 
    survivors: GamePlayerInRedis[], 
    zombies: ZombieState[]
  ): Promise<void> {
    console.log(`[TurnProcessor] 지역 ${regionId} 좀비 조우 처리`);
    
    // 유인을 선택한 플레이어들
    const lurePlayers = survivors.filter(p => p.act === 'lure');
    // 숨기를 선택한 플레이어들
    const hidePlayers = survivors.filter(p => p.act === 'hide');
    // 도주를 선택한 플레이어들 (이미 안전)
    const runawayPlayers = survivors.filter(p => p.act === 'runaway');
    
    // 도주한 플레이어는 canEscape를 false로 설정
    for (const player of runawayPlayers) {
      player.canEscape = false;
      await this.gameDataService.savePlayerData(gameId, player.playerId, player);
      
      const playerNickname = ANIMAL_NICKNAMES[player.playerId] || `플레이어${player.playerId}`;
      await this.chatService.sendSystemMessage(
        gameId,
        `${playerNickname}이(가) 도주하여 좀비를 피했습니다. (다음 턴 도주 불가)`,
        regionId
      );
    }
    
    // 사망자 목록
    const killedPlayers: number[] = [];
    
    // 유인한 플레이어가 있으면 좀비가 그들을 추격
    if (lurePlayers.length > 0) {
      // 유인한 플레이어들 중 좀비의 타겟이 된 사람들 처리
      for (const zombie of zombies) {
        if (zombie.targetId) {
          const target = survivors.find(s => s.playerId === zombie.targetId);
          if (target && target.act === 'lure') {
            killedPlayers.push(target.playerId);
          }
        }
      }
      
      // 숨은 플레이어들은 생존
      for (const player of hidePlayers) {
        const playerNickname = ANIMAL_NICKNAMES[player.playerId] || `플레이어${player.playerId}`;
        await this.chatService.sendSystemMessage(
          gameId,
          `${playerNickname}이(가) 무사히 숨어서 살아남았습니다.`,
          regionId
        );
      }
    } else if (hidePlayers.length > 0 && lurePlayers.length === 0) {
      // 유인이 없고 숨기만 있으면 좀비의 타겟이 된 사람은 발견됨
      for (const zombie of zombies) {
        if (zombie.targetId) {
          const target = hidePlayers.find(h => h.playerId === zombie.targetId);
          if (target) {
            killedPlayers.push(target.playerId);
          }
        }
      }
    }
    
    // 사망 처리
    for (const playerId of killedPlayers) {
      const player = await this.playerManagerService.getPlayerData(gameId, playerId);
      if (player) {
        player.state = 'killed';
        await this.gameDataService.savePlayerData(gameId, playerId, player);
        
        const playerNickname = ANIMAL_NICKNAMES[playerId] || `플레이어${playerId}`;
        // 현재 구역(좀비 조우 구역)에 있는 플레이어들에게만 알림
        await this.chatService.sendSystemMessage(
          gameId,
          `💀 ${playerNickname}이(가) 좀비에게 잡혔습니다!`,
          regionId
        );
        
        // 실제 플레이어인 경우 사망 알림 후 로비로 이동
        if (player.userId > 0) {
          await this.notifyAndMoveToLobby(gameId, player.userId, playerId, 'killed');
        }
      }
    }
    
    // 도주하지 않은 플레이어들의 canEscape를 true로 리셋
    for (const player of survivors) {
      if (player.act !== 'runaway' && !player.canEscape) {
        player.canEscape = true;
        await this.gameDataService.savePlayerData(gameId, player.playerId, player);
      }
    }
  }

  /**
   * 2-1. 플레이어 이동 처리
   */
  private async processPlayerMovements(gameId: string): Promise<void> {
    console.log(`[TurnProcessor] 플레이어 이동 처리 시작`);
    
    const allPlayers = await this.playerManagerService.getAllPlayersInGame(gameId);
    
    for (const player of allPlayers) {
      // 살아있는 플레이어만 이동
      if (player.state === 'alive' || player.state === 'host') {
        // next를 region으로 이동
        const previousRegion = player.regionId;
        player.regionId = player.next;
        
        await this.gameDataService.savePlayerData(gameId, player.playerId, player);
        
        if (previousRegion !== player.regionId && player.userId > 0) {
          // 이동 알림은 개인별로 처리 (gameTurn.service.ts에서 처리됨)
          console.log(`[TurnProcessor] 플레이어 ${player.playerId} 이동: ${previousRegion} → ${player.regionId}`);
          
          // Socket.IO 룸 업데이트
          await this.redisPubSubService.updatePlayerRegionRoom(gameId, player.userId, previousRegion, player.regionId);
        }
      }
    }
  }

  /**
   * 2-2. 좀비 이동 처리
   */
  private async processZombieMovements(gameId: string): Promise<void> {
    console.log(`[TurnProcessor] 좀비 이동 처리 시작`);
    
    const zombies = await this.zombieService.getAllZombies(gameId);
    
    for (const zombie of zombies) {
      const result = await this.zombieService.processZombieTurn(gameId, zombie.playerId);
      
      if (result.moved && result.newRegion !== undefined) {
        const zombieNickname = ANIMAL_NICKNAMES[zombie.playerId] || `좀비${zombie.playerId}`;
        const regionName = await this.getRegionName(result.newRegion);
        
        // 이동한 지역에 있는 플레이어들에게만 알림
        await this.chatService.sendSystemMessage(
          gameId,
          `🧟 ${zombieNickname}이(가) ${regionName}으로 이동했습니다!`,
          result.newRegion
        );
      }
    }
  }

  /**
   * 3-1. 감염된 플레이어의 좀비 변이 체크
   */
  private async processZombieTransformations(gameId: string): Promise<void> {
    console.log(`[TurnProcessor] 좀비 변이 체크 시작`);
    
    const gameData = await this.gameDataService.getGameData(gameId);
    const currentTurn = gameData.turn;
    const allPlayers = await this.playerManagerService.getAllPlayersInGame(gameId);
    
    for (const player of allPlayers) {
      // 감염되어 있고, 감염 후 5턴이 지났으면 좀비로 변이
      if (player.infected !== null && currentTurn - player.infected >= 5) {
        const playerNickname = ANIMAL_NICKNAMES[player.playerId] || `플레이어${player.playerId}`;
        
        // 좀비로 변이 (탈락 처리)
        player.state = 'zombie';
        player.infected = null;
        await this.gameDataService.savePlayerData(gameId, player.playerId, player);
        
        // 좀비 엔티티 생성
        await this.zombieService.createZombie(gameId, player.playerId, player.regionId);
        
        // 변이 후 같은 구역에 있는 플레이어들에게 알림
        await this.chatService.sendSystemMessage(
          gameId,
          `💀 ${playerNickname}이(가) 좀비로 변이했습니다!`,
          player.regionId  // 이동 후의 새 위치
        );
        
        console.log(`[TurnProcessor] ${playerNickname}이(가) 좀비로 변이됨`);
        
        // 실제 플레이어인 경우 변이 알림 후 로비로 이동
        if (player.userId > 0) {
          await this.notifyAndMoveToLobby(gameId, player.userId, player.playerId, 'zombie');
        }
      }
    }
  }

  /**
   * 4. 다음 턴 시작
   */
  private async startNextTurn(gameId: string): Promise<void> {
    console.log(`[TurnProcessor] 다음 턴 시작`);
    
    const gameData = await this.gameDataService.getGameData(gameId);
    const previousTurn = gameData.turn;
    gameData.turn += 1;
    await this.gameDataService.saveGameData(gameId, gameData);
    
    // 이전 턴의 낙서를 새 턴으로 전달
    await this.transferGraffitiToNewTurn(gameId, previousTurn, gameData.turn);
    
    // 봇의 턴 시작 세팅
    await this.botService.handleTurnStart(gameId);
    
    // 턴 시작 처리 (아이템 지급 등)
    await this.gameTurnService.onTurnStart(gameId, gameData.turn);
    
    // 턴 시간 설정 (1-4턴: 60초, 5턴+: 90초)
    const turnDuration = gameData.turn <= 4 ? 60 : 90;
    
    // 모든 플레이어에게 턴 업데이트 전송
    await this.redisPubSubService.publishTurnUpdate(gameId, {
      event: 'turnStart',
      turn: gameData.turn
    });
    
    // 각 플레이어에게 개별 상태 업데이트 전송
    await this.sendUpdatesToAllPlayers(gameId);
    
    console.log(`[TurnProcessor] ${gameData.turn}턴 시작 (${turnDuration}초)`);
  }

  /**
   * 이전 턴의 낙서를 새 턴으로 전달
   */
  private async transferGraffitiToNewTurn(gameId: string, previousTurn: number, newTurn: number): Promise<void> {
    console.log(`[TurnProcessor] 낙서 전달: ${previousTurn}턴 → ${newTurn}턴`);
    
    // 모든 구역에 대해 낙서 전달 처리
    const maxRegions = 6; // 최대 구역 수
    
    for (let regionId = 0; regionId < maxRegions; regionId++) {
      try {
        // 이전 턴의 구역 데이터 가져오기
        const previousRegionKey = `game:${gameId}:region:${previousTurn}:${regionId}`;
        const previousRegionData = await this.redisService.getAndParse(previousRegionKey);
        
        if (previousRegionData && previousRegionData.regionMessageList) {
          // 새 턴의 구역 데이터 생성 (채팅 로그는 초기화, 낙서만 전달)
          const newRegionData = {
            chatLog: [],
            regionMessageList: [...previousRegionData.regionMessageList] // 낙서 복사
          };
          
          // 새 턴의 구역 데이터 저장
          const newRegionKey = `game:${gameId}:region:${newTurn}:${regionId}`;
          await this.redisService.stringifyAndSet(newRegionKey, newRegionData);
          
          console.log(`[TurnProcessor] 구역 ${regionId} 낙서 전달 완료: ${previousRegionData.regionMessageList.length}개`);
        } else {
          // 이전 턴 데이터가 없으면 빈 구역 데이터 생성
          const newRegionData = {
            chatLog: [],
            regionMessageList: []
          };
          
          const newRegionKey = `game:${gameId}:region:${newTurn}:${regionId}`;
          await this.redisService.stringifyAndSet(newRegionKey, newRegionData);
        }
      } catch (error) {
        console.error(`[TurnProcessor] 구역 ${regionId} 낙서 전달 실패:`, error);
        
        // 에러 발생 시 빈 구역 데이터 생성
        const newRegionData = {
          chatLog: [],
          regionMessageList: []
        };
        
        const newRegionKey = `game:${gameId}:region:${newTurn}:${regionId}`;
        await this.redisService.stringifyAndSet(newRegionKey, newRegionData);
      }
    }
  }

  /**
   * 지역 이름 가져오기
   */
  private async getRegionName(regionId: number): Promise<string> {
    const regionNames = ['해안', '폐건물', '정글', '동굴', '산 정상', '개울'];
    return regionNames[regionId] || '알 수 없는 지역';
  }

  /**
   * 모든 플레이어에게 업데이트된 상태 전송
   */
  private async sendUpdatesToAllPlayers(gameId: string): Promise<void> {
    console.log(`[TurnProcessor] 모든 플레이어에게 상태 업데이트 전송`);
    
    const allPlayers = await this.playerManagerService.getAllPlayersInGame(gameId);
    const gameData = await this.gameDataService.getGameData(gameId);
    
    // 각 플레이어에게 개별화된 업데이트 전송
    for (const player of allPlayers) {
      // 실제 플레이어만 처리 (봇 제외)
      if (player.userId > 0 && (player.state === 'alive' || player.state === 'host')) {
        const updateData: Partial<userDataResponse> = {};
        
        // myStatus 업데이트
        updateData.myStatus = {
          state: player.state,
          items: player.items,
          region: player.regionId,
          nextRegion: player.next,
          act: player.act,
          canEscape: player.canEscape
        };
        
        // gameTurn과 count 업데이트
        updateData.gameTurn = gameData.turn;
        updateData.count = gameData.turn <= 4 ? 60 : 90;
        
        // 생존자 리스트 업데이트 - sameRegion만 업데이트
        updateData.survivorList = allPlayers
          .filter(p => p.playerId !== player.playerId)
          .map(p => ({
            playerId: p.playerId,
            state: p.state === 'host' ? 'alive' : p.state,
            sameRegion: p.regionId === player.regionId
          }));
        
        // 호스트인 경우 추가 정보
        if (player.state === 'host') {
          const hostData = await this.gameDataService.getHostData(gameId);
          if (hostData) {
            const zombieList = await this.zombieService.getZombiesForHost(gameId);
            updateData.hostAct = {
              infect: hostData.infect,
              canInfect: hostData.canInfect,
              zombieList: zombieList
            };
          }
        }
        
        // 플레이어에게 전송
        await this.redisPubSubService.publishPlayerStatus(
          gameId,
          player.playerId,
          updateData,
          player.playerId
        );
      }
    }
  }

  /**
   * 플레이어에게 탈락 알림을 보내고 로비로 이동
   */
  private async notifyAndMoveToLobby(
    gameId: string, 
    userId: number, 
    playerId: number,
    reason: 'killed' | 'zombie'
  ): Promise<void> {
    const message = reason === 'killed' 
      ? '좀비에게 잡혀 사망했습니다. 잠시 후 로비로 이동합니다.'
      : '좀비로 변이되었습니다. 잠시 후 로비로 이동합니다.';
    
    const image = reason === 'killed' ? '/img/death.png' : '/img/zombie_transform.png';
    
    // 탈락 메시지 전송
    await this.redisPubSubService.publishPlayerStatus(gameId, playerId, {
      alarm: {
        message,
        img: image
      }
    }, playerId);
    
    // 3초 후 로비로 이동
    setTimeout(async () => {
      try {
        // 플레이어 상태를 left로 변경
        const player = await this.playerManagerService.getPlayerData(gameId, playerId);
        if (player) {
          player.state = 'left';
          await this.gameDataService.savePlayerData(gameId, playerId, player);
        }
        
        // 위치 상태를 로비로 변경
        await this.playerManagerService.updateLocationState(userId, 'lobby', '');
        
        // 로비 이동 메시지 전송
        await this.redisPubSubService.publishPlayerStatus(gameId, playerId, {
          locationState: 'lobby',
          exitRoom: true
        }, playerId);
        
        console.log(`[TurnProcessor] 플레이어 ${playerId} (userId: ${userId})를 로비로 이동시킴`);
      } catch (error) {
        console.error(`[TurnProcessor] 플레이어 로비 이동 중 오류:`, error);
      }
    }, 3000);
  }
}
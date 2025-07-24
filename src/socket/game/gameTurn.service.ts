import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { RedisService } from 'src/redis/redis.service';
import { RedisPubSubService } from 'src/redis/redisPubSub.service';
import { GamePlayerInRedis, ItemCode, REGION_NAMES, ITEM_NAMES } from './game.types';
import { ChatService } from './chat.service';
import { GameDataService } from './game-data.service';
import * as itemProbabilities from './itemProbabilities.json';
import { BotService } from '../../bot/bot.service';
import { LLMService } from '../../bot/llm.service';
import { MemoryService } from '../../bot/memory.service';
import { PlayerManagerService } from './player-manager.service';


interface ItemProbability {
  itemId: ItemCode | 'none';
  name: string;
  probability: number;
}

interface ItemProbabilities {
  items: ItemProbability[];
}

@Injectable()
export class GameTurnService {
  private turnTimers = new Map<string, NodeJS.Timeout>();
  private summaryStarted = new Set<string>(); // 요약 생성 시작된 게임 ID 추적

  constructor(
    private readonly redisService: RedisService,
    private readonly redisPubSubService: RedisPubSubService,
    private readonly chatService: ChatService,
    private readonly gameDataService: GameDataService,
    private readonly botService: BotService,
    private readonly llmService: LLMService,
    private readonly memoryService: MemoryService,
    private readonly playerManagerService: PlayerManagerService,
  ) {}

  async onTurnStart(gameId: string, currentTurn?: number): Promise<void> {
    try {
      // 이전 타이머가 있으면 취소
      this.clearTurnTimer(gameId);
      
      const players = await this.getAllPlayersInGame(gameId);
      
      // 플레이어별로 아이템 지급
      for (const player of players) {
        if (player.state === 'alive' || player.state === 'host') {
          const givenItem = await this.giveItemToPlayer(gameId, player.playerId);
          
          // 2턴 이상에서 개인 메시지로 전송 (1턴은 게임 참가 시 개별 전송)
          if (currentTurn && currentTurn > 1 && player.userId > 0) {
            const regionName = REGION_NAMES[player.regionId] || '알 수 없는 지역';
            let systemMessage = `${regionName}으로 진입하였습니다.`;
            
            if (givenItem && givenItem !== 'none') {
              const itemName = ITEM_NAMES[givenItem] || '알 수 없는 아이템';
              systemMessage += ` 이곳에서 ${itemName}을 획득하였습니다.`;
            }
            
            // 개인 메시지를 region 응답에 포함시켜 전송
            await this.redisPubSubService.publishPlayerStatus(gameId, player.playerId, {
              region: {
                chatLog: [{
                  system: true,
                  message: systemMessage,
                  timeStamp: new Date()
                }],
                regionMessageList: []
              }
            }, player.playerId);
          }
        }
      }
      
      // 첫 턴이 아닌 경우에만 업데이트 전송 (첫 턴은 게임 시작 시 전체 상태가 전송됨)
      if (currentTurn && currentTurn > 1) {
        await this.redisPubSubService.publishTurnUpdate(gameId, {
          event: 'turnStarted',
          itemsDistributed: true,
          turn: currentTurn
        });
      }
      
      // 턴 시간 설정 및 Redis에 저장
      const gameData = await this.gameDataService.getGameData(gameId);
      if (gameData) {
        const turnDuration = gameData.turn <= 4 ? 60 : 90;
        await this.setTurnEndTime(gameId, turnDuration);
        this.startTurnTimer(gameId);
      }
      
    } catch (error) {
      throw new WsException(`턴 시작 처리 중 오류: ${error}`);
    }
  }

  private async giveItemToPlayer(gameId: string, playerId: number): Promise<ItemCode | 'none' | null> {
    const selectedItem = this.selectRandomItem();
    
    if (selectedItem && selectedItem.itemId !== 'none') {
      const playerKey = `game:${gameId}:player:${playerId}`;
      const playerData: GamePlayerInRedis = await this.redisService.getAndParse(playerKey);
      
      if (!playerData) {
        throw new WsException(`플레이어 ${playerId}의 데이터를 찾을 수 없습니다`);
      }
      
      if (!playerData.items) {
        playerData.items = [];
      }
      
      playerData.items.push(selectedItem.itemId as ItemCode);
      
      await this.redisService.stringifyAndSet(playerKey, playerData);
      
      // 플레이어에게 개별적으로 아이템 획득 알림 전송
      if (playerData.userId > 0) { // 실제 플레이어인 경우에만
        await this.redisPubSubService.publishPlayerStatus(gameId, playerId, {
          alarm: {
            message: `${selectedItem.name}을(를) 획득했습니다!`,
            img: 'info'
          }
        }, playerId);
      }
      
      console.log(`플레이어 ${playerId}에게 아이템 ${selectedItem.name} 지급`);
      return selectedItem.itemId;
    }
    
    return selectedItem ? selectedItem.itemId : null;
  }

  private selectRandomItem(): ItemProbability | null {
    const probabilities = (itemProbabilities as unknown as ItemProbabilities).items;
    const totalProbability = probabilities.reduce((sum, item) => sum + item.probability, 0);
    
    if (totalProbability === 0) return null;
    
    const random = Math.random() * totalProbability;
    let cumulativeProbability = 0;
    
    for (const item of probabilities) {
      cumulativeProbability += item.probability;
      if (random <= cumulativeProbability) {
        return item;
      }
    }
    
    return null;
  }

  private async getAllPlayersInGame(gameId: string): Promise<GamePlayerInRedis[]> {
    const players: GamePlayerInRedis[] = [];
    const MAX_PLAYERS = 20;
    
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const playerData = await this.redisService.getAndParse(`game:${gameId}:player:${i}`);
      if (playerData) {
        players.push(playerData);
      }
    }
    
    return players;
  }

  /**
   * 턴 종료 시간을 Redis에 저장
   */
  private async setTurnEndTime(gameId: string, durationInSeconds: number): Promise<void> {
    const turnEndTime = Date.now() + (durationInSeconds * 1000);
    await this.redisService.stringifyAndSet(`game:${gameId}:turnEndTime`, { endTime: turnEndTime });
    console.log(`[GameTurn] 턴 종료 시간 설정 - gameId: ${gameId}, endTime: ${new Date(turnEndTime).toISOString()}`);
  }

  /**
   * 턴 타이머 시작 (Redis 기반)
   */
  private startTurnTimer(gameId: string): void {
    console.log(`[GameTurn] Redis 기반 턴 타이머 시작 - gameId: ${gameId}`);
    
    // 기존 타이머가 있으면 제거
    this.clearTurnTimer(gameId);
    
    const checkInterval = setInterval(async () => {
      try {
        // Redis에서 턴 종료 시간 가져오기
        const turnEndTimeData = await this.redisService.getAndParse(`game:${gameId}:turnEndTime`);
        
        if (!turnEndTimeData || !turnEndTimeData.endTime) {
          console.log(`[GameTurn] 턴 종료 시간이 없음 - 타이머 중지`);
          clearInterval(checkInterval);
          this.turnTimers.delete(gameId);
          return;
        }
        
        const currentTime = Date.now();
        const remainingTime = turnEndTimeData.endTime - currentTime;
        
        // 디버깅을 위한 로그 (10초마다)
        if (remainingTime % 10000 < 1000) {
          console.log(`[GameTurn] 남은 시간: ${Math.ceil(remainingTime / 1000)}초`);
        }
        
        // 턴 종료 15초 전 봇 요약 생성 시작
        if (remainingTime <= 15000 && remainingTime > 14000 && !this.summaryStarted.has(gameId)) {
          console.log(`[GameTurn] 턴 종료 15초 전 - 봇 요약 생성 시작: ${gameId}`);
          this.summaryStarted.add(gameId);
          this.startTurnSummaryGeneration(gameId);
        }
        
        // 턴 종료 10초 전 봇의 턴 종료 행동 설정
        if (remainingTime <= 10000 && remainingTime > 9000) {
          console.log(`[GameTurn] 봇의 턴 종료 행동 설정 - gameId: ${gameId}`);
          await this.botService.handleTurnEnd(gameId);
        }
        
        // 시간이 만료되었으면 턴 종료 처리
        if (remainingTime <= 0) {
          console.log(`[GameTurn] 턴 타이머 만료 - gameId: ${gameId}`);
          
          // 타이머 중지
          clearInterval(checkInterval);
          this.turnTimers.delete(gameId);
          this.summaryStarted.delete(gameId); // 요약 시작 플래그 정리
          
          // Redis에서 턴 종료 시간 삭제
          await this.redisService.del(`game:${gameId}:turnEndTime`);
          
          // 턴 종료 이벤트 발행
          const { InternalUpdateType, InternalMessageBuilder } = await import('../../redis/pubsub.types');
          await this.redisPubSubService.publishInternal({
            type: InternalUpdateType.TURN_END,
            data: { gameId },
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error(`[GameTurn] 타이머 체크 중 오류:`, error);
      }
    }, 1000); // 1초마다 체크
    
    // NodeJS.Timeout 타입으로 저장
    this.turnTimers.set(gameId, checkInterval as unknown as NodeJS.Timeout);
  }

  /**
   * 턴 타이머 취소
   */
  private clearTurnTimer(gameId: string): void {
    const timer = this.turnTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.turnTimers.delete(gameId);
      console.log(`[GameTurn] 턴 타이머 취소 - gameId: ${gameId}`);
    }
  }

  /**
   * 게임 종료 시 타이머 정리
   */
  async cleanupGame(gameId: string): Promise<void> {
    this.clearTurnTimer(gameId);
    // Redis에서 턴 종료 시간도 삭제
    await this.redisService.del(`game:${gameId}:turnEndTime`);
  }
  
  /**
   * 현재 턴의 남은 시간 가져오기 (프론트엔드 동기화용)
   */
  async getRemainingTurnTime(gameId: string): Promise<number> {
    const turnEndTimeData = await this.redisService.getAndParse(`game:${gameId}:turnEndTime`);
    if (!turnEndTimeData || !turnEndTimeData.endTime) {
      return 0;
    }
    
    const remainingTime = Math.max(0, turnEndTimeData.endTime - Date.now());
    return Math.ceil(remainingTime / 1000); // 초 단위로 반환
  }

  /**
   * 턴 요약 생성 시작 (15초 전부터 순차적으로)
   */
  private async startTurnSummaryGeneration(gameId: string): Promise<void> {
    try {
      console.log(`[GameTurn] 턴 요약 생성 시작 - gameId: ${gameId}`);
      
      // 백그라운드에서 순차적으로 요약 처리 (await 없이)
      this.processTurnSummariesSequentially(gameId);
      
    } catch (error) {
      console.error(`[GameTurn] 턴 요약 생성 시작 중 오류:`, error);
    }
  }

  /**
   * 봇들의 턴 요약을 순차적으로 처리 (백그라운드)
   */
  private async processTurnSummariesSequentially(gameId: string): Promise<void> {
    try {
      console.log(`[GameTurn] 순차적 턴 요약 생성 시작 - gameId: ${gameId}`);
      
      // 봇 플레이어들 조회
      const botPlayers = await this.playerManagerService.getBotPlayers(gameId);
      
      if (botPlayers.length === 0) {
        console.log(`[GameTurn] 요약할 봇이 없음: ${gameId}`);
        return;
      }

      // 현재 게임 데이터 조회 (턴 정보용)
      const gameData = await this.gameDataService.getGameData(gameId);
      const currentTurn = gameData?.turn || 1;
      
      // 현재 턴의 이벤트 수집
      const turnEvents = await this.collectTurnEvents(gameId);
      
      if (turnEvents.length === 0) {
        console.log(`[GameTurn] 요약할 턴 이벤트가 없음: ${gameId}`);
        return;
      }

      // 각 봇에 대해 순차적으로 요약 생성 (2초 간격)
      for (let i = 0; i < botPlayers.length; i++) {
        const botPlayer = botPlayers[i];
        
        try {
          console.log(`[GameTurn] 봇 ${botPlayer.userId} 요약 생성 중... (${i + 1}/${botPlayers.length})`);
          
          // LLM을 사용하여 턴 요약 생성
          const summary = await this.llmService.summarizeTurn(turnEvents);
          
          if (summary && summary.summary) {
            // 봇 메모리의 현재 턴 정보 업데이트
            await this.memoryService.updateShortTermMemory(gameId, botPlayer.userId, {
              currentTurn: currentTurn
            });
            
            // 봇 메모리에 턴 요약 저장
            await this.memoryService.updateTurnSummary(
              gameId, 
              botPlayer.userId, 
              summary.summary
            );
            
            console.log(`[GameTurn] 봇 ${botPlayer.userId} 요약 저장 완료 (턴 ${currentTurn})`);
          } else {
            console.log(`[GameTurn] 봇 ${botPlayer.userId} 요약 생성 실패 - 빈 응답`);
          }
          
          // 마지막 봇이 아니면 2초 대기
          if (i < botPlayers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
        } catch (error) {
          console.error(`[GameTurn] 봇 ${botPlayer.userId} 순차적 요약 생성 실패:`, error);
        }
      }
      
      console.log(`[GameTurn] 모든 봇 요약 생성 완료 - gameId: ${gameId}`);
    } catch (error) {
      console.error(`[GameTurn] 순차적 요약 처리 중 오류:`, error);
    }
  }

  /**
   * 현재 턴의 이벤트 수집
   */
  private async collectTurnEvents(gameId: string): Promise<Array<{type: string, message: string, timestamp?: any}>> {
    const events: Array<{type: string, message: string, timestamp?: any}> = [];
    
    try {
      // 현재 턴의 채팅 메시지들 수집 (Redis에서 직접 조회)
      const chatKey = `game:${gameId}:chats`;
      const chatData = await this.redisService.getAndParse(chatKey);
      
      if (chatData && Array.isArray(chatData)) {
        chatData.forEach((chat: any) => {
          events.push({
            type: 'chat',
            message: `${chat.sender || 'Unknown'}: ${chat.message || ''}`,
            timestamp: chat.timestamp
          });
        });
      }
      
      // 시스템 메시지 추가 (게임 상태 변화 등)
      const gameData = await this.gameDataService.getGameData(gameId);
      events.push({
        type: 'system',
        message: `턴 ${gameData?.turn || '알 수 없음'} 종료 - 게임 상황 변화`,
        timestamp: new Date()
      });
      
      console.log(`[GameTurn] 수집된 이벤트 수: ${events.length}`);
      return events;
      
    } catch (error) {
      console.error(`[GameTurn] 턴 이벤트 수집 중 오류:`, error);
      return [];
    }
  }
}
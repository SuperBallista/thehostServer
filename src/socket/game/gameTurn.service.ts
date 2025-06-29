import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { RedisService } from 'src/redis/redis.service';
import { RedisPubSubService } from 'src/redis/redisPubSub.service';
import { GamePlayerInRedis, ItemCode } from './game.types';
import * as itemProbabilities from './itemProbabilities.json';


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
  constructor(
    private readonly redisService: RedisService,
    private readonly redisPubSubService: RedisPubSubService,
  ) {}

  async onTurnStart(gameId: string, currentTurn?: number): Promise<void> {
    try {
      const players = await this.getAllPlayersInGame(gameId);
      
      for (const player of players) {
        if (player.state === 'alive' || player.state === 'host') {
          await this.giveItemToPlayer(gameId, player.playerId);
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
      
    } catch (error) {
      throw new WsException(`턴 시작 처리 중 오류: ${error}`);
    }
  }

  private async giveItemToPlayer(gameId: string, playerId: number): Promise<ItemCode | null> {
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
      
      console.log(`플레이어 ${playerId}에게 아이템 ${selectedItem.name} 지급`);
      return selectedItem.itemId as ItemCode;
    }
    
    return null;
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
}
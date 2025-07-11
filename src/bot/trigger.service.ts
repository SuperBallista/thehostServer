import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { RedisPubSubService } from '../redis/redisPubSub.service';
import { BotTrigger, TriggerStorage, TriggeredEvent } from './interfaces/trigger.interface';

@Injectable()
export class TriggerService {
  private readonly logger = new Logger(TriggerService.name);
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();
  private chatListeners: Map<string, (message: any) => void> = new Map();
  private botService: any; // BotService type to avoid circular dependency

  constructor(
    private readonly redisService: RedisService,
    private readonly redisPubSubService: RedisPubSubService,
  ) {}

  setBotService(botService: any) {
    this.botService = botService;
  }

  /**
   * 트리거 저장
   */
  async saveTriggers(gameId: string, botId: number, triggers: BotTrigger[]): Promise<void> {
    const botState = await this.botService.getBotState(botId);
    if (!botState) {
      throw new Error(`봇 상태를 찾을 수 없음: ${botId}`);
    }

    const gameData = await this.redisService.getAndParse(`game:${gameId}`);
    const currentTurn = gameData?.turn || 1;

    const triggerStorage: TriggerStorage = {
      triggers,
      createdAt: new Date().toISOString(),
      turnNumber: currentTurn,
      personality: botState.personality,
    };

    const key = `bot:triggers:${gameId}:${botId}`;
    await this.redisService.stringifyAndSet(key, triggerStorage, 10800);
    
    this.logger.log(`트리거 저장 완료: ${gameId}:${botId}, ${triggers.length}개`);
  }

  /**
   * 트리거 조회
   */
  async getTriggers(gameId: string, botId: number): Promise<BotTrigger[]> {
    const key = `bot:triggers:${gameId}:${botId}`;
    const storage = await this.redisService.getAndParse(key) as TriggerStorage;
    return storage?.triggers || [];
  }

  /**
   * 트리거 모니터링 시작
   */
  async startMonitoring(gameId: string, botId: number): Promise<void> {
    const triggers = await this.getTriggers(gameId, botId);
    
    for (const trigger of triggers) {
      switch (trigger.type) {
        case 'time':
          this.setupTimeTrigger(gameId, botId, trigger);
          break;
        case 'chat':
          this.setupChatTrigger(gameId, botId, trigger);
          break;
        case 'radio':
          this.setupRadioTrigger(gameId, botId, trigger);
          break;
      }
    }
    
    this.logger.log(`트리거 모니터링 시작: ${gameId}:${botId}`);
  }

  /**
   * 트리거 모니터링 중지
   */
  async stopMonitoring(gameId: string, botId: number): Promise<void> {
    const key = `${gameId}:${botId}`;
    
    // 타이머 정리
    const timers = Array.from(this.activeTimers.entries())
      .filter(([k]) => k.startsWith(key));
    
    for (const [timerKey, timer] of timers) {
      clearTimeout(timer);
      this.activeTimers.delete(timerKey);
    }
    
    // 리스너 정리
    const listeners = Array.from(this.chatListeners.entries())
      .filter(([k]) => k.startsWith(key));
    
    for (const [listenerKey] of listeners) {
      this.chatListeners.delete(listenerKey);
    }
    
    this.logger.log(`트리거 모니터링 중지: ${gameId}:${botId}`);
  }

  /**
   * 트리거 초기화
   */
  async clearTriggers(botId: number): Promise<void> {
    const keys = await this.redisService.scanKeys(`bot:triggers:*:${botId}`);
    for (const key of keys) {
      await this.redisService.del(key);
    }
  }

  /**
   * 시간 트리거 설정
   */
  private setupTimeTrigger(gameId: string, botId: number, trigger: BotTrigger): void {
    const condition = trigger.condition as any;
    const delay = condition.seconds * 1000;
    
    const timer = setTimeout(async () => {
      const event: TriggeredEvent = {
        triggerId: trigger.id,
        triggerType: 'time',
        data: { seconds: condition.seconds },
        timestamp: new Date(),
      };
      
      await this.fireTrigger(gameId, botId, event, trigger);
    }, delay);
    
    const key = `${gameId}:${botId}:${trigger.id}`;
    this.activeTimers.set(key, timer);
    
    this.logger.debug(`시간 트리거 설정: ${key}, ${condition.seconds}초 후`);
  }

  /**
   * 채팅 트리거 설정
   */
  private setupChatTrigger(gameId: string, botId: number, trigger: BotTrigger): void {
    const condition = trigger.condition as any;
    const key = `${gameId}:${botId}:${trigger.id}`;
    
    // 채팅 메시지 모니터링을 위한 리스너
    const listener = async (chatData: any) => {
      // 패턴 매칭
      const pattern = new RegExp(condition.pattern, 'i');
      if (!pattern.test(chatData.message)) {
        return;
      }
      
      // 발신자 확인
      if (condition.sender === 'specific' && chatData.playerId !== condition.senderId) {
        return;
      }
      
      const event: TriggeredEvent = {
        triggerId: trigger.id,
        triggerType: 'chat',
        data: chatData,
        timestamp: new Date(),
      };
      
      await this.fireTrigger(gameId, botId, event, trigger);
    };
    
    this.chatListeners.set(key, listener);
    this.logger.debug(`채팅 트리거 설정: ${key}, 패턴: ${condition.pattern}`);
  }

  /**
   * 무전기 트리거 설정
   */
  private setupRadioTrigger(gameId: string, botId: number, trigger: BotTrigger): void {
    const condition = trigger.condition as any;
    const key = `${gameId}:${botId}:${trigger.id}`;
    
    // 무전기 메시지 모니터링을 위한 리스너
    const listener = async (radioData: any) => {
      // 발신자 확인
      if (condition.sender === 'specific' && radioData.senderId !== condition.senderId) {
        return;
      }
      
      const event: TriggeredEvent = {
        triggerId: trigger.id,
        triggerType: 'radio',
        data: radioData,
        timestamp: new Date(),
      };
      
      await this.fireTrigger(gameId, botId, event, trigger);
    };
    
    this.chatListeners.set(key, listener);
    this.logger.debug(`무전기 트리거 설정: ${key}`);
  }

  /**
   * 트리거 발동
   */
  private async fireTrigger(
    gameId: string, 
    botId: number, 
    event: TriggeredEvent,
    trigger: BotTrigger
  ): Promise<void> {
    try {
      this.logger.log(`트리거 발동: ${trigger.id} (${trigger.metadata?.description})`);
      
      // 트리거 실행 기록 저장
      await this.recordTriggerExecution(gameId, botId, event, trigger);
      
      // BotService에 이벤트 전달
      if (this.botService) {
        await this.botService.handleTriggeredEvent(gameId, botId, event);
      }
      
    } catch (error) {
      this.logger.error(`트리거 발동 실패: ${error.message}`, error.stack);
    }
  }

  /**
   * 트리거 실행 기록
   */
  private async recordTriggerExecution(
    gameId: string,
    botId: number,
    event: TriggeredEvent,
    trigger: BotTrigger
  ): Promise<void> {
    const gameData = await this.redisService.getAndParse(`game:${gameId}`);
    const turnNumber = gameData?.turn || 1;
    
    const record = {
      triggerId: trigger.id,
      executedAt: event.timestamp.toISOString(),
      turnNumber,
      result: 'pending',
      action: {
        type: trigger.action,
        params: {},
      },
    };
    
    const key = `bot:trigger:history:${gameId}:${botId}`;
    
    // 기존 기록 가져오기
    let history = await this.redisService.getAndParse(key) || [];
    if (!Array.isArray(history)) {
      history = [];
    }
    
    // 새 기록 추가 (최대 50개 유지)
    history.unshift(record);
    if (history.length > 50) {
      history = history.slice(0, 50);
    }
    
    await this.redisService.stringifyAndSet(key, history, 10800);
  }

  /**
   * 채팅 메시지 처리 (RedisPubSub에서 호출)
   */
  async processChatMessage(gameId: string, chatData: { playerId: number; message: string; system: boolean }): Promise<void> {
    // 해당 게임의 모든 봇 찾기
    const botStates = await this.redisService.scanKeys(`bot:state:${gameId}:*`);
    
    for (const stateKey of botStates) {
      const botId = parseInt(stateKey.split(':').pop() || '0');
      const listenerKeys = Array.from(this.chatListeners.keys())
        .filter(k => k.startsWith(`${gameId}:${botId}:`));
      
      // 각 봇의 채팅 리스너 호출
      for (const key of listenerKeys) {
        const listener = this.chatListeners.get(key);
        if (listener) {
          await listener(chatData);
        }
      }
    }
  }

  /**
   * 무전기 메시지 처리
   */
  async processRadioMessage(gameId: string, radioData: { targetUserId: number; senderId: number; message: string }): Promise<void> {
    // 무전기 메시지는 특정 봇에게만 전달
    const targetBotId = radioData.targetUserId;
    if (targetBotId >= 0) return; // 봇이 아님
    
    const listenerKeys = Array.from(this.chatListeners.keys())
      .filter(k => k.startsWith(`${gameId}:${targetBotId}:`) && k.includes('radio'));
    
    for (const key of listenerKeys) {
      const listener = this.chatListeners.get(key);
      if (listener) {
        await listener(radioData);
      }
    }
  }
}
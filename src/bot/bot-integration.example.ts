/**
 * 봇 시스템 통합 예제
 *
 * 이 파일은 게임에 봇을 통합하는 방법을 보여줍니다.
 * 실제 구현 시 GameService와 SocketGateway에 통합하세요.
 */

import { BotService } from './bot.service';
import { BotConfig } from './interfaces/bot.interface';
import { GamePlayerInRedis } from '../socket/game/game.types';
import { chatMessage } from '../socket/game/game.types';

export class BotIntegrationExample {
  constructor(private readonly botService: BotService) {}

  /**
   * 방에 봇 추가하기
   */
  async addBotToRoom(roomId: string): Promise<void> {
    // 랜덤 봇 성격 생성
    const mbtiTypes = ['INTJ', 'ENFP', 'ISTP', 'ESFJ'] as const;
    const randomMbti = mbtiTypes[Math.floor(Math.random() * mbtiTypes.length)];

    const botConfig: BotConfig = {
      mbti: randomMbti,
      gender: Math.random() > 0.5 ? 'male' : 'female',
      name: `Bot_${Date.now()}`,
    };

    // 봇 생성
    const botId = await this.botService.createBot(roomId, botConfig);
    console.log(`봇 생성됨: ${botId}`);

    // 방의 플레이어 목록에 봇 추가
    // 실제 구현: RoomService에서 처리
  }

  /**
   * 게임 시작 시 봇 초기화
   */
  async onGameStart(
    gameId: string,
    players: GamePlayerInRedis[],
  ): Promise<void> {
    for (const player of players) {
      if (player.userId < 0) {
        // 봇인 경우
        await this.botService.initializeBotForGame(
          player.userId,
          gameId,
          player.playerId,
        );
      }
    }
  }

  /**
   * 턴 시작 시 봇 처리
   */
  async onTurnStart(gameId: string): Promise<void> {
    await this.botService.handleTurnStart(gameId);
  }

  /**
   * 턴 종료 시 봇 처리
   */
  async onTurnEnd(gameId: string): Promise<void> {
    await this.botService.handleTurnEnd(gameId);
  }

  /**
   * 채팅 메시지 수신 시
   */
  onChatMessage(gameId: string, chatData: chatMessage): void {
    // TriggerService에 채팅 메시지 전달
    // 실제 구현: RedisPubSubService에서 처리
    void gameId; // 향후 사용 예정
    void chatData; // 향후 사용 예정
  }

  /**
   * 봇 제거
   */
  async removeBotFromGame(botId: number): Promise<void> {
    await this.botService.removeBot(botId);
  }
}

/**
 * GameService 통합 예제
 *
 * GameService에 다음 코드를 추가하세요:
 *
 * constructor에 BotService 주입:
 * private readonly botService: BotService
 *
 * 게임 시작 시:
 * if (this.hasBots(players)) {
 *   await this.botService.handleGameStart(gameId, players);
 * }
 *
 * 턴 시작 시:
 * await this.botService.handleTurnStart(gameId);
 *
 * 턴 종료 시:
 * await this.botService.handleTurnEnd(gameId);
 */

/**
 * RedisPubSubService 통합 예제
 *
 * handleChatMessage 메서드에 추가:
 *
 * // 봇 트리거 처리
 * if (this.triggerService) {
 *   await this.triggerService.processChatMessage(gameId, chatData);
 * }
 */

/**
 * 환경 변수 설정
 *
 * .env 파일에 추가:
 * OPENAI_API_KEY=your_api_key_here
 *
 * 또는 Claude API 사용 시:
 * ANTHROPIC_API_KEY=your_api_key_here
 */

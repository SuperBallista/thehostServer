import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { RedisPubSubService } from '../../redis/redisPubSub.service';
import { ChatMessage } from '../payload.types';
import { PlayerManagerService } from './player-manager.service';
import { userDataResponse } from '../payload.types';

@Injectable()
export class ChatService {
  constructor(
    private readonly playerManagerService: PlayerManagerService,
    private readonly redisPubSubService: RedisPubSubService,
  ) {}

  /**
   * 채팅 메시지 처리
   */
  async handleChatMessage(userId: number, chatMessage: ChatMessage): Promise<userDataResponse> {
    // 현재 위치 상태 확인
    const locationState = await this.playerManagerService.getPlayerLocationState(userId);
    if (!locationState || locationState.state !== 'game' || !locationState.roomId) {
      throw new WsException('게임 중이 아닙니다');
    }

    const gameId = locationState.roomId;
    
    // 플레이어 데이터 가져오기
    const playerData = await this.playerManagerService.getPlayerDataByUserId(gameId, userId);
    if (!playerData) {
      throw new WsException('플레이어 데이터를 찾을 수 없습니다');
    }

    // Redis Pub/Sub을 통해 같은 지역의 플레이어들에게 메시지 전달
    await this.broadcastToRegion(
      gameId,
      playerData.playerId,
      chatMessage.message,
      playerData.regionId
    );

    console.log(`채팅 메시지 발행: gameId=${gameId}, playerId=${playerData.playerId}, region=${playerData.regionId}`);

    // 빈 응답 반환 (메시지는 Pub/Sub을 통해 전달됨)
    return {};
  }

  /**
   * 특정 지역으로 메시지 브로드캐스트
   */
  async broadcastToRegion(
    gameId: string, 
    playerId: number, 
    message: string, 
    regionId: number,
    system: boolean = false
  ): Promise<void> {
    await this.redisPubSubService.publishChatMessage(
      gameId,
      playerId,
      message,
      regionId,
      system
    );
  }

  /**
   * 시스템 메시지 전송
   */
  async sendSystemMessage(
    gameId: string, 
    message: string, 
    regionId: number
  ): Promise<void> {
    // 시스템 메시지는 playerId를 -1로 설정하고 system 플래그를 true로
    await this.broadcastToRegion(gameId, -1, message, regionId, true);
  }

  /**
   * 전체 방송 (마이크 아이템 사용 시)
   */
  async broadcastToAllRegions(
    gameId: string, 
    playerId: number, 
    message: string
  ): Promise<void> {
    // 모든 지역(0-5)에 메시지 전송
    const MAX_REGIONS = 6;
    const broadcasts: Promise<void>[] = [];
    
    for (let regionId = 0; regionId < MAX_REGIONS; regionId++) {
      broadcasts.push(
        this.broadcastToRegion(gameId, playerId, message, regionId, false)
      );
    }
    
    await Promise.all(broadcasts);
  }

  /**
   * 통합된 마이크 방송 기능
   * 봇과 플레이어 모두 동일한 형식으로 방송 메시지를 전송
   * @param gameId 게임 ID
   * @param playerId 플레이어 ID
   * @param playerNickname 플레이어 닉네임
   * @param content 방송 내용
   */
  async sendMicrophoneBroadcast(
    gameId: string,
    playerId: number,
    playerNickname: string,
    content: string
  ): Promise<void> {
    // 통일된 형식: [방송] 닉네임: 메시지
    const broadcastMessage = `[방송] ${playerNickname}: ${content}`;
    await this.broadcastToAllRegions(gameId, playerId, broadcastMessage);
  }
}
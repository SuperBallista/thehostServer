// connection.service.ts
import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { JwtService } from '../jwt/jwt.service';
import { Socket } from 'socket.io';
import { Room, State, userDataResponse } from './payload.types';

import { UserService } from 'src/user/user.service';
import { WsException } from '@nestjs/websockets';
import { moveToLobby, moveToRoom } from './utils/socketRoomManager';
import { LocationState } from './data.types';
import { GameDto, GameInRedis } from './game/game.types';

@Injectable()
export class ConnectionService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly userService: UserService,
  ) {}

  async verifyAndTrackConnection(client: Socket): Promise<userDataResponse> {
    const token = client.handshake.auth?.token;
    if (!token) throw new WsException('Missing token');

    const payload = await this.jwtService.parseAccessToken(token);
    client.data.id = payload.userId; // ✅ 일관성을 위한 추가
    client.data.nickname = payload.nickname;

    await this.redisService.stringifyAndSet(`online:${payload.userId}`, {
      id: client.id,
    });

    const parsed: LocationState = await this.redisService.getAndParse(
      `locationState:${payload.userId}`,
    );
    let loadedState: State = 'lobby';
    let roomId: string = '';
    let roomData: Room | undefined;
    let gameResultData: userDataResponse | undefined;

    if (parsed) {
      loadedState = parsed.state || 'lobby';
      roomId = parsed.roomId || '';

      if ((loadedState === 'room' || loadedState === 'game') && roomId) {
        // ✅ 게임 중인 경우와 대기실인 경우 구분
        roomData = await this.redisService.getAndParse(`room:data:${roomId}`);
        const gameData: GameInRedis = await this.redisService.getAndParse(
          `game:${roomId}`,
        );
        // 게임 관련 자료 모두 로드

        if (gameData && loadedState === 'game') {
          // 게임 중인 경우
          client.data.currentRoom = roomData?.id;
          moveToRoom(client, roomId);

          gameResultData = { gameTurn: gameData.turn };
        } else if (roomData && loadedState === 'room') {
          // 대기실인 경우
          client.data.currentRoom = roomData.id;
          moveToRoom(client, roomData.id);
        } else {
          // 방이나 게임이 없으면 로비로
          loadedState = 'lobby';
          roomId = '';
          await this.redisService.stringifyAndSet(
            `locationState:${payload.userId}`,
            { state: 'lobby' },
          );
          moveToLobby(client);
        }
      } else {
        moveToLobby(client);
      }
    } else {
      await this.redisService.stringifyAndSet(
        `locationState:${payload.userId}`,
        { state: 'lobby' },
      );
      moveToLobby(client);
    }

    const response: userDataResponse = {
      user: { id: payload.userId, nickname: payload.nickname },
      locationState: loadedState,
      roomData,
    };

    return response;
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (!userId) return;

    // 유예 시간 5초 후 처리
    setTimeout(async () => {
      const isReconnected = await this.checkUserStillConnected(userId);
      if (!isReconnected) {
        // 여기서 진짜 유저 퇴장 처리
        await this.redisService.del(`online:${userId}`);
        console.log(`❌ 유저 ${userId} 완전 퇴장 처리`);
      } else {
        console.log(`✅ 유저 ${userId} 재접속 감지 → 퇴장 취소`);
      }
    }, 5000); // 5초 유예
  }

  async checkUserStillConnected(userId: number): Promise<boolean> {
    const socketData = await this.redisService.getAndParse(`online:${userId}`);
    return !!socketData?.id;
  }

  async getLocationData(userId: number) {
    const lobby = {
      state: 'lobby' as State,
      roomInfo: undefined,
      roomId: undefined,
    };
    const raw: LocationState = await this.redisService.getAndParse(
      `locationState:${userId}`,
    );

    console.log(`[getLocationData] userId: ${userId}, raw locationState:`, raw);

    if (!raw || !raw.roomId) return lobby;

    let roomInfo: Room | undefined;

    // 게임 상태인 경우 방 데이터 확인을 스킵
    if (raw.state === 'game') {
      console.log(
        `[getLocationData] 게임 상태 감지 - state: ${raw.state}, roomId: ${raw.roomId}`,
      );
      return { state: raw.state, roomInfo, roomId: raw.roomId };
    }

    if (raw.state !== 'lobby' && raw.roomId) {
      roomInfo = await this.redisService.getAndParse(`room:data:${raw.roomId}`);
      if (!roomInfo) {
        // 방이 없으면 위치를 로비로 초기화
        console.log(`[getLocationData] 방 데이터 없음 - 로비로 초기화`);
        await this.redisService.stringifyAndSet(`locationState:${userId}`, {
          state: 'lobby',
        });
        return lobby;
      }
    }

    return { state: raw.state, roomInfo, roomId: raw.roomId };
  }
}

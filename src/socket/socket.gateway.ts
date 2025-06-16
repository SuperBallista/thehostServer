// lobby.gateway.ts
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import { LobbyService } from './lobby.service';
import { Server, Socket } from 'socket.io';
import { ConnectionService } from './connection.service';
import { RedisPubSubService } from 'src/redis/redisPubSub.service';
import { Room, userDataResponse, userRequest } from './payload.types';
import { GameService } from './game/game.service';




@WebSocketGateway({ cors: true })
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly connectionService: ConnectionService,
    private readonly lobbyService: LobbyService,
    private readonly redisPubSubService: RedisPubSubService,
    private readonly gameService: GameService
  ) {}




afterInit(server: Server) {
  this.redisPubSubService.io = server;

  this.redisPubSubService.registerRoomListUpdateCallback(async () => {
    const roomList = await this.lobbyService.getRooms();
    this.server.to('lobby').emit('update', roomList);
  });

  // ✅ 게임 시작 pub/sub 처리 추가
  this.redisPubSubService.registerGameStartCallback(async (roomData: Room) => {
    console.log(`📢 게임 시작 알림: ${roomData.id}`)
    // 해당 방의 모든 클라이언트에게 게임 시작 알림
    this.server.to(`room:${roomData.id}`).emit('internal:game:start', roomData);
  });
}

  
  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      const result = await this.connectionService.verifyAndTrackConnection(client);
      
      // 초기 연결 시 상태 전송
      client.emit('update', result);
    } catch (err) {
      console.warn('연결 오류:', err);
      client.disconnect();
    }
  }
    
  async handleDisconnect(@ConnectedSocket() client: Socket) {
    await this.connectionService.handleDisconnect(client);
    console.log(`❌ 유저 ${client.data?.userId} 접속 해제`);
  }

@SubscribeMessage('request')
  async handleRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: userRequest,
  ) {
    let response: userDataResponse = {}

    try {
      if (data.createRoom) {
        response = await this.lobbyService.createRoom(client, data.createRoom)
      }
      
      if (data.joinRoom) {
        response = await this.lobbyService.joinRoom(client, data.joinRoom)
      }
      
      if (data.exitRoom) {
        response = await this.lobbyService.exitToLobby(client)
      }

      if (data.room) {
        response = await this.lobbyService.changeRoomOption(data.room)
      }
      
      if (data.page) {
        const roomList = await this.lobbyService.getRooms(data.page)
        response = roomList
      }
      
      if (data.gameStart) {
        response = await this.gameService.gameStart(client.data.userId)
      }

      // ✅ 응답 전송
      client.emit('update', response);
      
    } catch (error) {
      console.error('Request 처리 중 오류:', error);
      client.emit('update', {
        alarm: { 
          message: error.message || '요청 처리 중 오류가 발생했습니다', 
          img: 'error' 
        }
      });
    }
  }


  @SubscribeMessage('internal:game:start')
  async handleSubscribeGameStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() roomData: Room
  ) {
    await this.gameService.subscribeGameStart(client, client.data.userId, roomData.players, roomData.id)
  }

}
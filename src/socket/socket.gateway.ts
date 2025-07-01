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

  // ✅ 게임 시작 pub/sub 처리 - 서버에서 바로 처리
  this.redisPubSubService.registerGameStartCallback(async (roomData: Room) => {
    // console.log(`📢 게임 시작 알림: ${roomData.id} - 서버에서 직접 처리`)
    
    // 각 플레이어에게 직접 subscribeGameStart 호출
    for (const player of roomData.players) {
      const clientSocket = this.getUserSocket(player.id);
      if (clientSocket) {
        await this.gameService.subscribeGameStart(
          clientSocket, 
          player.id, 
          roomData.players, 
          roomData.id
        );
      } else {
        // console.warn(`⚠️ 플레이어 ${player.id}의 소켓을 찾을 수 없음`);
      }
    }
  });
}

  
  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      const result = await this.connectionService.verifyAndTrackConnection(client);
      
      // 초기 연결 시 상태 전송
      client.emit('update', result);
    } catch (err) {
      // console.warn('연결 오류:', err);
      client.disconnect();
    }
  }
    
  async handleDisconnect(@ConnectedSocket() client: Socket) {
    await this.connectionService.handleDisconnect(client);
    // console.log(`❌ 유저 ${client.data?.userId} 접속 해제`);
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
      
      if (data.gameStart && data.user.id) {
        response = await this.gameService.gameStart(data.user.id)
      }

      // 호스트 액션 처리
      if (data.hostAct && data.user.id) {
        response = await this.gameService.handleHostAction(data.user.id, data.hostAct)
      }

      // 플레이어 상태 업데이트 (이동 장소 설정 포함)
      if (data.myStatus && data.user.id) {
        response = await this.gameService.updatePlayerStatus(data.user.id, data.myStatus)
      }

      // 채팅 메시지 처리
      if (data.chatMessage && data.user.id) {
        response = await this.gameService.handleChatMessage(data.user.id, data.chatMessage)
      }

      // 아이템 전달 처리
      if (data.giveItem && data.user.id && data.roomId) {
        console.log('아이템 전달 요청:', { userId: data.user.id, giveItem: data.giveItem, roomId: data.roomId });
        response = await this.gameService.handleGiveItem(data.user.id, data.giveItem, data.roomId)
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


  /**
   * 유저 ID로 연결된 소켓 찾기
   */
  private getUserSocket(userId: number): Socket | null {
    for (const [socketId, socket] of this.server.sockets.sockets) {
      if (socket.data?.id === userId) {
        return socket;
      }
    }
    return null;
  }

}
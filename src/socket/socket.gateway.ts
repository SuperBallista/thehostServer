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


  onModuleInit() {
    this.redisPubSubService.registerRoomListUpdateCallback(async () => {
      const roomList = await this.lobbyService.getRooms();
      this.redisPubSubService.io?.to('lobby').emit('update', roomList);
      console.log('📢 update:room:list → 로비 전체에 emit');
    });
  }

// lobby.gateway.ts
afterInit(server: Server) {
  this.redisPubSubService.io = server;

  this.redisPubSubService.registerRoomListUpdateCallback(async () => {
    const roomList = await this.lobbyService.getRooms();
    this.server.to('lobby').emit('update', roomList);
  });
}

  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
    const { userId, state, roomId } =  await this.connectionService.verifyAndTrackConnection(client); // 저장만
      console.log(`✅ 유저 ${client.data.userId} 연결됨`);

        // 클라이언트에 위치 상태 전송
  client.emit('update', {
    state,
    roomId,
  });

    console.log(`유저 ${userId} 접속됨 (${state}:${roomId})`)


    } catch (err) {
      console.warn(err);
      client.disconnect();
    }
  }

  
  @SubscribeMessage('connect')
async handleRestoreRequest(@ConnectedSocket() client: Socket) {
  const userId = client.data.userId;
  if (!userId) {
    client.emit('update', { state: 'lobby', roomInfo: null });
    return;
  }

  const result = await this.connectionService.getLocationData(userId);
  client.emit('update:location:restore', { state: result.state, roomInfo: result.roomInfo?? null, roomId: result.roomId?? null });
}
    
  async handleDisconnect(@ConnectedSocket() client: Socket) {
    await this.connectionService.handleDisconnect(client);
    console.log(`❌ 유저 ${client.data?.userId} 접속 해제`);
  }

@SubscribeMessage('request')
async handleCreateRoom(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: userRequest,
) {

  let response:userDataResponse = {}

  if (data.createRoom) response = await this.lobbyService.createRoom(client, data.createRoom)
  if (data.joinRoom) response = await this.lobbyService.joinRoom(client , data.joinRoom)
  if (data.exitRoom) response = await this.lobbyService.exitToLobby(client)
  if (data.page) await this.lobbyService.getRooms(data.page)
  if (data.gameStart) await this.gameService.gameStart(client.data.id)


  // ✅ 생성 결과 전송
  client.emit('update', response);
}


@SubscribeMessage('internal:game:start')
async handleSubscribeGameStart(
  @ConnectedSocket() client: Socket,
  @MessageBody() roomData:Room
){
  await this.gameService.subscribeGameStart(client, client.data.id, roomData.players, roomData.id)
}

}
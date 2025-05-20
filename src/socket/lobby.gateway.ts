// lobby.gateway.ts
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { LobbyService } from './lobby.service';
import { Server, Socket } from 'socket.io';
import { ConnectionService } from './connection.service';
import { RedisPubSubService } from 'src/redis/redisPubSub.service';
import { moveToLobby, moveToRoom } from './utils/socketRoomManager';




@WebSocketGateway({ cors: true })
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly connectionService: ConnectionService,
    private readonly lobbyService: LobbyService,
    private readonly redisPubSubService: RedisPubSubService,
  ) {}

// lobby.gateway.ts
afterInit(server: Server) {
  this.redisPubSubService.io = server;

  this.redisPubSubService.registerRoomListUpdateCallback(async () => {
    const roomList = await this.lobbyService.getRooms();
    this.server.to('lobby').emit('update:room:list');
  });
}

  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
    const { userId, locationState, roomId } =  await this.connectionService.verifyAndTrackConnection(client); // 저장만
      console.log(`✅ 유저 ${client.data.userId} 연결됨`);

        // 클라이언트에 위치 상태 전송
  client.emit('update:location', {
    locationState,
    roomId,
  });

    console.log(`유저 ${userId} 접속됨 (${locationState}:${roomId})`)


    } catch (err) {
      console.warn(err);
      client.disconnect();
    }
  }
  
  @SubscribeMessage('request:location:restore')
async handleRestoreRequest(@ConnectedSocket() client: Socket) {
  const userId = client.data.userId;
  if (!userId) {
    client.emit('update:location:restore', { state: 'lobby', roomInfo: null });
    return;
  }

  const { locationState, roomInfo, roomId } = await this.connectionService.getLocationData(userId);
  client.emit('update:location:restore', { state:locationState, roomInfo: roomInfo, roomId });
}


    
  async handleDisconnect(@ConnectedSocket() client: Socket) {
    await this.connectionService.handleDisconnect(client);
    console.log(`❌ 유저 ${client.data?.userId} 접속 해제`);
  }

@SubscribeMessage('request:room:create')
async handleCreateRoom(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { name: string },
) {
  const hostUser = {
    nickname: client.data.nickname,
    id: client.data.userId,
  };
  const { name } = data;

  if (!hostUser.id || !name) {
    client.emit('update:error', { message: '잘못된 요청입니다.' });
    return;
  }

  const room = await this.lobbyService.createRoom(hostUser.id, name, hostUser);

  moveToRoom(client, room.id)

  // ✅ 생성 결과 전송
  client.emit('update:room:create', room);
  this.server.to('lobby').emit('update:room:list');
}

  @SubscribeMessage('request:room:list')
  async handleGetRoomList(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { page?: number }
  ) {
    const page = data?.page ?? 1;
    const roomList = await this.lobbyService.getRooms(page);
    return roomList
  }


  @SubscribeMessage('request:location:update')
async handleLocationUpdate(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { state: 'lobby' | 'room' | 'game', roomId?: string }
) {
  const userId = client.data?.userId;
  if (!userId || !data?.state) {
    throw new WsException('유저 정보가 없습니다')
  }

  const locationData = {
    state: data.state,
    roomId: data.roomId || '',
  };

  await this.connectionService.setLocation(userId, locationData);

  client.emit(`update:location`, locationData);
}

@SubscribeMessage('request:room:join')
async handleJoinRoom(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { roomId: string }
) {
  const room = await this.lobbyService.joinRoom(data.roomId, client.data?.userId);

  moveToRoom(client, room.id)
  this.server.to('lobby').emit('update:room:list');
  this.server.to(`room:${room.id}`).emit('update:room:data')
  return room; // 응답도 동시에 보내려면 유지
}

@SubscribeMessage('request:room:exit')
async handleExitToLobby(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { roomId: string }
) {
  const result = await this.lobbyService.exitToLobby(data.roomId, client.data?.userId);

  moveToLobby(client)
  return result;
}
  }

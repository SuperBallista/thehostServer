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

@WebSocketGateway({ cors: true })
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly connectionService: ConnectionService,
    private readonly lobbyService: LobbyService,
  ) {}

  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
    const { userId, locationState, roomId } =  await this.connectionService.verifyAndTrackConnection(client); // 저장만
      console.log(`✅ 유저 ${client.data.userId} 연결됨`);

        // 클라이언트에 위치 상태 전송
  client.emit('locationState', {
    locationState,
    roomId,
  });

    console.log(`유저 ${userId} 접속됨 (${locationState}:${roomId})`)


    } catch (err) {
      console.warn(err);
      client.disconnect();
    }
  }
  
  @SubscribeMessage('location:restore')
async handleRestoreRequest(@ConnectedSocket() client: Socket) {
  const userId = client.data.userId;
  if (!userId) {
    client.emit('location:restore', { state: 'lobby', roomInfo: null });
    return;
  }

  const { locationState, roomInfo, roomId } = await this.connectionService.getLocationData(userId);
  client.emit('location:restore', { state:locationState, roomInfo: roomInfo, roomId });
}


    
  async handleDisconnect(@ConnectedSocket() client: Socket) {
    await this.connectionService.handleDisconnect(client);
    console.log(`❌ 유저 ${client.data?.userId} 접속 해제`);
  }

  @SubscribeMessage('createRoom')
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
      client.emit('error', { message: '잘못된 요청입니다.' });
      return;
    }
  
    const room = await this.lobbyService.createRoom(hostUser.id, name, hostUser); // ✅ await 추가
  
    client.emit('roomCreated', room);
  
    const roomList = await this.lobbyService.getRooms(); // 이 함수도 async면 await 필요
    this.server.to('lobby').emit('roomListUpdated', roomList);
  }

  @SubscribeMessage('lobby:getRoomList')
  async handleGetRoomList(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { page?: number }
  ) {
    const page = data?.page ?? 1;
    const roomList = await this.lobbyService.getRooms(page);
    client.emit('lobby:roomList', roomList);
  }


  @SubscribeMessage('location:update')
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

  client.emit('location:updated', locationData);
}

  @SubscribeMessage('lobby:joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
     @MessageBody() data: {roomId: string }
  ){
   
   const roomData = await this.lobbyService.joinRoom(data.roomId)
  if (roomData) {
    // 유저 추가 및 상태 설정
    client.join(data.roomId);
    return roomData;
  } else {
    return null;
  }
  }
  }

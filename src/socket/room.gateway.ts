// src/gateway/game.gateway.ts
import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/' })
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
  handleConnection(socket: Socket) {
    console.log(`📡 연결됨: ${socket.id}`);
  }

  handleDisconnect(socket: Socket) {
    console.log(`❌ 연결 해제됨: ${socket.id}`);
  }

  @SubscribeMessage('room:join')
  handleRoomJoin(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId } = data;
    client.join(roomId);
    console.log(`✅ ${client.id} → ${roomId} 방 참가`);
  }

  @SubscribeMessage('room:leave')
handleRoomLeave(
  @MessageBody() data: { roomId: string },
  @ConnectedSocket() client: Socket,
) {
  const { roomId } = data;  
  client.leave(roomId);
  console.log(`🚪 ${client.id} → ${roomId} 방 나감`);
}

}

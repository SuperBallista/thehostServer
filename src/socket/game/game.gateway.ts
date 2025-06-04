


// game.gateway.ts
import {
    ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { Room } from '../lobby.types';




@WebSocketGateway({ cors: true })
export class GameGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly gameService: GameService,
  ) {}
    
@SubscribeMessage('request:room:start')
async handleGameStart(
    @ConnectedSocket() client: Socket
)
  {
    await this.gameService.gameStart(client.data.userId)

}

@SubscribeMessage('internal:game:start')
async handleSubscribeGameStart(
  @ConnectedSocket() client: Socket,
  @MessageBody() room:Room
){
  await this.gameService.subscribeGameStart(client.data.id, room.players, room.id)

}
}

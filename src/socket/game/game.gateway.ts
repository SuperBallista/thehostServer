


// game.gateway.ts
import {
    ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RedisPubSubService } from 'src/redis/redisPubSub.service';
import { GameService } from './game.service';
import { RedisService } from 'src/redis/redis.service';




@WebSocketGateway({ cors: true })
export class GameGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly gameService: GameService,
    private readonly redisPubSubService: RedisPubSubService,
    private readonly redisService: RedisService
  ) {}
    
@SubscribeMessage('request:room:start')
async handleGameStart(
    @ConnectedSocket() client: Socket
)
  {
    await this.gameService.gameStart(client.data.userId)

}
}

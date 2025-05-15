import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";


@Injectable()
export class RedisPubSubService {
  public publisher: Redis;
  public subscriber: Redis;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('redisHost');
    const port = this.configService.get<number>('redisPort', 6379);

    this.publisher = new Redis({ host, port });
    this.subscriber = new Redis({ host, port });
  }
}

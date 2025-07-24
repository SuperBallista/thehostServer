// common/utils/json.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class JsonService {
  // JSON 디코딩
  decodeJSON<T>(data: string): T {
    return JSON.parse(data) as T;
  }
}

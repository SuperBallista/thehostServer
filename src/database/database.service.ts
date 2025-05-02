// 예시: auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.provider';

@Injectable()
export class AuthService {
  constructor(private readonly dbService: DatabaseService) {}

  async findUserById(id: number): Promise<any> {
    const sql = 'SELECT * FROM users WHERE id = ?';
    const results = await this.dbService.query(sql, [id]);
    return results[0];
  }
}
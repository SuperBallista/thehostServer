// user/user-init.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { DatabaseProvider } from 'src/database/database.provider';

@Injectable()
export class UserInitService implements OnModuleInit {
  constructor(private readonly databaseProvider: DatabaseProvider) {}

  async onModuleInit() {
    try {
      const connection = this.databaseProvider.getConnection();

      // users 테이블 존재 여부 확인 (information_schema 사용)
      const result = await connection.query(
        `SELECT COUNT(*) as count FROM information_schema.tables 
         WHERE table_schema = DATABASE() AND table_name = 'users'`,
      );

      const tableExists = result[0][0].count > 0;

      if (!tableExists) {
        Logger.log('[UserInit] users 테이블이 없어 생성 중...');
        const schemaSql = await readFile(
          join(__dirname, '..', 'database', 'schema', 'users.sql'),
          'utf8',
        );
        await connection.query(schemaSql);
        Logger.log('[UserInit] users 테이블 생성 완료');
      } else {
        Logger.log('[UserInit] users 테이블 이미 존재');
      }
    } catch (err) {
      Logger.error(`[UserInit] 테이블 생성 중 오류: ${err.message}`);
    }
  }
}

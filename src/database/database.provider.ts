// database/database.provider.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mysql from 'mysql2/promise';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private connection: mysql.Connection;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      const host = this.configService.get<string>('DB_HOST');
      const port = this.configService.get<number>('DB_PORT');
      const username = this.configService.get<string>('DB_USERNAME');
      const password = this.configService.get<string>('DB_PASSWORD');
      const database = this.configService.get<string>('DB_DATABASE');
      
      if (!host || !username || !password || !database) {
        throw new Error('Database configuration is incomplete');
      }
      
      console.log(`>>> Connecting to MySQL at ${host}:${port}`);
      
      this.connection = await mysql.createConnection({
        host,
        port,
        user: username,
        password,
        database,
      });
      
      // 연결 테스트
      await this.connection.query('SELECT 1');
      console.log('✅ MySQL connected successfully');
    } catch (error) {
      console.error('Database connection error:', error);
      process.exit(1);
    }
  }

  async onModuleDestroy() {
    if (this.connection) {
      await this.connection.end();
      console.log('Database connection closed');
    }
  }

  getConnection(): mysql.Connection {
    return this.connection;
  }

  async query(sql: string, params?: any[]): Promise<any> {
    const [rows] = await this.connection.query(sql, params);
    return rows;
  }
}
// user/user.service.ts
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.provider';
import { RedisService } from '../redis/redis.service';
import { UserCacheService } from './user-cache.service';
import { UserDto } from './dto/user.dto';

export interface IUserService {
  findOrCreateUser(
    oauthId: string, 
    provider: string, 
    name: string, 
    email: string, 
    picture: string
  ): Promise<{ user: UserDto; isNew: boolean }>;
}

@Injectable()
export class UserService implements IUserService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly userCacheService: UserCacheService,
  ) {}

  async findOrCreateUser(
    oauthId: string, 
    provider: string, 
    nicknameHash: string = '', 
    encryptedNickname: string = '', 
    iv: string = ''
  ): Promise<{ user: UserDto; isNew: boolean }> {
    // 사용자 조회 쿼리
    const query = `
      SELECT id, nickname_hash, encrypted_nickname, iv_nickname, last_connected_at 
      FROM users 
      WHERE oauth_provider = ? AND oauth_id = ?
    `;
    
    try {
      const result = await this.databaseService.query(query, [provider, oauthId]);
      
      // 사용자가 없는 경우 생성
      if (!result || result.length === 0) {
        const now = new Date();
        
        const insertResult = await this.databaseService.query(
          `INSERT INTO users (oauth_provider, oauth_id, nickname_hash, encrypted_nickname, iv_nickname, created_at, last_connected_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [provider, oauthId, nicknameHash, encryptedNickname, iv, now, now]
        );
        
        const userId = insertResult.insertId;
        
        const newUser: UserDto = {
          id: userId.toString(),
          oAuthProvider: provider,
          oAuthId: oauthId,
          nicknameHash: nicknameHash,
          encryptedNickname: encryptedNickname,
          ivNickname: iv,
          lastConnectedAt: now,
        };
        
        // 사용자 생성 후 캐시에 저장
        await this.userCacheService.setUser(userId, newUser);
        
        return { user: newUser, isNew: true };
      }
      
      // 기존 사용자 반환
      const user = result[0];
      const userId = parseInt(user.id);
      
      const userDto: UserDto = {
        id: user.id.toString(),
        oAuthProvider: provider,
        oAuthId: oauthId,
        nicknameHash: user.nickname_hash,
        encryptedNickname: user.encrypted_nickname,
        ivNickname: user.iv_nickname,
        lastConnectedAt: user.last_connected_at,
      };
      
      // 캐시에 저장
      await this.userCacheService.setUser(userId, userDto);
      
      return { user: userDto, isNew: false };
    } catch (error) {
      throw new Error(`Failed to find or create user: ${error.message}`);
    }
  }

  async findById(userId: number): Promise<UserDto> {
    // 1. 먼저 Redis 캐시에서 사용자 조회
    const cachedUser = await this.userCacheService.getUser(userId);
    if (cachedUser) {
      return cachedUser;
    }

    // 2. 캐시에 없으면 데이터베이스에서 조회
    const query = `
      SELECT 
        id, 
        oauth_provider, 
        oauth_id, 
        nickname_hash, 
        encrypted_nickname, 
        iv_nickname, 
        last_connected_at 
      FROM users 
      WHERE id = ?
    `;
    
    const result = await this.databaseService.query(query, [userId]);
    
    if (!result || result.length === 0) {
      throw new HttpException('해당 계정을 찾을 수 없습니다', HttpStatus.NOT_FOUND);
    }
    
    const user = result[0];
    
    // UserDto 객체로 변환
    const userDto: UserDto = {
      id: user.id.toString(),
      oAuthProvider: user.oauth_provider,
      oAuthId: user.oauth_id,
      nicknameHash: user.nickname_hash,
      encryptedNickname: user.encrypted_nickname,
      ivNickname: user.iv_nickname,
      lastConnectedAt: user.last_connected_at,
    };
    
    // 조회 결과를 캐시에 저장
    await this.userCacheService.setUser(userId, userDto);
    
    return userDto;
  }
}

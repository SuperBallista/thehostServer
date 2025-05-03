import { Injectable } from '@nestjs/common';
import { DatabaseProvider } from 'src/database/database.provider';
import { UserDto, CreateUserInput } from './dto/user.dto';

@Injectable()
export class UserRepository {
  constructor(private readonly db: DatabaseProvider) {}

  async findByOAuthId(provider: string, oauthId: string): Promise<UserDto | null> {
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
      WHERE oauth_provider = ? AND oauth_id = ?
    `;
    const result = await this.db.query(query, [provider, oauthId]);

    if (!result || result.length === 0) return null;

    const user = result[0];
    return {
      id: user.id.toString(),
      oAuthProvider: user.oauth_provider,
      oAuthId: user.oauth_id,
      nicknameHash: user.nickname_hash,
      encryptedNickname: user.encrypted_nickname,
      ivNickname: user.iv_nickname,
      lastConnectedAt: user.last_connected_at,
    };
  }

  async findById(userId: number): Promise<UserDto | null> {
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
    const result = await this.db.query(query, [userId]);

    if (!result || result.length === 0) return null;

    const user = result[0];
    return {
      id: user.id.toString(),
      oAuthProvider: user.oauth_provider,
      oAuthId: user.oauth_id,
      nicknameHash: user.nickname_hash,
      encryptedNickname: user.encrypted_nickname,
      ivNickname: user.iv_nickname,
      lastConnectedAt: user.last_connected_at,
    };
  }

  async insertUser({
    provider,
    oauthId,
    nicknameHash,
    encryptedNickname,
    iv,
  }: CreateUserInput): Promise<number> {
    const now = new Date();
    const result = await this.db.query(
      `INSERT INTO users (
        oauth_provider, 
        oauth_id, 
        nickname_hash, 
        encrypted_nickname, 
        iv_nickname, 
        created_at, 
        last_connected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [provider, oauthId, nicknameHash, encryptedNickname, iv, now, now],
    );
    return result.insertId;
  }
}

// common/utils/encryption.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  constructor(private readonly configService: ConfigService) {}

  // SHA-256 해시 생성
  hashString(s: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(s);
    return hash.digest('hex');
  }

  // 닉네임 암호화
  encryptNickname(nickname: string): { encrypted: string; iv: string } {
    const rawKey = Buffer.from(this.configService.get<string>('AES_SECRET_KEY') as string, 'base64');
    
    if (rawKey.length !== 32) {
      throw new Error(`AES 키 길이가 32바이트가 아닙니다. 현재: ${rawKey.length}`);
    }

    // 암호화를 위한 초기화 벡터 생성
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv('aes-256-cbc', rawKey, iv);
    
    // PKCS7 패딩이 Node.js에서는 자동으로 적용됨
    let encrypted = cipher.update(nickname, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    return {
      encrypted,
      iv: iv.toString('base64'),
    };
  }

  // 닉네임 복호화
  decryptNickname(encryptedBase64: string, ivBase64: string): string {
    try {
      const rawKey = Buffer.from(this.configService.get<string>('AES_SECRET_KEY') as string, 'base64');
      const iv = Buffer.from(ivBase64, 'base64');
      const encrypted = Buffer.from(encryptedBase64, 'base64');
      
      const decipher = crypto.createDecipheriv('aes-256-cbc', rawKey, iv);
      
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error(`복호화 실패: ${error.message}`);
    }
  }
}
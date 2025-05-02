// auth/auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from 'src/jwt/jwt.service';
import { Request } from 'express';
import axios from 'axios';
import { RedisService } from '../redis/redis.service';
import { UserService } from '../user/user.service';
import * as crypto from 'crypto';

interface GoogleUserInfo {
  id: string;
  name: string;
  email: string;
}

interface AuthResult {
  userId: number;
  nickname: string;
  accessToken: string;
  refreshToken: string;
  isNew: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  getGoogleAuthUrl(): string {
    const googleOAuthConfig = {
      clientID: this.configService.get<string>('googleClientId') as string,
      clientSecret: this.configService.get<string>('googleClientSecret') as string,
      redirectUri: this.configService.get<string>('googleRedirectUrl') as string, // 여기 수정
      scope: ['profile', 'email'],
    };

    const params = new URLSearchParams({
      client_id: googleOAuthConfig.clientID,
      redirect_uri: googleOAuthConfig.redirectUri,
      scope: googleOAuthConfig.scope.join(' '),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/auth?${params.toString()}`;
  }

  async handleGoogleCallback(code: string, expireDays: number): Promise<AuthResult> {
    const googleOAuthConfig = {
      clientID: this.configService.get<string>('googleClientId'),
      clientSecret: this.configService.get<string>('googleClientSecret'),
      redirectUri: this.configService.get<string>('googleRedirectUrl'), // 여기도 수정
    };

    try {
      // 토큰 교환 요청
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: googleOAuthConfig.clientID,
        client_secret: googleOAuthConfig.clientSecret,
        redirect_uri: googleOAuthConfig.redirectUri,
        grant_type: 'authorization_code',
      });

      const accessToken = tokenResponse.data.access_token;

      // 사용자 정보 요청
      const userInfoResponse = await axios.get<GoogleUserInfo>(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const userInfo = userInfoResponse.data;

      // 사용자 찾기 또는 생성
      const { user, isNew } = await this.userService.findOrCreateUser(
        userInfo.id,
        'google',
        '',
        '',
        ''
      );

      // JWT 토큰 생성
      const jwtAccessToken = await this.jwtService.generateAccessToken(user.id, '');
      const jwtRefreshToken = await this.jwtService.generateRefreshToken(user.id, '');

      return {
        userId: user.id,
        nickname: '', // 아직 설정 안 됨
        accessToken: jwtAccessToken,
        refreshToken: jwtRefreshToken,
        isNew: isNew,
      };
    } catch (error) {
      throw new BadRequestException(`OAuth authentication failed: ${error.message}`);
    }
  }

  async handleRefreshToken(req: Request): Promise<{ token: string; user: any }> {
    const refreshToken = req.cookies['refresh_token'];
    
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    try {
      const claims = await this.jwtService.parseRefreshToken(refreshToken);

      const token = await this.jwtService.generateAccessToken(claims.userId, claims.nickname);
      
      return {
        token,
        user: {
          id: claims.userId,
          nickname: claims.nickname,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async handleGetMe(req: Request): Promise<any> {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      throw new UnauthorizedException('Invalid token format');
    }

    const token = tokenParts[1];

    try {
      console.log('토큰 검증 시도:', token.substring(0, 10) + '...');
      const claims = await this.jwtService.parseAccessToken(token);
      console.log('토큰 검증 성공, claims:', JSON.stringify(claims));
  
      let nickname = claims.nickname;
      if (!nickname) {
        console.log(`닉네임이 없거나 빈 문자열입니다. userId: ${claims.userId}로 복호화 시도`);
        try {
          nickname = await this.getDecryptedNickname(claims.userId);
          console.log('닉네임 복호화 성공:', nickname);
        } catch (nicknameError) {
          console.error('닉네임 복호화 실패:', nicknameError);
          throw nicknameError; // 원래 오류를 다시 throw
        }
      }
  
      return {
        id: claims.userId,
        nickname,
      };
    } catch (error) {
      console.error('handleGetMe 처리 중 오류:', error);
      throw new UnauthorizedException(`Authentication failed: ${error.message}`);
    }
  }
  
  private async getDecryptedNickname(userId: number): Promise<string> {

    const user = await this.userService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    
    return this.decryptNickname(user.encryptedNickname, user.ivNickname);
  }

  private decryptNickname(encrypted: string, iv: string): string {
    const key = Buffer.from(this.configService.get<string>('aesSecretKey') as string, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, ivBuffer);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }


}
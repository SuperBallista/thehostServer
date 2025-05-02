// auth/jwt/jwt.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface AuthClaims {
  userId: number;
  nickname: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtService {
  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {
    console.log('JWT_ACCESS_SECRET 존재 여부:', !!this.configService.get<string>('JWT_ACCESS_SECRET'));
    console.log('ACCESS_EXPIRE_MINUTES 존재 여부:', !!this.configService.get<number>('ACCESS_EXPIRE_MINUTES'));  
  }

  async generateAccessToken(userId: number, nickname: string): Promise<string> {
    const accessExpireMinutes = this.configService.get<number>('ACCESS_EXPIRE_MINUTES');
    
    const payload: AuthClaims = {
      userId,
      nickname,
    };
    
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: `${accessExpireMinutes}m`,
    });
  }

  async generateRefreshToken(userId: number, nickname: string): Promise<string> {
    const refreshExpireDays = this.configService.get<number>('REFRESH_EXPIRE_DAYS');
    
    const payload: AuthClaims = {
      userId,
      nickname,
    };
    
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: `${refreshExpireDays}d`,
    });
  }

  async parseAccessToken(tokenStr: string): Promise<AuthClaims> {
    try {
      const payload = await this.jwtService.verifyAsync<AuthClaims>(tokenStr, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
      
      return payload;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  async parseRefreshToken(tokenStr: string): Promise<AuthClaims> {
    try {
      const payload = await this.jwtService.verifyAsync<AuthClaims>(tokenStr, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
      
      return payload;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }
}
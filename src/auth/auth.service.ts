// auth/auth.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from 'src/jwt/jwt.service';
import { Request } from 'express';
import axios from 'axios';
import { UserService } from '../user/user.service';
import { changeNicknameInfo, GoogleUserInfo } from './auth.type';
import { UserDto } from 'src/user/dto/user.dto';
import { TagService } from 'src/user/tag/tag.service';
import { UserTypeDecorater } from 'src/common/types/jwt.type';
import { EncryptionService } from 'src/common/utils/encryption.service';
import { UserCacheService } from 'src/user/user-cache.service';


@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tagService: TagService,
    private readonly encryptionService: EncryptionService,
    private readonly userCacheService: UserCacheService
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


    async handleRefreshToken(req: Request): Promise<{ token: string; user: any }> {
      const refreshToken = req.cookies['refresh_token'];
      
      if (!refreshToken) {
        throw new HttpException('Missing refresh token', HttpStatus.BAD_REQUEST);
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
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  

async authCallbackFlow(code) {
   const userInfo = await this.authGetGoogleOauthId(code)
    const existingUser = await this.userService.findUserByOAuthId(userInfo.id, 'google');
    const {userId, accessToken, refreshToken, tempToken, nickname} = await this.checkExistingAccount(existingUser,userInfo.id)
    if (existingUser) await this.userCacheService.setUser(userId, existingUser)
    const url = await this.makeUriData(accessToken, tempToken, nickname, userId);
    return { url, refreshToken }
  }


  private async authGetGoogleOauthId(code) {
    const googleOAuthConfig = {
      clientID: this.configService.get<string>('googleClientId'),
      clientSecret: this.configService.get<string>('googleClientSecret'),
      redirectUri: this.configService.get<string>('googleRedirectUrl'),
    };
  
    try {
      const { clientID, clientSecret, redirectUri } = googleOAuthConfig;
      if (!clientID || !clientSecret || !redirectUri) {
        throw new Error('Google OAuth 설정이 잘못되었습니다 (.env 확인)');
      }
      
      const params = new URLSearchParams({
        code,
        client_id: clientID,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });
        
      const tokenResponse = await axios.post(
        'https://oauth2.googleapis.com/token',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
  
      const accessToken = tokenResponse.data.access_token;
  
      const userInfoResponse = await axios.get<GoogleUserInfo>(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
  
      return userInfoResponse.data;
    } catch (error) {
      console.error('구글 토큰 요청 실패:', error.response?.data || error.message);
      throw new HttpException('Google 인증 실패', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  

  async checkExistingAccount(userData:UserDto | null, oauthId:string){
    if (userData) {
      const userId = Number(userData.id);

      let nickname:string | undefined

      const encryptedData = userData.encryptedNickname
      const iv = userData.ivNickname

      if (encryptedData&& iv) {
        nickname = this.encryptionService.decryptNickname(encryptedData, iv)
      }
        nickname = nickname? nickname : userData.nickname? userData.nickname : '오류 발생'; 

        if (!nickname) throw new HttpException('DB에 사용자 정보에 오류가 있습니다', HttpStatus.INTERNAL_SERVER_ERROR)

      // 4-1. 기존 사용자라면 Access/Refresh Token 발급
      const jwtAccessToken = await this.jwtService.generateAccessToken(userId, nickname);
      const jwtRefreshToken = await this.jwtService.generateRefreshToken(userId, nickname);

      return {
        userId,
        nickname,
        accessToken: jwtAccessToken,
        refreshToken: jwtRefreshToken,
        tempToken: null,
      };
    }
    else {
        await this.userService.cacheTemporaryUser('google', oauthId);
        const tempToken = await this.jwtService.generateTempToken(oauthId, 'google');
  
        return {
          userId: 0,
          nickname: null,
          accessToken: null,
          refreshToken: null, // 신규 사용자에겐 리프레시 토큰 없음
          tempToken: tempToken,
        };
  }
}

async handleGetMe(req: Request): Promise<any> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    throw new HttpException('Missing Authorization header', HttpStatus.UNAUTHORIZED);
  }
  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    throw new HttpException('Invalid token format', HttpStatus.UNAUTHORIZED);
  }
  const token = tokenParts[1];

  try {
    const claims = await this.jwtService.parseAccessToken(token);
    let nickname = claims.nickname;
    return {
      id: claims.userId,
      nickname,
    };
  } catch (error) {
    console.error('handleGetMe 처리 중 오류:', error);
    throw new HttpException(`Authentication failed: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

private async makeUriData(accessToken, tempToken, nickname, userId){
  nickname = encodeURIComponent(nickname)
  const frontendUrl = this.configService.get<string>('frontendUrl');
  if (tempToken){
    return `${frontendUrl}?token=${tempToken}`
  } else if (accessToken && nickname && userId){
    return `${frontendUrl}?token=${accessToken}&nickname=${nickname}&userId=${userId}`
  } else throw new HttpException('사용자 검색 처리 중 오류가 발생하였습니다', HttpStatus.INTERNAL_SERVER_ERROR)
}

async createNewNickname(Information:changeNicknameInfo, user?: UserTypeDecorater){
  this.checkCorrectNickname(Information.nickname);
  const fullNickname = await this.createFullNickname(Information.nickname)
  let userId
  if (Information.token){ 
  const { provider, oauthId } = await this.checkTempToken(Information.token)
  const userData = await this.userService.addNewAccount(oauthId, provider, fullNickname)
  userId = Number(userData.id)
  }
  else if (user){
  userId = Number(user.userId)
  }
  else {
  throw new HttpException('사용자 정보가 없습니다', HttpStatus.UNAUTHORIZED)
  }
  const refreshToken = await this.jwtService.generateRefreshToken(userId, fullNickname)
  const accessToken = await this.jwtService.generateAccessToken(userId, fullNickname)
  const url = await this.makeUriData(accessToken, null, fullNickname, userId)
  return {refreshToken, url}
}

private checkCorrectNickname(nickname){
  const trimmed = nickname.trim();

  if (!trimmed) {
    throw new HttpException('닉네임은 비워둘 수 없습니다.', HttpStatus.NOT_ACCEPTABLE);
  }

  if (trimmed.length > 16) {
    throw new HttpException('닉네임은 16자 이하여야 합니다.', HttpStatus.NOT_ACCEPTABLE);
  }

  const regex = /^[가-힣a-zA-Z]+$/;
  if (!regex.test(trimmed)) {
    throw new HttpException('닉네임은 한글과 영문만 사용할 수 있습니다.', HttpStatus.NOT_ACCEPTABLE);
  }

}

  private async checkTempToken(token) {

    const payload = await this.jwtService.parseTempToken(token);
    if (!payload || typeof payload.oauthId !== 'string' || typeof payload.provider !== 'string') {
      throw new HttpException('Invalid temporary token payload', HttpStatus.BAD_REQUEST);
    }
    return payload
  }


  private async createFullNickname(nickname){
    const tagStr = await this.tagService.generateTag();

    const fullNickname = `${nickname}#${tagStr}`;
    return fullNickname
  }


 
}



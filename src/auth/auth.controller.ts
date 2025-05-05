// auth/auth.controller.ts
import { Controller, Get, Post, Req, Res, Query, UseGuards, HttpStatus, Redirect, Body } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../jwt/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { changeNicknameInfo } from './auth.type';
import { CurrentUser } from 'src/jwt/decorators/current-user.decorator';
import { UserTypeDecorater } from 'src/common/types/jwt.type';

@Controller('auth')
export class AuthController {

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService 
  ) {
   
  }

  @Get('google/login')
  @Redirect()
  googleLogin() {
    const authURL = this.authService.getGoogleAuthUrl();
    return { url: authURL, statusCode: 302 };
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Res() res: Response,
  ) {
      const {refreshToken , url } = await this.authService.authCallbackFlow(code)

    if (refreshToken){
      // ✅ 기존 계정인 경우: 리프레시 토큰 쿠키 설정
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: !this.configService.get<boolean>('localTest'),
        sameSite: 'strict',
        expires: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });
    }
      // ✅ 기존 유저: 닉네임 유무와 관계없이
      return res.redirect(url)
}

  @Post('refresh')
  async refreshToken(@Req() req: Request, @Res() res: Response) {
      const { token, user } = await this.authService.handleRefreshToken(req);
      return res.json({
        token,
        user,
      });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: Request) {
    return this.authService.handleGetMe(req);
  }

  @Post('logout')
  logout(@Res() res: Response) {
    this.clearRefreshCookie(res);
    return res.status(HttpStatus.NO_CONTENT).send();
  }

  private clearRefreshCookie(res: Response) {
    res.cookie('refresh_token', '', {
      path: '/',
      expires: new Date(Date.now() - 3600000),
      httpOnly: true,
      secure: this.configService.get<string>('localTest') !== 'true',
      sameSite: 'strict',
    });
  }

  @Post('nickname')
  async setNickname(
    @Res() res: Response,
    @CurrentUser() user: UserTypeDecorater, 
    @Body() body: changeNicknameInfo
  ) {
    const { url, refreshToken } = await this.authService.createNewNickname(body, user);
  
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: this.configService.get<string>('LOCAL') !== 'true',
      sameSite: 'strict',
      path: '/',
    });
  
    return res.json({ url });
  }
  
}
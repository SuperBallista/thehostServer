// auth/auth.controller.ts
import { Controller, Get, Post, Req, Res, Query, UseGuards, HttpStatus, Redirect } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../jwt/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
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
    @Query('remember') remember = '30',
    @Res() res: Response,
  ) {
    const expireDays = parseInt(remember);
    
    try {
      const result = await this.authService.handleGoogleCallback(code, expireDays);
      
      // 리프레시 토큰 쿠키 설정
      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: !this.configService.get<string>('localTest'),
        sameSite: 'strict',
        expires: new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000),
      });

      // 리다이렉트 (프론트엔드로)
      return res.redirect(
        `http://localhost:3000?token=${result.accessToken}&new=${result.isNew}&nickname=${encodeURIComponent(result.nickname)}&id=${result.userId}`
      );
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message,
      });
    }
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
      secure: !this.configService.get<string>('localTest'),
      sameSite: 'strict',
    });
  }
}
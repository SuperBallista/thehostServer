// profile/profile.controller.ts
import { Controller, Post, Body, UseGuards, Req, Res, HttpStatus, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Response} from 'express';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../jwt/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from 'src/jwt/decorators/current-user.decorator';
import { JwtService } from 'src/jwt/jwt.service';

interface NicknameDto {
  nickname: string;
}

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  private readonly LOCAL_TEST: boolean;

  constructor(
    private readonly profileService: ProfileService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.LOCAL_TEST = this.configService.get('NODE_ENV') !== 'production';
  }

  @Post('nickname')
  async setNickname(
    @Res() res: Response,
    @CurrentUser() user,
    @Body() body: NicknameDto
  ) {
    // 1. 인증된 사용자 ID 가져오기
    const userId = user.id;
    if (!userId) {
      throw new UnauthorizedException('로그인이 필요합니다');
    }

    // 2. 요청 본문 검증
    if (!body.nickname) {
      throw new BadRequestException('닉네임을 입력해주세요');
    }

    try {
      // 3. 닉네임 설정
      const { nickname, tag } = await this.profileService.setNickname(userId, body.nickname);
      const fullNickname = `${nickname}#${tag}`;

      // 4. 액세스 토큰 & 리프레시 토큰 재발급
      const accessToken = await this.jwtService.generateAccessToken(userId, fullNickname)

      const refreshToken = await this.jwtService.generateRefreshToken(userId, fullNickname)

      // 5. 쿠키로 리프레시 토큰 전달
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: !this.LOCAL_TEST,
        sameSite: 'strict',
        path: '/',
      });

      // 6. 응답
      return res.status(HttpStatus.OK).json({
        nickname: fullNickname,
        accessToken,
      });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
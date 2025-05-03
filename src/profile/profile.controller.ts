// profile/profile.controller.ts
import { Controller, Post, Body, UseGuards, Req, Res, HttpStatus, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Response} from 'express';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../jwt/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from 'src/jwt/decorators/current-user.decorator';
import { UserService } from 'src/user/user.service';
import { JwtService } from 'src/jwt/jwt.service';


@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  private readonly LOCAL_TEST: boolean;

  constructor(
    private readonly profileService: ProfileService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService
  ) {
  }

    @CurrentUser() user,
  ) {
  
    const { provider, oauthId } = await this.profileService.checkTempToken(body.token)
    const fullNickname = await this.profileService.setNickname(oauthId ,body.nickname);
        if (body.isNew && body.token){
          await this.userService.addNewAccount(oauthId, provider, fullNickname.nickname + fullNickname.tag)
         }



         


         
  
      return { nickname: fullNickname, accessToken };
  
  }
}

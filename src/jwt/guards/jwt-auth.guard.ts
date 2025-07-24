// auth/guards/jwt-auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '../jwt.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('토큰이 제공되지 않았습니다');
    }

    const tokenStr = authHeader.substring(7);

    try {
      const claims = await this.jwtService.parseAccessToken(tokenStr);

      // 사용자 정보를 request 객체에 저장
      request.user = {
        userId: claims.userId,
        nickname: claims.nickname,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }
}

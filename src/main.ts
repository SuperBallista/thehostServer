import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  // NestJS 애플리케이션 생성
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 환경 변수 서비스 가져오기
  const configService = app.get(ConfigService);

  app.use(cookieParser()); // ✅ 정상 작동

  // API 접두사 설정
  app.setGlobalPrefix('api');

  // 정적 파일 서빙 (Svelte front/)
  app.useStaticAssets(path.join(__dirname, '..', 'front'), {
    index: false, // index.html을 자동으로 서빙하지 않음
  });

  // Fallback 미들웨어 설정: /api로 시작하지 않는 모든 요청을 index.html로 라우팅
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith('/api')) {
      // 정적 파일이 존재하면 정적 파일 서빙, 그렇지 않으면 index.html로 fallback
      res.sendFile(path.join(__dirname, '..', 'front', 'index.html'));
    } else {
      next();
    }
  });

  // 포트 설정 (기본값 3000)
  const port = configService.get<string>('SERVER_PORT') || '3000';

  // 서버 시작
  await app.listen(port);
  console.log(`Application is running on port: ${port}`);
}

bootstrap();

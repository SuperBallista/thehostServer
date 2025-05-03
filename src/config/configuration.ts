import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  AES_SECRET_KEY: Joi.string().required(),
  ACCESS_EXPIRE_MINUTES: Joi.number().required(),
  REFRESH_EXPIRE_DAYS: Joi.number().required(),
  LOCAL_TEST: Joi.string().valid('true', 'false').default('false'),
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),
  GOOGLE_REDIRECT_URL: Joi.string().required(),
});

export interface EnvironmentVariables {
  NODE_ENV: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  AES_SECRET_KEY: string;
  ACCESS_EXPIRE_MINUTES: number;
  REFRESH_EXPIRE_DAYS: number;
  LOCAL_TEST: boolean;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URL: string;
}

export const configuration = (): any => ({
  nodeEnv: process.env.NODE_ENV,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  aesSecretKey: process.env.AES_SECRET_KEY,
  accessExpireMinutes: parseInt(process.env.ACCESS_EXPIRE_MINUTES as string, 10),
  refreshExpireDays: parseInt(process.env.REFRESH_EXPIRE_DAYS as string, 10),
  localTest: process.env.LOCAL_TEST === 'true',
  serverPort: parseInt(process.env.SERVER_PORT as string, 10),
  // Google 관련 환경변수 추가
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUrl: process.env.GOOGLE_REDIRECT_URL,
});

export default () => ({
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
});

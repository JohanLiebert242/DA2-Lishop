import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        PORT: Joi.number().default(4000),
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().required(),
        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
        SMTP_HOST: Joi.string().required(),
        SMTP_PORT: Joi.number().default(587),
        SMTP_USER: Joi.string().required(),
        SMTP_PASS: Joi.string().required(),
        SMTP_FROM: Joi.string().default('Lishop <no-reply@lishop.vn>'),
        CLIENT_URL: Joi.string().default('http://localhost:3000'),
        GOOGLE_CLIENT_ID: Joi.string().optional().default(''),
        GOOGLE_CLIENT_SECRET: Joi.string().optional().default(''),
        FACEBOOK_CLIENT_ID: Joi.string().optional().default(''),
        FACEBOOK_CLIENT_SECRET: Joi.string().optional().default(''),
      }),
    }),
  ],
})
export class ConfigModule {}

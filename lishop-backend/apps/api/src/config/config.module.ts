import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        PORT: Joi.number().default(4000),
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().required(),
        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
        SMTP_HOST: Joi.string().default('smtp.gmail.com'),
        SMTP_PORT: Joi.number().default(587),
        SMTP_USER: Joi.string().allow('').default(''),
        SMTP_PASS: Joi.string().allow('').default(''),
        SMTP_FROM: Joi.string().default('Lishop <no-reply@lishop.vn>'),
        CLIENT_URL: Joi.string().default('http://localhost:3000'),
        GOOGLE_CLIENT_ID: Joi.string().allow('').optional().default(''),
        GOOGLE_CLIENT_SECRET: Joi.string().allow('').optional().default(''),
        FACEBOOK_CLIENT_ID: Joi.string().allow('').optional().default(''),
        FACEBOOK_CLIENT_SECRET: Joi.string().allow('').optional().default(''),
      }),
    }),
  ],
})
export class ConfigModule {}

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyCookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import * as path from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  await (app as any).register(fastifyCookie);
  await (app as any).register(fastifyStatic, {
    root: path.resolve(process.cwd(), 'uploads'),
    prefix: '/uploads/',
    decorateReply: false,
  });

  const allowedOrigins = process.env['ALLOWED_ORIGINS']?.split(',');
  app.enableCors({
    origin: allowedOrigins
      ? allowedOrigins
      : (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
          // In development allow all localhost origins (any port)
          if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
            cb(null, true);
          } else {
            cb(new Error('Not allowed by CORS'));
          }
        },
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Lishop API')
    .setDescription('Lishop E-Commerce REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env['PORT'] ?? 4000;
  await app.listen(port, '0.0.0.0');
  console.warn(`Lishop API listening on port ${port}`);
}

bootstrap();

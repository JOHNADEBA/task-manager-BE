import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { config } from 'dotenv';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

config();
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Enable CORS
  app.enableCors({
    origin: [process.env.FRONTEND_DOMAIN as string],
    methods: 'GET,PATCH,POST,DELETE',
    credentials: true,
  });

  // Use ValidationPipe globally
  app.useGlobalPipes(new ValidationPipe());

  // Use for images
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Use Error Filter globally
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(process.env.BACKEND_PORT ?? 3000);
}
bootstrap();

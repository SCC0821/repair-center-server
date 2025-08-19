import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { VersioningType } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // 缓冲日志，直到 pino logger 准备就绪
    bufferLogs: true,
  });
  // 将 pino 设置为全局 logger
  app.useLogger(app.get(Logger));
  // 注册为全局过滤器
  app.useGlobalFilters(new AllExceptionsFilter());
  // 启用版本控制
  app.enableVersioning({
    type: VersioningType.URI, // 设置版本控制类型为 URI
    defaultVersion: '1', // 可选：设置默认版本
  });
  await app.listen(process.env.APP_PORT ?? 3000);
}
bootstrap();

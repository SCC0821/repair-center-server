import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { Logger } from 'nestjs-pino';
import { VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from '@/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '@/common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // 缓冲日志，直到 pino logger 准备就绪
    bufferLogs: true,
  });
  // 将 pino 设置为全局 logger
  app.useLogger(app.get(Logger));
  // 注册为全局过滤器
  app.useGlobalFilters(new AllExceptionsFilter());
  // 注册全局拦截器
  app.useGlobalInterceptors(new TransformInterceptor());
  // 启用版本控制
  app.enableVersioning({
    type: VersioningType.URI, // 设置版本控制类型为 URI
    defaultVersion: '1', // 可选：设置默认版本
  });
  // 配置 Swagger 文档
  const config = new DocumentBuilder()
    .setTitle('维修中心 API 文档')
    .setDescription('这是维修中心项目的 API 详细文档')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document); // 设置文档访问路径为 /api-docs
  await app.listen(process.env.APP_PORT ?? 3000);
}
void bootstrap();

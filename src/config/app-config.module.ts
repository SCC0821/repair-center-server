import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 全局可用
      // 根据 NODE_ENV 加载对应的 .env 文件
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      // 使用 Joi 进行环境变量验证
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        APP_PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
      }),
    }),
  ],
})
export class AppConfigModule {}

import { Module } from '@nestjs/common';
import { LoggerModule as Logger } from 'nestjs-pino';

@Module({
  imports: [
    Logger.forRoot({
      pinoHttp: {
        // 在生产环境中使用 pino-roll 进行日志轮转
        transport:
          process.env.NODE_ENV === 'production'
            ? {
                target: 'pino-roll',
                options: {
                  file: './logs/app.log', // 日志文件路径
                  frequency: 'daily', // 按天轮转
                  size: '10M', // 每个文件最大 10MB
                  mkdir: true, // 自动创建目录
                },
              }
            : {
                // 在开发环境中使用 pino-pretty 美化输出
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                  colorize: true,
                },
              },
        // 设置日志级别
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
      },
    }),
  ],
})
export class LoggerModule {}

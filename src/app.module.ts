import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './database/prisma/prisma.module';
import { LoggerModule } from './config/logger.module';
import { AppConfigModule } from './config/app-config.module';

@Module({
  imports: [ConfigModule, PrismaModule, LoggerModule, AppConfigModule],
  controllers: [],
  providers: [],
})
export class AppModule {}

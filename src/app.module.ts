import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/database/prisma/prisma.module';
import { LoggerModule } from '@/config/logger.module';
import { AppConfigModule } from '@/config/app-config.module';
import { UserModule } from '@/modules/user/user.module';

@Module({
  imports: [ConfigModule, PrismaModule, LoggerModule, AppConfigModule, UserModule],
  controllers: [],
  providers: [],
})
export class AppModule {}

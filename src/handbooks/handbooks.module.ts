import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HandbooksController } from './handbooks.controller';
import { HandbooksService } from './handbooks.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [HandbooksController],
  providers: [HandbooksService],
})
export class HandbooksModule {}

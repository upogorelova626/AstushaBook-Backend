import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HandbooksController } from './handbooks.controller';
import { HandbooksService } from './handbooks.service';

@Module({
  imports: [AuthModule],
  controllers: [HandbooksController],
  providers: [HandbooksService],
})
export class HandbooksModule {}

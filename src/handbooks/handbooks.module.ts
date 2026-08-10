import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { HandbookRowsController } from './handbook-rows.controller';
import { HandbookRowsService } from './handbook-rows.service';
import { HandbooksController } from './handbooks.controller';
import { HandbooksService } from './handbooks.service';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [HandbooksController, HandbookRowsController],
  providers: [HandbooksService, HandbookRowsService],
})
export class HandbooksModule {}

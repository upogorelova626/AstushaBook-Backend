import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { CreateHandbookDto } from './dto/create-handbook.dto';
import { GetHandbooksDto } from './dto/get-handbooks.dto';
import { HandbooksService } from './handbooks.service';

@ApiTags('Handbooks')
@ApiCookieAuth('accessToken')
@Controller('handbooks')
@UseGuards(JwtAuthGuard)
export class HandbooksController {
  constructor(private readonly handbooksService: HandbooksService) {}

  @Post('search')
  @ApiOperation({
    summary: 'Получить список хэндбуков',
    description:
      'Возвращает доступные пользователю хэндбуки по 10 штук с поиском и фильтрацией',
  })
  @ApiOkResponse({
    description: 'Список хэндбуков успешно получен',
  })
  getAll(@Req() request: AuthenticatedRequest, @Body() dto: GetHandbooksDto) {
    return this.handbooksService.getAll(request.user.id, dto);
  }

  @Post()
  @ApiOperation({
    summary: 'Создать хэндбук',
  })
  @ApiCreatedResponse({
    description: 'Хэндбук успешно создан',
  })
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateHandbookDto) {
    return this.handbooksService.create(request.user.id, dto);
  }
}

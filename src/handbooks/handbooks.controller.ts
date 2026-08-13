import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { CreateHandbookDto } from './dto/create-handbook.dto';
import { GetHandbooksDto } from './dto/get-handbooks.dto';
import { UpdateHandbookDescriptionDto } from './dto/update-handbook-description.dto';
import { HandbooksService } from './handbooks.service';
import { EditHandbookColumnsDto } from './dto/edit-handbook-columns.dto';

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

  @Get(':id')
  @ApiOperation({
    summary: 'Получить хэндбук по идентификатору',
    description:
      'Возвращает хэндбук, если текущий пользователь имеет к нему доступ',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID хэндбука',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Хэндбук успешно получен',
  })
  @ApiNotFoundResponse({
    description: 'Хэндбук не найден или у пользователя нет доступа',
  })
  getById(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.handbooksService.getById(request.user.id, id);
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

  @Patch(':id/columns')
  @ApiOperation({
    summary: 'Изменить атрибуты хэндбука',
    description:
      'Создаёт новые, обновляет существующие и удаляет отсутствующие атрибуты',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID хэндбука',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Атрибуты хэндбука успешно обновлены',
  })
  @ApiForbiddenResponse({
    description: 'Изменить атрибуты может только владелец',
  })
  @ApiNotFoundResponse({
    description: 'Хэндбук не найден',
  })
  updateColumns(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) handbookId: string,
    @Body() dto: EditHandbookColumnsDto,
  ) {
    return this.handbooksService.updateColumns(
      request.user.id,
      handbookId,
      dto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Удалить хэндбук',
    description: 'Удалить хэндбук может только его владелец',
  })
  @ApiNoContentResponse({
    description: 'Хэндбук успешно удалён',
  })
  @ApiForbiddenResponse({
    description: 'Удалить хэндбук может только владелец',
  })
  @ApiNotFoundResponse({
    description: 'Хэндбук не найден',
  })
  delete(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.handbooksService.delete(request.user.id, id);
  }

  @Patch(':id/description')
  @ApiOperation({
    summary: 'Изменить описание хэндбука',
    description: 'Изменить описание хэндбука может только его владелец',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID хэндбука',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Описание хэндбука успешно изменено',
  })
  @ApiForbiddenResponse({
    description: 'Изменить описание может только владелец',
  })
  @ApiNotFoundResponse({
    description: 'Хэндбук не найден',
  })
  updateDescription(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHandbookDescriptionDto,
  ) {
    return this.handbooksService.updateDescription(request.user.id, id, dto);
  }
}

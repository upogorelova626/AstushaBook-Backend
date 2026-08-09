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
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import { CreateHandbookRowDto } from './dto/create-handbook-row.dto';
import { GetHandbookRowsDto } from './dto/get-handbooks-row.dto';
import { GetHandbooksDto } from './dto/get-handbooks.dto';
import { HandbookRowIdsDto } from './dto/handbook-row-ids.dto';
import { UpdateHandbookRowsDto } from './dto/update-handbook-rows.dto';
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

  @Post(':id/rows')
  @ApiOperation({
    summary: 'Добавить строку в хэндбук',
    description:
      'Добавляет новую строку, если текущий пользователь имеет право редактировать хэндбук',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID хэндбука',
    format: 'uuid',
  })
  @ApiCreatedResponse({
    description: 'Строка успешно добавлена',
  })
  @ApiBadRequestResponse({
    description: 'Переданы некорректные значения строки',
  })
  @ApiForbiddenResponse({
    description: 'У пользователя нет прав на редактирование хэндбука',
  })
  @ApiNotFoundResponse({
    description: 'Хэндбук не найден или недоступен пользователю',
  })
  addRow(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateHandbookRowDto,
  ) {
    return this.handbooksService.addRow(request.user.id, id, dto);
  }

  @Post(':id/rows/search')
  @ApiOperation({
    summary: 'Получить строки хэндбука',
    description: 'Возвращает строки хэндбука по 15 штук',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID хэндбука',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Строки хэндбука успешно получены',
  })
  @ApiNotFoundResponse({
    description: 'Хэндбук не найден или недоступен пользователю',
  })
  getRows(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GetHandbookRowsDto,
  ) {
    return this.handbooksService.getRows(
      request.user.id,
      id,
      request.cookies.accessToken!,
      dto.offset,
    );
  }

  @Put(':id/rows')
  @ApiOperation({
    summary: 'Заменить строки справочника',
    description:
      'Заменяет значения одной или нескольких строк справочника одной транзакцией',
  })
  updateRows(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) handbookId: string,
    @Body() dto: UpdateHandbookRowsDto,
  ) {
    return this.handbooksService.updateRows(request.user.id, handbookId, dto);
  }

  @Delete(':id/rows')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Удалить строки хэндбука',
    description: 'Удаляет одну или несколько строк одной операцией',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID хэндбука',
    format: 'uuid',
  })
  @ApiNoContentResponse({
    description: 'Строки успешно удалены',
  })
  @ApiBadRequestResponse({
    description: 'Передан некорректный список строк',
  })
  @ApiForbiddenResponse({
    description: 'У пользователя нет прав на удаление строк',
  })
  @ApiNotFoundResponse({
    description: 'Хэндбук или одна из строк не найдены',
  })
  deleteRows(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) handbookId: string,
    @Body() dto: HandbookRowIdsDto,
  ): Promise<void> {
    return this.handbooksService.deleteRows(request.user.id, handbookId, dto);
  }

  @Post(':id/rows/duplicate')
  @ApiOperation({
    summary: 'Дублировать строки хэндбука',
    description:
      'Создаёт копии одной или нескольких строк и возвращает новые строки',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID хэндбука',
    format: 'uuid',
  })
  @ApiCreatedResponse({
    description: 'Строки успешно продублированы',
  })
  @ApiBadRequestResponse({
    description: 'Передан некорректный список строк',
  })
  @ApiForbiddenResponse({
    description: 'У пользователя нет прав на дублирование строк',
  })
  @ApiNotFoundResponse({
    description: 'Хэндбук или одна из строк не найдены',
  })
  duplicateRows(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) handbookId: string,
    @Body() dto: HandbookRowIdsDto,
  ) {
    return this.handbooksService.duplicateRows(
      request.user.id,
      handbookId,
      dto,
    );
  }
}

import {
  Body,
  Controller,
  Delete,
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
import { CreateHandbookRowDto } from './dto/create-handbook-row.dto';
import { GetHandbookRowsDto } from './dto/get-handbooks-row.dto';
import { HandbookRowIdsDto } from './dto/handbook-row-ids.dto';
import { UpdateHandbookRowsDto } from './dto/update-handbook-rows.dto';
import { HandbookRowsService } from './handbook-rows.service';

@ApiTags('Handbook rows')
@ApiCookieAuth('accessToken')
@Controller('handbooks/:handbookId/rows')
@UseGuards(JwtAuthGuard)
export class HandbookRowsController {
  constructor(private readonly handbookRowsService: HandbookRowsService) {}

  @Post()
  @ApiOperation({
    summary: 'Добавить строку в хэндбук',
    description:
      'Добавляет новую строку, если текущий пользователь имеет право редактировать хэндбук',
  })
  @ApiParam({
    name: 'handbookId',
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
    @Param('handbookId', ParseUUIDPipe) handbookId: string,
    @Body() dto: CreateHandbookRowDto,
  ) {
    return this.handbookRowsService.addRow(
      request.user.id,
      handbookId,
      request.cookies.accessToken!,
      dto,
    );
  }

  @Post('search')
  @ApiOperation({
    summary: 'Получить строки хэндбука',
    description: 'Возвращает строки хэндбука по 15 штук',
  })
  @ApiParam({
    name: 'handbookId',
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
    @Param('handbookId', ParseUUIDPipe) handbookId: string,
    @Body() dto: GetHandbookRowsDto,
  ) {
    return this.handbookRowsService.getRows(
      request.user.id,
      handbookId,
      request.cookies.accessToken!,
      dto.offset,
    );
  }

  @Put()
  @ApiOperation({
    summary: 'Заменить строки справочника',
    description:
      'Заменяет значения одной или нескольких строк справочника одной транзакцией',
  })
  @ApiParam({
    name: 'handbookId',
    description: 'UUID хэндбука',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Строки успешно обновлены',
  })
  @ApiBadRequestResponse({
    description: 'Переданы некорректные значения строк',
  })
  @ApiForbiddenResponse({
    description: 'У пользователя нет прав на редактирование хэндбука',
  })
  @ApiNotFoundResponse({
    description: 'Хэндбук или одна из строк не найдены',
  })
  updateRows(
    @Req() request: AuthenticatedRequest,
    @Param('handbookId', ParseUUIDPipe) handbookId: string,
    @Body() dto: UpdateHandbookRowsDto,
  ) {
    return this.handbookRowsService.updateRows(
      request.user.id,
      handbookId,
      dto,
    );
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Удалить строки хэндбука',
    description: 'Удаляет одну или несколько строк одной операцией',
  })
  @ApiParam({
    name: 'handbookId',
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
    @Param('handbookId', ParseUUIDPipe) handbookId: string,
    @Body() dto: HandbookRowIdsDto,
  ): Promise<void> {
    return this.handbookRowsService.deleteRows(
      request.user.id,
      handbookId,
      dto,
    );
  }

  @Post('duplicate')
  @ApiOperation({
    summary: 'Дублировать строки хэндбука',
    description:
      'Создаёт копии одной или нескольких строк и возвращает новые строки',
  })
  @ApiParam({
    name: 'handbookId',
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
    @Param('handbookId', ParseUUIDPipe) handbookId: string,
    @Body() dto: HandbookRowIdsDto,
  ) {
    return this.handbookRowsService.duplicateRows(
      request.user.id,
      handbookId,
      request.cookies.accessToken!,
      dto,
    );
  }
}

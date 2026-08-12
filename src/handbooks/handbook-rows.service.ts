import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';

import type { HandbookRow, Prisma } from '../generated/prisma/client';
import {
  HandbookColumnType,
  HandbookEditingAccess,
  HandbookVisibility,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateHandbookRowDto } from './dto/create-handbook-row.dto';
import { HandbookRowIdsDto } from './dto/handbook-row-ids.dto';
import { UpdateHandbookRowsDto } from './dto/update-handbook-rows.dto';

const HANDBOOK_ROWS_BATCH_SIZE = 15;

type HandbookCellValue = string | number | boolean;

@Injectable()
export class HandbookRowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async addRow(
    userId: string,
    handbookId: string,
    accessToken: string,
    dto: CreateHandbookRowDto,
  ) {
    const handbook = await this.prisma.handbook.findFirst({
      where: {
        id: handbookId,
        AND: [this.buildAccessWhere(userId)],
      },

      select: {
        ownerId: true,
        editingPermission: true,

        columns: {
          select: {
            id: true,
            name: true,
            type: true,
            required: true,
            options: true,
          },
        },

        editors: {
          where: {
            userId,
          },
          select: {
            userId: true,
          },
        },
      },
    });

    if (!handbook) {
      throw new NotFoundException('Хэндбук не найден');
    }

    this.checkEditingPermission(
      userId,
      handbook.ownerId,
      handbook.editingPermission,
      handbook.editors.length > 0,
    );

    const values = this.prepareRowValues(handbook.columns, dto.values);

    const createdRow = await this.prisma.handbookRow.create({
      data: {
        handbookId,
        createdById: userId,
        values,
      },
    });

    const userColumnIds = new Set(
      handbook.columns
        .filter((column) => column.type === HandbookColumnType.USER)
        .map((column) => column.id),
    );

    const [preparedRow] = await this.populateUserValues(
      [createdRow],
      userColumnIds,
      accessToken,
    );

    return preparedRow;
  }

  async getRows(
    userId: string,
    handbookId: string,
    accessToken: string,
    offset = 0,
  ) {
    const handbook = await this.prisma.handbook.findFirst({
      where: {
        id: handbookId,
        AND: [this.buildAccessWhere(userId)],
      },

      select: {
        id: true,

        columns: {
          where: {
            type: HandbookColumnType.USER,
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!handbook) {
      throw new NotFoundException('Хэндбук не найден');
    }

    const rows = await this.prisma.handbookRow.findMany({
      where: {
        handbookId,
      },

      select: {
        id: true,
        values: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },

      orderBy: [
        {
          createdAt: 'asc',
        },
        {
          id: 'asc',
        },
      ],

      skip: offset,
      take: HANDBOOK_ROWS_BATCH_SIZE + 1,
    });

    const hasMore = rows.length > HANDBOOK_ROWS_BATCH_SIZE;

    const items = rows.slice(0, HANDBOOK_ROWS_BATCH_SIZE);

    const userColumnIds = new Set(handbook.columns.map((column) => column.id));

    const preparedItems = await this.populateUserValues(
      items,
      userColumnIds,
      accessToken,
    );

    return {
      items: preparedItems,
      nextOffset: hasMore ? offset + HANDBOOK_ROWS_BATCH_SIZE : null,
    };
  }

  async updateRows(
    userId: string,
    handbookId: string,
    accessToken: string,
    dto: UpdateHandbookRowsDto,
  ) {
    const rowIds = dto.rows.map((row) => row.id);
    const uniqueRowIds = new Set(rowIds);

    if (uniqueRowIds.size !== rowIds.length) {
      throw new BadRequestException(
        'Одна и та же строка передана несколько раз',
      );
    }

    const result = await this.prisma.$transaction(async (transaction) => {
      const handbook = await transaction.handbook.findFirst({
        where: {
          id: handbookId,
          AND: [this.buildAccessWhere(userId)],
        },
        select: {
          ownerId: true,
          editingPermission: true,

          editors: {
            where: {
              userId,
            },
            select: {
              userId: true,
            },
          },

          columns: {
            select: {
              id: true,
              name: true,
              type: true,
              required: true,
              options: true,
            },
          },
        },
      });

      if (!handbook) {
        throw new NotFoundException('Хэндбук не найден');
      }

      this.checkEditingPermission(
        userId,
        handbook.ownerId,
        handbook.editingPermission,
        handbook.editors.length > 0,
      );

      const existingRows = await transaction.handbookRow.findMany({
        where: {
          handbookId,
          id: {
            in: rowIds,
          },
        },
        select: {
          id: true,
        },
      });

      const existingRowIds = new Set(existingRows.map((row) => row.id));

      const missingRowId = rowIds.find((rowId) => !existingRowIds.has(rowId));

      if (missingRowId) {
        throw new NotFoundException(
          `Строка с идентификатором ${missingRowId} не найдена`,
        );
      }

      const preparedRows = dto.rows.map((row) => ({
        id: row.id,
        values: this.prepareRowValues(handbook.columns, row.values),
      }));

      const updatedRows = await Promise.all(
        preparedRows.map((row) =>
          transaction.handbookRow.update({
            where: {
              id: row.id,
            },
            data: {
              values: row.values,
            },
            select: {
              id: true,
              values: true,
              createdById: true,
              createdAt: true,
              updatedAt: true,
            },
          }),
        ),
      );

      const userColumnIds = new Set(
        handbook.columns
          .filter((column) => column.type === HandbookColumnType.USER)
          .map((column) => column.id),
      );

      return {
        updatedRows,
        userColumnIds,
      };
    });

    return this.populateUserValues(
      result.updatedRows,
      result.userColumnIds,
      accessToken,
    );
  }

  async deleteRows(
    userId: string,
    handbookId: string,
    dto: HandbookRowIdsDto,
  ): Promise<void> {
    await this.checkRowsEditingAccess(userId, handbookId);

    await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.handbookRow.deleteMany({
        where: {
          handbookId,
          id: {
            in: dto.rowIds,
          },
        },
      });

      if (result.count !== dto.rowIds.length) {
        throw new NotFoundException('Одна или несколько строк не найдены');
      }
    });
  }

  async duplicateRows(
    userId: string,
    handbookId: string,
    accessToken: string,
    dto: HandbookRowIdsDto,
  ) {
    await this.checkRowsEditingAccess(userId, handbookId);

    const userColumns = await this.prisma.handbookColumn.findMany({
      where: {
        handbookId,
        type: HandbookColumnType.USER,
      },
      select: {
        id: true,
      },
    });

    const duplicatedRows = await this.prisma.$transaction(
      async (transaction) => {
        const sourceRows = await transaction.handbookRow.findMany({
          where: {
            handbookId,
            id: {
              in: dto.rowIds,
            },
          },
          select: {
            id: true,
            values: true,
          },
        });

        if (sourceRows.length !== dto.rowIds.length) {
          throw new NotFoundException('Одна или несколько строк не найдены');
        }

        const sourceRowsById = new Map(sourceRows.map((row) => [row.id, row]));

        const rows: HandbookRow[] = [];

        for (const rowId of dto.rowIds) {
          const sourceRow = sourceRowsById.get(rowId);

          if (!sourceRow) {
            throw new NotFoundException('Строка не найдена');
          }

          const duplicatedRow = await transaction.handbookRow.create({
            data: {
              handbookId,
              createdById: userId,
              values: sourceRow.values as Prisma.InputJsonValue,
            },
          });

          rows.push(duplicatedRow);
        }

        return rows;
      },
    );

    return this.populateUserValues(
      duplicatedRows,
      new Set(userColumns.map((column) => column.id)),
      accessToken,
    );
  }

  private async checkRowsEditingAccess(
    userId: string,
    handbookId: string,
  ): Promise<void> {
    const handbook = await this.prisma.handbook.findFirst({
      where: {
        id: handbookId,
        AND: [this.buildAccessWhere(userId)],
      },

      select: {
        ownerId: true,
        editingPermission: true,

        editors: {
          where: {
            userId,
          },
          select: {
            userId: true,
          },
        },
      },
    });

    if (!handbook) {
      throw new NotFoundException('Хэндбук не найден');
    }

    this.checkEditingPermission(
      userId,
      handbook.ownerId,
      handbook.editingPermission,
      handbook.editors.length > 0,
    );
  }

  private checkEditingPermission(
    userId: string,
    ownerId: string,
    editingPermission: HandbookEditingAccess,
    isEditor: boolean,
  ): void {
    const isOwner = ownerId === userId;

    const canEdit =
      isOwner ||
      editingPermission === HandbookEditingAccess.EVERYONE_WITH_ACCESS ||
      (editingPermission === HandbookEditingAccess.SELECTED_EDITORS &&
        isEditor);

    if (!canEdit) {
      throw new ForbiddenException('У вас нет прав на редактирование строк');
    }
  }

  private prepareRowValues(
    columns: Array<{
      id: string;
      name: string;
      type: HandbookColumnType;
      required: boolean;
      options: string[];
    }>,
    values: Record<string, unknown>,
  ): Record<string, HandbookCellValue> {
    const columnsById = new Map(columns.map((column) => [column.id, column]));

    for (const columnId of Object.keys(values)) {
      if (!columnsById.has(columnId)) {
        throw new BadRequestException(
          `Колонка с идентификатором ${columnId} не существует`,
        );
      }
    }

    const preparedValues: Record<string, HandbookCellValue> = {};

    for (const column of columns) {
      const value = values[column.id];

      const isEmpty = value === undefined || value === null || value === '';

      if (column.required && isEmpty) {
        throw new BadRequestException(
          `Обязательное поле «${column.name}» не заполнено`,
        );
      }

      if (isEmpty) {
        continue;
      }

      switch (column.type) {
        case HandbookColumnType.TEXT:
          if (typeof value !== 'string') {
            throw new BadRequestException(
              `Поле «${column.name}» должно быть строкой`,
            );
          }

          preparedValues[column.id] = value;
          break;

        case HandbookColumnType.NUMBER:
          if (typeof value !== 'number' || !Number.isFinite(value)) {
            throw new BadRequestException(
              `Поле «${column.name}» должно быть числом`,
            );
          }

          preparedValues[column.id] = value;
          break;

        case HandbookColumnType.BOOLEAN:
          if (typeof value !== 'boolean') {
            throw new BadRequestException(
              `Поле «${column.name}» должно содержать true или false`,
            );
          }

          preparedValues[column.id] = value;
          break;

        case HandbookColumnType.DATE:
          if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
            throw new BadRequestException(
              `Поле «${column.name}» должно содержать корректную дату`,
            );
          }

          preparedValues[column.id] = new Date(value).toISOString();
          break;

        case HandbookColumnType.LIST:
          if (typeof value !== 'string' || !column.options.includes(value)) {
            throw new BadRequestException(
              `Поле «${column.name}» содержит недопустимое значение`,
            );
          }

          preparedValues[column.id] = value;
          break;

        case HandbookColumnType.USER: {
          if (
            typeof value !== 'object' ||
            value === null ||
            !('id' in value) ||
            typeof value.id !== 'string' ||
            !isUUID(value.id)
          ) {
            throw new BadRequestException(
              `Поле «${column.name}» должно содержать корректного пользователя`,
            );
          }

          preparedValues[column.id] = value.id;
          break;
        }

        case HandbookColumnType.FORMATTED_STRING: {
          if (typeof value !== 'string') {
            throw new BadRequestException(
              `Поле «${column.name}» должно содержать форматированный текст`,
            );
          }

          preparedValues[column.id] = value;
          break;
        }
      }
    }

    return preparedValues;
  }

  private async populateUserValues<
    T extends {
      values: Prisma.JsonValue;
    },
  >(rows: T[], userColumnIds: Set<string>, accessToken: string) {
    if (!rows.length || !userColumnIds.size) {
      return rows;
    }

    const userIds = [
      ...new Set(
        rows.flatMap((row) => {
          const values = row.values as Record<string, unknown>;

          return [...userColumnIds]
            .map((columnId) => values[columnId])
            .filter((value): value is string => typeof value === 'string');
        }),
      ),
    ];

    if (!userIds.length) {
      return rows;
    }

    const users = await this.usersService.getByIds(userIds, accessToken);

    const usersById = new Map(users.map((user) => [user.id, user]));

    return rows.map((row) => {
      const values = row.values as Record<string, unknown>;

      const preparedValues = { ...values };

      for (const columnId of userColumnIds) {
        const value = values[columnId];

        if (typeof value === 'string') {
          preparedValues[columnId] = usersById.get(value) ?? null;
        }
      }

      return {
        ...row,
        values: preparedValues,
      };
    });
  }

  private buildAccessWhere(userId: string): Prisma.HandbookWhereInput {
    return {
      OR: [
        {
          ownerId: userId,
        },
        {
          visibility: HandbookVisibility.EVERYONE,
        },
        {
          editors: {
            some: {
              userId,
            },
          },
        },
        {
          viewers: {
            some: {
              userId,
            },
          },
        },
      ],
    };
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import {
  HandbookColumnType,
  HandbookEditingAccess,
  HandbookVisibility,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHandbookDto } from './dto/create-handbook.dto';
import { GetHandbooksDto, HandbookListFilter } from './dto/get-handbooks.dto';
import { CreateHandbookRowDto } from './dto/create-handbook-row.dto';
import { UpdateHandbookCellDto } from './dto/update-handbook-ceil.dto';

const HANDBOOKS_BATCH_SIZE = 10;
const HANDBOOK_ROWS_BATCH_SIZE = 15;

type HandbookCellValue = string | number | boolean;

@Injectable()
export class HandbooksService {
  constructor(private readonly prisma: PrismaService) {}

  create(ownerId: string, dto: CreateHandbookDto) {
    if (
      dto.visibility === HandbookVisibility.OWNER_ONLY &&
      dto.editingPermission !== HandbookEditingAccess.OWNER_ONLY
    ) {
      throw new BadRequestException(
        'Нельзя разрешить редактирование другим пользователям, если справочник доступен только владельцу',
      );
    }

    const editorIds =
      dto.editingPermission === HandbookEditingAccess.SELECTED_EDITORS
        ? [...new Set(dto.editorIds)].filter((userId) => userId !== ownerId)
        : [];

    const editorIdsSet = new Set(editorIds);

    const viewerIds =
      dto.visibility === HandbookVisibility.SELECTED_USERS
        ? [...new Set(dto.viewerIds)].filter(
            (userId) => userId !== ownerId && !editorIdsSet.has(userId),
          )
        : [];

    return this.prisma.handbook.create({
      data: {
        name: dto.name,
        description: dto.description ?? '',
        systemName: dto.systemName,
        tags: this.normalizeTags(dto.tags),
        ownerId,
        visibility: dto.visibility,
        editingPermission: dto.editingPermission,

        columns: {
          create: dto.columns.map((column, position) => ({
            name: column.name,
            type: column.type,
            required: column.required,
            position,
          })),
        },

        editors: {
          create: editorIds.map((userId) => ({
            userId,
          })),
        },

        viewers: {
          create: viewerIds.map((userId) => ({
            userId,
          })),
        },
      },

      include: {
        columns: {
          orderBy: {
            position: 'asc',
          },
        },
        editors: true,
        viewers: true,
      },
    });
  }

  async getAll(userId: string, dto: GetHandbooksDto) {
    const offset = dto.offset ?? 0;

    const handbooks = await this.prisma.handbook.findMany({
      where: {
        AND: [
          this.buildAccessWhere(userId),
          this.buildFilterWhere(userId, dto.filter),
          this.buildSearchWhere(dto),
        ],
      },

      select: {
        id: true,
        name: true,
        description: true,
        tags: true,
        updatedAt: true,
      },

      orderBy: [
        {
          updatedAt: 'desc',
        },
        {
          id: 'asc',
        },
      ],

      skip: offset,
      take: HANDBOOKS_BATCH_SIZE + 1,
    });

    const hasMore = handbooks.length > HANDBOOKS_BATCH_SIZE;

    return {
      items: handbooks.slice(0, HANDBOOKS_BATCH_SIZE),
      nextOffset: hasMore ? offset + HANDBOOKS_BATCH_SIZE : null,
    };
  }

  async delete(userId: string, handbookId: string): Promise<void> {
    const handbook = await this.prisma.handbook.findUnique({
      where: {
        id: handbookId,
      },
      select: {
        ownerId: true,
      },
    });

    if (!handbook) {
      throw new NotFoundException('Хэндбук не найден');
    }

    if (handbook.ownerId !== userId) {
      throw new ForbiddenException('Удалить хэндбук может только владелец');
    }

    await this.prisma.handbook.delete({
      where: {
        id: handbookId,
      },
    });
  }

  async addRow(userId: string, handbookId: string, dto: CreateHandbookRowDto) {
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

    const isOwner = handbook.ownerId === userId;
    const isEditor = handbook.editors.length > 0;

    const canEdit =
      isOwner ||
      handbook.editingPermission ===
        HandbookEditingAccess.EVERYONE_WITH_ACCESS ||
      (handbook.editingPermission === HandbookEditingAccess.SELECTED_EDITORS &&
        isEditor);

    if (!canEdit) {
      throw new ForbiddenException('У вас нет прав на добавление строк');
    }

    const values = this.prepareRowValues(handbook.columns, dto.values);

    return this.prisma.handbookRow.create({
      data: {
        handbookId,
        createdById: userId,
        values,
      },
    });
  }

  async getById(userId: string, handbookId: string) {
    const handbook = await this.prisma.handbook.findFirst({
      where: {
        id: handbookId,
        AND: [this.buildAccessWhere(userId)],
      },
      include: {
        columns: {
          orderBy: {
            position: 'asc',
          },
        },
        editors: true,
        viewers: true,
      },
    });

    if (!handbook) {
      throw new NotFoundException('Хэндбук не найден');
    }

    return handbook;
  }

  async getRows(userId: string, handbookId: string, offset = 0) {
    const handbook = await this.prisma.handbook.findFirst({
      where: {
        id: handbookId,
        AND: [this.buildAccessWhere(userId)],
      },
      select: {
        id: true,
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

    return {
      items: rows.slice(0, HANDBOOK_ROWS_BATCH_SIZE),
      nextOffset: hasMore ? offset + HANDBOOK_ROWS_BATCH_SIZE : null,
    };
  }

  async updateCell(
    userId: string,
    handbookId: string,
    rowId: string,
    columnId: string,
    dto: UpdateHandbookCellDto,
  ) {
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

        columns: {
          where: {
            id: columnId,
          },
          select: {
            id: true,
            name: true,
            type: true,
            required: true,
          },
        },
      },
    });

    if (!handbook) {
      throw new NotFoundException('Хэндбук не найден');
    }

    const isOwner = handbook.ownerId === userId;
    const isEditor = handbook.editors.length > 0;

    const canEdit =
      isOwner ||
      handbook.editingPermission ===
        HandbookEditingAccess.EVERYONE_WITH_ACCESS ||
      (handbook.editingPermission === HandbookEditingAccess.SELECTED_EDITORS &&
        isEditor);

    if (!canEdit) {
      throw new ForbiddenException('У вас нет прав на редактирование хэндбука');
    }

    const column = handbook.columns[0];

    if (!column) {
      throw new NotFoundException('Колонка не найдена');
    }

    const row = await this.prisma.handbookRow.findFirst({
      where: {
        id: rowId,
        handbookId,
      },
      select: {
        id: true,
        values: true,
      },
    });

    if (!row) {
      throw new NotFoundException('Строка не найдена');
    }

    const preparedValue = this.prepareRowValues([column], {
      [columnId]: dto.value,
    });

    const values: Record<string, HandbookCellValue> = {
      ...(row.values as Record<string, HandbookCellValue>),
    };

    const value = preparedValue[columnId];

    if (value !== undefined) {
      values[columnId] = value;
    } else {
      delete values[columnId];
    }

    return this.prisma.handbookRow.update({
      where: {
        id: rowId,
      },
      data: {
        values,
      },
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

  private buildFilterWhere(
    userId: string,
    filter: HandbookListFilter,
  ): Prisma.HandbookWhereInput {
    switch (filter) {
      case HandbookListFilter.MINE:
        return {
          ownerId: userId,
        };

      case HandbookListFilter.AVAILABLE:
        return {
          ownerId: {
            not: userId,
          },
        };

      case HandbookListFilter.FAVORITES:
        return {
          favorites: {
            some: {
              userId,
            },
          },
        };

      case HandbookListFilter.ALL:
      default:
        return {};
    }
  }

  private buildSearchWhere(dto: GetHandbooksDto): Prisma.HandbookWhereInput {
    const conditions: Prisma.HandbookWhereInput[] = [];

    const name = dto.name?.trim();

    if (name) {
      conditions.push({
        name: {
          contains: name,
          mode: 'insensitive',
        },
      });
    }

    const tags = this.normalizeTags(dto.tags);

    if (tags.length) {
      conditions.push({
        tags: {
          hasEvery: tags,
        },
      });
    }

    if (!conditions.length) {
      return {};
    }

    return {
      AND: conditions,
    };
  }

  private normalizeTags(tags?: string[]): string[] {
    return [
      ...new Set(
        (tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean),
      ),
    ];
  }

  private prepareRowValues(
    columns: Array<{
      id: string;
      name: string;
      type: HandbookColumnType;
      required: boolean;
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
      }
    }

    return preparedValues;
  }
}

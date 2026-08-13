import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import {
  HandbookEditingAccess,
  HandbookVisibility,
  HandbookColumnType,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHandbookDto } from './dto/create-handbook.dto';
import { GetHandbooksDto, HandbookListFilter } from './dto/get-handbooks.dto';
import { UpdateHandbookDescriptionDto } from './dto/update-handbook-description.dto';
import { EditHandbookColumnsDto } from './dto/edit-handbook-columns.dto';

const HANDBOOKS_BATCH_SIZE = 10;

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
            options:
              column.type === HandbookColumnType.LIST
                ? (column.options ?? []).map((option) => option.trim())
                : [],
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

  async updateDescription(
    userId: string,
    handbookId: string,
    dto: UpdateHandbookDescriptionDto,
  ) {
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
      throw new ForbiddenException(
        'Изменить описание хэндбука может только владелец',
      );
    }

    return this.prisma.handbook.update({
      where: {
        id: handbookId,
      },
      data: {
        description: dto.description.trim(),
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

  async updateColumns(
    userId: string,
    handbookId: string,
    dto: EditHandbookColumnsDto,
  ) {
    const handbook = await this.prisma.handbook.findUnique({
      where: {
        id: handbookId,
      },
      select: {
        ownerId: true,
        columns: {
          select: {
            id: true,
            type: true,
          },
        },
      },
    });

    if (!handbook) {
      throw new NotFoundException('Хэндбук не найден');
    }

    if (handbook.ownerId !== userId) {
      throw new ForbiddenException(
        'Изменить атрибуты хэндбука может только владелец',
      );
    }

    const existingColumnsById = new Map(
      handbook.columns.map((column) => [column.id, column]),
    );

    const receivedColumnIds = dto.columns
      .map((column) => column.id)
      .filter((id): id is string => Boolean(id));

    if (new Set(receivedColumnIds).size !== receivedColumnIds.length) {
      throw new BadRequestException(
        'Идентификаторы атрибутов не должны повторяться',
      );
    }

    const normalizedColumns = dto.columns.map((column, position) => {
      const name = column.name.trim();

      if (!name) {
        throw new BadRequestException('Название атрибута не может быть пустым');
      }

      if (column.id) {
        const existingColumn = existingColumnsById.get(column.id);

        if (!existingColumn) {
          throw new BadRequestException(
            'Один из атрибутов не принадлежит этому хэндбуку',
          );
        }

        if (existingColumn.type !== column.type) {
          throw new BadRequestException(
            'Нельзя изменять тип существующего атрибута',
          );
        }
      }

      const options =
        column.type === HandbookColumnType.LIST
          ? [
              ...new Set(
                (column.options ?? [])
                  .map((option) => option.trim())
                  .filter(Boolean),
              ),
            ]
          : [];

      if (column.type === HandbookColumnType.LIST && options.length === 0) {
        throw new BadRequestException(
          'Для атрибута типа «Список» необходимо добавить хотя бы один вариант',
        );
      }

      return {
        ...column,
        name,
        options,
        position,
      };
    });

    const receivedIdsSet = new Set(receivedColumnIds);

    const deletedColumnIds = handbook.columns
      .filter((column) => !receivedIdsSet.has(column.id))
      .map((column) => column.id);

    return this.prisma.$transaction(async (transaction) => {
      if (deletedColumnIds.length > 0) {
        const rows = await transaction.handbookRow.findMany({
          where: {
            handbookId,
          },
          select: {
            id: true,
            values: true,
          },
        });

        await Promise.all(
          rows.map((row) => {
            const values =
              row.values &&
              typeof row.values === 'object' &&
              !Array.isArray(row.values)
                ? { ...row.values }
                : {};

            for (const columnId of deletedColumnIds) {
              delete values[columnId];
            }

            return transaction.handbookRow.update({
              where: {
                id: row.id,
              },
              data: {
                values,
              },
            });
          }),
        );

        await transaction.handbookColumn.deleteMany({
          where: {
            handbookId,
            id: {
              in: deletedColumnIds,
            },
          },
        });
      }

      for (const column of normalizedColumns) {
        if (column.id) {
          await transaction.handbookColumn.update({
            where: {
              id: column.id,
            },
            data: {
              name: column.name,
              required: column.required,
              options: column.options,
              position: column.position,
            },
          });

          continue;
        }

        await transaction.handbookColumn.create({
          data: {
            handbookId,
            name: column.name,
            type: column.type,
            required: column.required,
            options: column.options,
            position: column.position,
          },
        });
      }

      return transaction.handbook.findUniqueOrThrow({
        where: {
          id: handbookId,
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
    });
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
}

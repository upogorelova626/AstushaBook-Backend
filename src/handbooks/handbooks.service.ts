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
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHandbookDto } from './dto/create-handbook.dto';
import { GetHandbooksDto, HandbookListFilter } from './dto/get-handbooks.dto';

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
}

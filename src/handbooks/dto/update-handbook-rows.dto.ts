import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsObject,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateHandbookRowDto {
  @ApiProperty({
    description: 'UUID изменённой строки',
    format: 'uuid',
  })
  @IsUUID()
  id!: string;

  @ApiProperty({
    description: 'Все значения изменённой строки',
    type: 'object',
    additionalProperties: true,
    example: {
      'd16cc5ea-a3ef-4e3c-8de2-2cffd2774c87': 'Анастасия',
      '21fb12df-58af-4fde-a9d7-7757ff1ea72d': 22,
    },
  })
  @IsObject()
  values!: Record<string, string | number | boolean | null>;
}

export class UpdateHandbookRowsDto {
  @ApiProperty({
    description: 'Изменённые строки справочника',
    type: [UpdateHandbookRowDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => UpdateHandbookRowDto)
  rows!: UpdateHandbookRowDto[];
}

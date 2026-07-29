import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class CreateHandbookRowDto {
  @ApiProperty({
    description: 'Значения строки. Ключ — UUID колонки',
    type: 'object',
    additionalProperties: true,
    example: {
      'd16cc5ea-a3ef-4e3c-8de2-2cffd2774c87': 'Иван Иванов',
      '21fb12df-58af-4fde-a9d7-7757ff1ea72d': 25,
    },
  })
  @IsObject()
  values!: Record<string, unknown>;
}

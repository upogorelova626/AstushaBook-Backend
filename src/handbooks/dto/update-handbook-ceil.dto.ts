import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';

export class UpdateHandbookCellDto {
  @ApiProperty({
    description: 'Новое значение ячейки',
    nullable: true,
    oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
    example: 'Новое значение',
  })
  @Allow()
  value!: string | number | boolean | null;
}

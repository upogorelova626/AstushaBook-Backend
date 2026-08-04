import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class HandbookRowIdsDto {
  @ApiProperty({
    description: 'UUID строк хэндбука',
    type: [String],
    format: 'uuid',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  rowIds!: string[];
}

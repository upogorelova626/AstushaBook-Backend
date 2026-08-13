import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';

import { CreateHandbookColumnDto } from './create-handbook-column.dto';

export class EditHandbookColumnDto extends CreateHandbookColumnDto {
  @IsOptional()
  @IsUUID()
  id?: string;
}

export class EditHandbookColumnsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EditHandbookColumnDto)
  columns!: EditHandbookColumnDto[];
}

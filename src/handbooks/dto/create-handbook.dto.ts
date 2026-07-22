import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import {
  HandbookEditingAccess,
  HandbookVisibility,
} from '../../generated/prisma/enums';
import { CreateHandbookColumnDto } from './create-handbook-column.dto';

export class CreateHandbookDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/)
  systemName!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateHandbookColumnDto)
  columns!: CreateHandbookColumnDto[];

  @IsEnum(HandbookVisibility)
  visibility!: HandbookVisibility;

  @IsEnum(HandbookEditingAccess)
  editingPermission!: HandbookEditingAccess;

  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  editorIds!: string[];

  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  viewerIds!: string[];
}

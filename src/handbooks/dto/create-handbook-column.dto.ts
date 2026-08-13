import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

import { HandbookColumnType } from '../../generated/prisma/enums';

export class CreateHandbookColumnDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsEnum(HandbookColumnType)
  type!: HandbookColumnType;

  @IsBoolean()
  required!: boolean;

  @ValidateIf(
    (column: CreateHandbookColumnDto) =>
      column.type === HandbookColumnType.LIST,
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(100, { each: true })
  options?: string[];
}

import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
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
}

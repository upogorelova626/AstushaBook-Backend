import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export enum HandbookListFilter {
  ALL = 'ALL',
  MINE = 'MINE',
  AVAILABLE = 'AVAILABLE',
  FAVORITES = 'FAVORITES',
}

export class GetHandbooksDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(HandbookListFilter)
  filter: HandbookListFilter = HandbookListFilter.ALL;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset = 0;
}

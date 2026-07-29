import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class GetHandbookRowsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

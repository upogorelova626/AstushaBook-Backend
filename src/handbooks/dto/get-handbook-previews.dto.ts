import { IsArray, IsUUID } from 'class-validator';

export class GetHandbookPreviewsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];
}

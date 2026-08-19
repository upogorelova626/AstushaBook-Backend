import { IsBoolean } from 'class-validator';

export class UpdateHandbookFavoriteDto {
  @IsBoolean()
  isFavorite!: boolean;
}

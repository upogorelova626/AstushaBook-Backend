import { IsString, MaxLength } from 'class-validator';

export class UpdateHandbookDescriptionDto {
  @IsString()
  @MaxLength(1000)
  description!: string;
}

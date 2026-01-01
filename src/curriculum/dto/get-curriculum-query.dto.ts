import {
  IsInt,
  IsPositive,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetCurriculumQueryDto {
  @IsString()
  @MinLength(2)
  topic: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(12)
  class_level: number;
}

import { IsInt, IsPositive, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetTopicsQueryDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  subject_id: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(12)
  class_level: number;
}

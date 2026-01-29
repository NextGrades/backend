import {
  IsEnum,
  IsInt,
  IsOptional,
  IsBoolean,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CourseType } from 'src/academics/entities/course.entity';

export class SearchCoursesDTO {
  @IsString()
  q: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  level?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  semester?: number;

  @IsOptional()
  @IsEnum(CourseType)
  type?: CourseType;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

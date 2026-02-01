import { IsString, IsOptional } from 'class-validator';

export class SubtopicsDto {
  @IsString()
  courseCode: string;

  @IsString()
  @IsOptional()
  threadId?: string;
}

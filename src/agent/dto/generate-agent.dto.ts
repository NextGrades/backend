// src/agent/dto/quick-exercise.dto.ts
import { IsEnum, IsInt, IsString, IsOptional, Min, Max } from 'class-validator';
import { ExerciseType } from 'src/agent/interface/agent.interface';

export class QuickExerciseDto {
  @IsEnum(
    [
      'academic-spelling',
      'one-word-answer',
      'fill-in-blank',
      'correct-the-error',
    ],
    {
      message:
        'exerciseType must be one of: academic-spelling, one-word-answer, fill-in-blank, correct-the-error',
    },
  )
  exerciseType: ExerciseType;

  @IsInt()
  @Min(1)
  @Max(10)
  count: number;

  @IsString()
  userId: string;

  @IsInt()
  @Min(1)
  @Max(9) // Primary 1-6, JSS 1-3
  classLevel: number;

  @IsString()
  @IsOptional()
  threadId?: string;
}

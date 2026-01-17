import { ExerciseType } from 'src/agent/interface/agent.interface';
import z from 'zod';

// ============================================================================
// RESPONSE FORMATS - Individual Schemas
// ============================================================================

export const spellingExerciseResponseFormat = z.object({
  class_level: z.number(),
  exercise_type: z.enum(['academic-spelling']),
  instructions: z.string(),
  exercises: z.array(
    z.object({
      word: z.string(),
      difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    }),
  ),
});

export const oneWordAnswerResponseFormat = z.object({
  class_level: z.number(),
  exercise_type: z.enum(['one-word-answer']),
  instructions: z.string(),
  exercises: z.array(
    z.object({
      question: z.string(),
      correct_answer: z.string(),
      hint: z.string().optional(),
    }),
  ),
});

export const fillInBlankResponseFormat = z.object({
  class_level: z.number(),
  exercise_type: z.enum(['fill-in-blank']),
  instructions: z.string(),
  exercises: z.array(
    z.object({
      sentence_with_blank: z.string(),
      correct_answer: z.string(),
      context: z.string().optional(),
    }),
  ),
});

export const correctErrorResponseFormat = z.object({
  class_level: z.number(),
  exercise_type: z.enum(['correct-the-error']),
  instructions: z.string(),
  exercises: z.array(
    z.object({
      incorrect_statement: z.string(),
      correct_answer: z.string(),
      explanation: z.string().optional(),
    }),
  ),
});

export const responseFormatMap: Record<
  ExerciseType,
  z.ZodObject<z.ZodRawShape>
> = {
  'academic-spelling': spellingExerciseResponseFormat,
  'one-word-answer': oneWordAnswerResponseFormat,
  'fill-in-blank': fillInBlankResponseFormat,
  'correct-the-error': correctErrorResponseFormat,
};

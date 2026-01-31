import {
  spellingExerciseResponseFormat,
  oneWordAnswerResponseFormat,
  fillInBlankResponseFormat,
  correctErrorResponseFormat,
} from 'src/agent/schema/quick-exercise.schema';
import * as z from 'zod';

// src/agent/types/agent-config.type.ts
export interface AgentConfigurable {
  thread_id: string;
}

export type ConversationScope = {
  userId: string;
  conversationId: string; // NOT threadId
};

export interface AgentContext {
  user_id: string;
  class_level: number;
}

export interface AgentConfig {
  configurable: AgentConfigurable;
  context: AgentContext;
}

export interface ExerciseResponse {
  topic: string;
  class_level: number;
  instructions: string;
  exercises: Array<{
    question: string;
    type:
      | 'multiple_choice'
      | 'short_answer'
      | 'true_false'
      | 'fill_in_the_blank';
    options?: string[];
    correct_answer: string;
    related_objective: string;
  }>;
}

// Type exports
export type SpellingExercise = z.infer<typeof spellingExerciseResponseFormat>;
export type OneWordAnswerExercise = z.infer<typeof oneWordAnswerResponseFormat>;
export type FillInBlankExercise = z.infer<typeof fillInBlankResponseFormat>;
export type CorrectErrorExercise = z.infer<typeof correctErrorResponseFormat>;
export type ExerciseType =
  | 'academic-spelling'
  | 'one-word-answer'
  | 'fill-in-blank'
  | 'correct-the-error';

export type QuickExerciseResponse =
  | SpellingExercise
  | OneWordAnswerExercise
  | FillInBlankExercise
  | CorrectErrorExercise;

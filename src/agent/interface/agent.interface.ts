export interface TeachingResponse {
  topic: string;
  class_level: number;
  learner_age: number;
  explanation: string;
  examples: string[];
  key_takeaways: string[];
  covered_objectives: string[];
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

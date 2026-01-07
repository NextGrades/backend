import { tool } from 'langchain';
import * as z from 'zod';
import { CurriculumService } from 'src/curriculum/curriculum.service';
import { NerdcCurriculumItemSchema } from '../schema/teaching-agent.schema';

export function createCurriculumTools(curriculumService: CurriculumService) {
  const getNerdcCurriculum = tool(
    async ({ topic, class_level }: { topic: string; class_level: number }) => {
      const curriculum = await curriculumService.getCurriculum({
        topic,
        classLevel: class_level,
      });

      if (!curriculum.length) {
        throw new Error('No curriculum found');
      }

      const parsed = NerdcCurriculumItemSchema.safeParse(curriculum[0]);
      if (!parsed.success) {
        throw new Error('Invalid curriculum structure');
      }

      return {
        class_level: parsed.data.classlevel,
        subject: parsed.data.subject,
        topic: parsed.data.name,
        performance_objectives: parsed.data.performanceObjectives,
        content: parsed.data.content,
        teacher_activities: parsed.data.teacherActivities,
        pupil_activities: parsed.data.pupilActivities,
        materials: parsed.data.materials,
        evaluation_guide: parsed.data.evaluationGuide,
      };
    },
    {
      name: 'get_nerdc_curriculum',
      description: 'Retrieve official NERDC curriculum objectives',
      schema: z.object({
        topic: z.string(),
        class_level: z.number(),
      }),
    },
  );

  const getExerciseTypeSchema = tool(
    ({ exercise_type }) => {
      const schemaMap: Record<
        string,
        {
          name: string;
          description: string;
          required_fields: string[];
          field_descriptions: Record<string, string>;
          examples: any[];
          rules: string[];
        }
      > = {
        'academic-spelling': {
          name: 'Academic Spelling',
          description: 'Student listens to a word and spells it',
          required_fields: ['word', 'correct_answer'],
          field_descriptions: {
            word: 'The word to be spelled (will be played as audio to the student)',
            correct_answer:
              "The correct spelling of the word (must match 'word' exactly)",
            difficulty: 'Optional difficulty level: easy, medium, or hard',
          },
          examples: [
            {
              word: 'photosynthesis',
              correct_answer: 'photosynthesis',
              difficulty: 'hard',
            },
            {
              word: 'elephant',
              correct_answer: 'elephant',
              difficulty: 'easy',
            },
            {
              word: 'government',
              correct_answer: 'government',
              difficulty: 'medium',
            },
          ],
          rules: [
            'Return ONLY the word field - no sentences or questions',
            'The correct_answer must match the word exactly',
            'Do NOT include the word in a sentence',
            'Choose words appropriate for the class level',
          ],
        },
        'one-word-answer': {
          name: 'One Word Answer',
          description: 'Student answers a question with a single word',
          required_fields: ['question', 'correct_answer'],
          field_descriptions: {
            question:
              'A clear, simple question that can be answered with one word',
            correct_answer: 'The single-word answer to the question',
            hint: "Optional hint to help the student if they're stuck",
          },
          examples: [
            {
              question: 'What gas do plants release during photosynthesis?',
              correct_answer: 'oxygen',
            },
            {
              question: 'What is the capital of Nigeria?',
              correct_answer: 'Abuja',
            },
            {
              question: 'What shape has four equal sides?',
              correct_answer: 'square',
              hint: "It's not a rectangle",
            },
          ],
          rules: [
            'Question must be clear and unambiguous',
            'Answer must be exactly ONE word',
            'No compound answers or phrases',
            'Use simple, direct language',
          ],
        },
        'fill-in-blank': {
          name: 'Fill in the Blank',
          description: 'Student fills in a missing word in a sentence',
          required_fields: ['sentence_with_blank', 'correct_answer'],
          field_descriptions: {
            sentence_with_blank:
              "A sentence with exactly ONE blank marked as '_____'",
            correct_answer: 'The word or phrase that correctly fills the blank',
            context:
              "Optional context or subject area (e.g., 'Geography', 'Science')",
          },
          examples: [
            {
              sentence_with_blank: 'The capital of Nigeria is _____.',
              correct_answer: 'Abuja',
            },
            {
              sentence_with_blank: 'Plants make their own food through _____.',
              correct_answer: 'photosynthesis',
              context: 'Science',
            },
            {
              sentence_with_blank: '₦100 + ₦50 = _____',
              correct_answer: '₦150',
              context: 'Mathematics',
            },
          ],
          rules: [
            "Use exactly ONE blank marked as '_____'",
            'The sentence should make sense with the blank filled',
            'Answer should be a single word or short phrase',
            'Use Nigerian context (Naira, Nigerian names, places)',
          ],
        },
        'correct-the-error': {
          name: 'Correct the Error',
          description: 'Student identifies and corrects an incorrect statement',
          required_fields: ['incorrect_statement', 'correct_answer'],
          field_descriptions: {
            incorrect_statement:
              'A statement containing an obvious, single error',
            correct_answer: 'The corrected statement or the correct fact',
            explanation:
              'Optional brief explanation of why the original was wrong',
          },
          examples: [
            {
              incorrect_statement: 'Water boils at 50°C',
              correct_answer: 'Water boils at 100°C',
              explanation: 'Water boils at 100 degrees Celsius at sea level',
            },
            {
              incorrect_statement: 'Nigeria has 35 states',
              correct_answer: 'Nigeria has 36 states',
            },
            {
              incorrect_statement: 'The sun revolves around the Earth',
              correct_answer: 'The Earth revolves around the sun',
              explanation: 'Heliocentric model',
            },
          ],
          rules: [
            'Include exactly ONE obvious error in the statement',
            'Error should be factual, not grammatical',
            'Correct answer should be clear and unambiguous',
            'Use age-appropriate facts',
          ],
        },
      };

      const schema = schemaMap[exercise_type];

      if (!schema) {
        return {
          error: `Unknown exercise type: ${exercise_type}`,
          available_types: Object.keys(schemaMap),
        };
      }

      return schema;
    },
    {
      name: 'get_exercise_type_schema',
      description:
        'Get the detailed schema, rules, and examples for a specific exercise type. Call this BEFORE generating exercises to understand the exact format required.',
      schema: z.object({
        exercise_type: z
          .string()
          .describe(
            "The exercise type to get schema for (e.g., 'academic-spelling', 'one-word-answer')",
          ),
      }),
    },
  );

  return { getNerdcCurriculum, getExerciseTypeSchema };
}

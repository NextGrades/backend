import { z } from 'zod';

export const coursePrompt = `
You are an expert university-level teaching assistant and academic tutor.

You have access to an official tool that retrieves structured university
course subtopic data, including:
- course code and title
- syllabus reference
- topic title and description
- prerequisites
- teaching order and exam frequency

CRITICAL RULES:
1. You MUST base all teaching and exercises strictly on the retrieved
   subtopic data.
2. If subtopic data is not already available, you MUST call the tool
   "get_subtopic_data" to retrieve it before responding.
3. Do NOT invent syllabus items, topics, or course metadata.
4. Do NOT mention tools, APIs, schemas, or internal reasoning.

TEACHING GUIDELINES:
- Teach at appropriate depth for the course level.
- Explain step-by-step: intuition → theory → academic relevance.
- Use engineering or real-world academic examples where relevant.
- Avoid oversimplification meant for children.
- Stay strictly within the syllabus reference and topic description.

EXERCISE GUIDELINES:
- Every question must map directly to the syllabus reference or topic title.
- Match difficulty to exam frequency and course level.
- Include exam-style questions (theory, calculations, reasoning).
- Always provide correct answers.
- Explicitly state the syllabus item each question tests.

OUTPUT RULES:
- When teaching, respond ONLY in the teaching response format.
- When generating exercises, respond ONLY in the exercise response format.
`;

const CourseRefSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
});

export const SubtopicSchema = z.object({
  id: z.string(),

  course: CourseRefSchema,

  syllabusReference: z.string(),
  title: z.string(),
  description: z.string(),

  teachingOrder: z.number(),

  examFrequency: z.string(),
  // or, if you want to lock it down:
  // examFrequency: z.enum(["low", "medium", "high"]),

  prerequisites: z.array(z.string()),

  isActive: z.boolean(),

  createdAt: z.string(), // ISO date string
  updatedAt: z.string(), // ISO date string
});

export type Subtopic = z.infer<typeof SubtopicSchema>;

export const courseTeachingResponseFormat = z.object({
  courseCode: z.string(),
  courseTitle: z.string(),

  // OPTIONAL if you later fetch full course data
  level: z.number().optional(),
  creditUnits: z.number().optional(),

  topic: z.string(),

  syllabusReference: z.string(),

  explanation: z.string(),

  keyConcepts: z.array(z.string()),

  workedExamples: z.array(z.string()),

  practicalApplications: z.array(z.string()),

  syllabusCoverage: z.array(z.string()),
});

export type CourseTeachingResponse = z.infer<
  typeof courseTeachingResponseFormat
>;

export const courseExerciseResponseFormat = z.object({
  courseCode: z.string(),
  level: z.number(),

  instructions: z.string(),

  exercises: z.array(
    z.object({
      question: z.string(),
      type: z.enum([
        'theory',
        'calculation',
        'conceptual',
        'short_answer',
        'true_false',
      ]),
      correctAnswer: z.string(),
      relatedSyllabusItem: z.string(),
    }),
  ),
});

export type courseExerciseResponse = z.infer<
  typeof courseExerciseResponseFormat
>;

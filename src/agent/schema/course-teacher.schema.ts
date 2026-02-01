import { z } from 'zod';

export const courseTutorPrompt = `
You are an expert university-level teaching assistant and academic tutor.

You have access to an official tool that retrieves structured university
course subtopic data, including:
- course code and title
- syllabus reference
- topic title and description
- prerequisites
- teaching order and exam frequency

CRITICAL RULES:
1. You MUST base all teaching strictly on the retrieved
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

OUTPUT RULES:
- Respond ONLY in the course teaching response format.
`;

export const followUpSystemPrompt = `
You are a follow-up teaching assistant. A teaching agent has already generated 
structured course tutorial for a student. Your role is to:

1. FIRST, call get_generated_content to retrieve what was taught.
2. Answer the student's questions strictly based on that content.
3. If they ask for clarification on examples, walk through them step by step.
4. If they ask something outside the scope of the generated content, 
   acknowledge it and redirect them back to the current topic.
5. Do NOT re-teach the full content — only address what they're asking about.

OUTPUT RULES:
- respond with your answer/explanation in the specified response format.
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

export const followUpResponseFormat = z.object({
  answer: z.string(),
});

export type courseExerciseResponse = z.infer<
  typeof courseExerciseResponseFormat
>;

export const contextSchema = z.object({
  userId: z.string(),
  conversationId: z.string(),
});

export const followUpInputSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    }),
  ),
  previousLesson: courseTeachingResponseFormat,
});

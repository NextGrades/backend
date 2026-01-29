import z from 'zod';

export const subtopicPrompt = `
You are a senior university lecturer with extensive experience teaching
undergraduate courses using standard international textbooks.

Your task is to expand a high-level university course syllabus item into
a list of commonly taught subtopics.

Rules:
- Use only subtopics that appear in standard undergraduate textbooks.
- Match the depth strictly to the stated course level.
- Avoid advanced material meant for higher-level courses.
- Follow the teaching order commonly used in textbooks.
- Do not invent niche, modern, or research-level topics.
- Be conservative: include only what most lecturers would teach.

You are structuring academic content, not teaching it.

Do NOT mention textbooks, tools, APIs, or internal reasoning.
`;

export const subtopicGeneratorInputSchema = z.object({
  course_code: z.string().min(3),
  course_id: z.uuid(),
  course_title: z.string().min(5),
  level: z.number().int().min(100).max(600),
  credit_units: z.number().int().min(1).max(6),
  syllabus_item: z.string().min(10),
});

export type SubtopicGeneratorInput = z.infer<
  typeof subtopicGeneratorInputSchema
>;

export const subtopicGeneratorResponseFormat = z.object({
  course_code: z.string(),
  syllabus_item: z.string(),
  course_id: z.string(),

  derived_subtopics: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      teaching_order: z.number(),
      exam_frequency: z.enum(['high', 'medium', 'low']),
      prerequisites: z.array(z.string()),
    }),
  ),
});

export type SubtopicGeneratorResponse = z.infer<
  typeof subtopicGeneratorResponseFormat
>;

import { tool } from 'langchain';
import { AcademicsService } from 'src/academics/academics.service';
import {
  Subtopic,
  SubtopicSchema,
} from 'src/agent/schema/course-teacher.schema';

import * as z from 'zod';

// type AgentContext = {
//   userId: string;
//   conversationId: string;
// };

type CreateCourseToolsArgs = {
  academicSvc: AcademicsService;
};

export function createCourseTools(args: CreateCourseToolsArgs) {
  const getSubtopicData = tool(
    async ({ subtopicId }) => {
      const data = await args.academicSvc.getSubtopicById(subtopicId);

      if (!data.createdAt) throw new Error('Course not found');

      const { course, createdAt, updatedAt, examFrequency, ...rest } = data;

      const payload: Subtopic = {
        ...rest,

        course: {
          id: course.id,
          code: course.code,
          title: course.title,
        },

        examFrequency: String(examFrequency),

        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      };

      const parsed = SubtopicSchema.safeParse(payload);

      if (!parsed.success) {
        throw new Error('Invalid course structure');
      }

      return parsed.data;
    },
    {
      name: 'get_subtopic_data',
      description: 'Retrieve official university course syllabus and details',
      schema: z.object({
        subtopicId: z
          .string()
          .describe('Subtopic ID, e.g. 32d2536f-0f22-40a2-b4cb-d2193420b220'),
      }),
    },
  );

  return { getSubtopicData };
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CreateCourseDto,
  CreateCourseSubtopicDto,
} from 'src/academics/dtos/create-course.dto';
import { CourseSubtopic } from 'src/academics/entities/course-subtopic.entity';
import { Course } from 'src/academics/entities/course.entity';
import { SearchCoursesFilters } from 'src/academics/types';
import { Repository } from 'typeorm';

@Injectable()
export class AcademicsService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(CourseSubtopic)
    private readonly courseSubtopicRepo: Repository<CourseSubtopic>,
  ) {}
  async createCourse(data: CreateCourseDto): Promise<Course> {
    const structured = this.splitByFullStop(data.syllabus);

    const course = this.courseRepo.create({
      ...data,
      syllabus: data.syllabus,
      syllabusStructured: structured,
    });

    return this.courseRepo.save(course);
  }
  async addNewCourseSubtopics(
    dtos: CreateCourseSubtopicDto[],
  ): Promise<CourseSubtopic[]> {
    const subtopics: CourseSubtopic[] = [];

    for (const dto of dtos) {
      const subtopic = this.courseSubtopicRepo.create({
        ...dto,
        course: { id: dto.courseId },
      });

      subtopics.push(subtopic);
    }

    return this.courseSubtopicRepo.save(subtopics); // saves all in one batch
  }
  // async addNewCourseSubtopics(
  //   data: CreateCourseSubtopicDto,
  // ): Promise<CourseSubtopic> {
  //   const course = await this.getCourseByCode(data.courseId);
  //   if (!course) {
  //     throw new NotFoundException(
  //       `Course with id ${data.courseCode} not found`,
  //     );
  //   }
  //   const courseSubtopics = this.courseSubtopicRepo.create({
  //     ...data,
  //     course: { id: course.id },
  //   });
  //   return this.courseSubtopicRepo.save(courseSubtopics);
  // }

  async generateCourseSubTopics(courseCode: string): Promise<string[]> {
    const course = await this.getCourseByCode(courseCode);

    if (!course.syllabusStructured || course.syllabusStructured.length === 0) {
      throw new Error(
        `Course with code ${courseCode} does not have a structured syllabus`,
      );
    }

    // For simplicity, we return the structured syllabus as subtopics
    return course.syllabusStructured;
  }

  async getCourseByCode(code: string): Promise<Course> {
    const course = await this.courseRepo.findOneBy({ code });
    if (!course) {
      throw new NotFoundException(`Course with code ${code} not found`);
    }
    return course;
  }

  async getCourseSubtopicById(courseId: string): Promise<CourseSubtopic> {
    const courseSubtopic = await this.courseSubtopicRepo.findOne({
      where: { id: courseId },
      relations: {
        course: true,
      },
      select: {
        course: {
          id: true,
          code: true,
          title: true,
        },
      },
    });

    if (!courseSubtopic) {
      throw new NotFoundException(
        `Course with code ${courseId} does not have a structured syllabus`,
      );
    }

    // For simplicity, we return the structured syllabus as subtopics
    return courseSubtopic;
  }

  async searchCourses(
    query: string,
    filters: SearchCoursesFilters = {},
  ): Promise<Course[]> {
    const qb = this.courseRepo.createQueryBuilder('c');

    // Define tsquery once (english config)
    const tsQuery = `plainto_tsquery('english', :query)`;

    qb.addSelect(`ts_rank(c.search_vector, ${tsQuery})`, 'rank')
      .where(`c.search_vector @@ ${tsQuery}`)
      .setParameter('query', query);

    // Optional filters
    if (filters.level !== undefined) {
      qb.andWhere('c.level = :level', { level: filters.level });
    }

    if (filters.semester !== undefined) {
      qb.andWhere('c.semester = :semester', {
        semester: filters.semester,
      });
    }

    if (filters.type !== undefined) {
      qb.andWhere('c.type = :type', { type: filters.type });
    }

    if (filters.isActive !== undefined) {
      qb.andWhere('c.is_active = :isActive', {
        isActive: filters.isActive,
      });
    }

    qb.orderBy('rank', 'DESC');

    // console.log(qb.getSql());

    return qb.getMany();
  }

  splitByFullStop(text: string): string[] {
    return text
      .replace(/\n/g, ' ')
      .split('.')
      .map((part) => part.trim())
      .filter(Boolean);
  }
}

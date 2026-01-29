import { CourseType } from 'src/academics/entities/course.entity';

export type SearchCoursesFilters = {
  level?: number;
  semester?: number;
  type?: CourseType;
  isActive?: boolean;
};

import { CourseType } from 'src/academics/entities/course.entity';

export type SearchCoursesFilters = {
  level?: number;
  semester?: number;
  type?: CourseType;
  isActive?: boolean;
};

export interface CourseListItem {
  id: string;
  courseCode: string;
  title: string;
  field: string | null;
  subtopicCount: number;
  isActive: boolean;
}

export interface PaginatedCoursesResponse {
  data: CourseListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

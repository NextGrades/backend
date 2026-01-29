import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AcademicsService } from './academics.service';
import { ok } from 'src/common/http/response.helpers';
import {
  BulkCreateCourseSubtopicsDto,
  CreateCourseDto,
} from 'src/academics/dtos/create-course.dto';
import { SearchCoursesDTO } from 'src/academics/dtos/search-course.dto';

@Controller('academics')
export class AcademicsController {
  constructor(private readonly academicsService: AcademicsService) {}

  @Post('courses')
  async createCourse(@Body() dto: CreateCourseDto) {
    const data = await this.academicsService.createCourse(dto);
    return ok(data, `creation successful`);
  }

  @Get('courses/search')
  async searchCourses(@Query() dto: SearchCoursesDTO) {
    const data = await this.academicsService.searchCourses(dto.q, dto);
    return ok(data, `found ${data.length} courses`);
  }

  @Get('courses/:code')
  async getCourseByCode(@Param('code') code: string) {
    const data = await this.academicsService.getCourseByCode(code);
    return ok(data, `course ${code} data retrieved successfully`);
  }

  @Get('courses/subtopics/:id')
  async getCourseSubTopicById(@Param('id') id: string) {
    const data = await this.academicsService.getCourseSubtopicById(id);
    return ok(data, `Subtopic ${id} data retrieved successfully`);
  }

  @Post('courses/subtopics/bulk')
  async addNewCourseSubtopicBulk(@Body() dto: BulkCreateCourseSubtopicsDto) {
    const data = await this.academicsService.addNewCourseSubtopics(
      dto.subtopics,
    );
    return ok(data, `course subtopics added successfully`);
  }

  // @Post('courses/subtopics')
  // async addNewCourseSubtopic(@Body() dto: CreateCourseSubtopicDto) {
  //   const data = await this.academicsService.addNewCourseSubtopics(dto);
  //   return ok(data, `course subtopic added successfully`);
  // }
}

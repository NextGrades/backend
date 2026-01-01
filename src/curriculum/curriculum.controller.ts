import { Controller, Get, Query } from '@nestjs/common';
import { CurriculumService } from './curriculum.service';
import { ok } from 'src/common/http/response.helpers';
import { GetTopicsQueryDto } from 'src/curriculum/dto/get-topics-query.dto';
import { GetCurriculumQueryDto } from 'src/curriculum/dto/get-curriculum-query.dto';

@Controller('curriculum')
export class CurriculumController {
  constructor(private readonly curriculumService: CurriculumService) {}

  @Get('subjects')
  async getSubjects() {
    const data = await this.curriculumService.getSubjects();
    return ok(data);
  }

  @Get('topics')
  async getTopics(@Query() query: GetTopicsQueryDto) {
    const data = await this.curriculumService.getTopicsBySubjectAndClassLevel(
      query.subject_id,
      query.class_level,
    );
    return ok(data, `found ${data.length} items`);
  }

  @Get('objectives')
  async getCurriculum(@Query() query: GetCurriculumQueryDto) {
    const data = await this.curriculumService.getCurriculum({
      topic: query.topic,
      classLevel: query.class_level,
    });

    return ok(data, `found ${data.length} items`);
  }
}

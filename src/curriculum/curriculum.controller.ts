import { Controller, Get } from '@nestjs/common';
import { CurriculumService } from './curriculum.service';

@Controller('curriculum')
export class CurriculumController {
  constructor(private readonly curriculumService: CurriculumService) {}

  @Get('subjects')
  getSubjects() {
    return this.curriculumService.getSubjects();
  }
}

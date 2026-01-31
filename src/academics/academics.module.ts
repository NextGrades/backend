import { Module } from '@nestjs/common';
import { AcademicsService } from './academics.service';
import { AcademicsController } from './academics.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from 'src/academics/entities/course.entity';
import { CourseSubtopic } from 'src/academics/entities/course-subtopic.entity';
import { Field } from 'src/academics/entities/field.entity';
import { EducationStandard } from 'src/academics/entities/edu-standard.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      CourseSubtopic,
      Field,
      EducationStandard,
    ]),
  ],
  controllers: [AcademicsController],
  providers: [AcademicsService],
  exports: [AcademicsService],
})
export class AcademicsModule {}

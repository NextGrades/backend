import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassLevel } from 'src/curriculum/entities/class-level.entity';
import { Subject } from 'src/curriculum/entities/subject.entity';
import { SubTheme } from 'src/curriculum/entities/sub-theme.entity';
import { Theme } from 'src/curriculum/entities/theme.entity';
import { Topic } from 'src/curriculum/entities/topic.entity';
import { CurriculumController } from 'src/curriculum/curriculum.controller';
import { CurriculumService } from 'src/curriculum/curriculum.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subject, ClassLevel, Theme, SubTheme, Topic]),
  ],
  controllers: [CurriculumController],
  providers: [CurriculumService],
})
export class CurriculumModule {}

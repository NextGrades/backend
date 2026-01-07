import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Subject } from 'src/curriculum/entities/subject.entity';
import { Topic } from 'src/curriculum/entities/topic.entity';
import { AgentTopicObjective } from 'src/curriculum/interfaces/agent.interface';
import { Repository } from 'typeorm';

interface CurriculumQuery {
  subject?: string;
  classLevel?: number;
  topic?: string;
}

@Injectable()
export class CurriculumService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
    @InjectRepository(Topic)
    private readonly topicRepo: Repository<Topic>,
  ) {}

  async getSubjects() {
    return this.subjectRepo
      .createQueryBuilder('s')
      .select(['s.id', 's.name', 's.slug'])
      .orderBy('s.name', 'ASC')
      .getMany();
  }

  async getTopicsBySubjectAndClassLevel(subjectId: number, classLevel: number) {
    return this.topicRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.subTheme', 'st')
      .leftJoinAndSelect('st.theme', 'th')
      .leftJoinAndSelect('th.classLevel', 'cl')
      .leftJoinAndSelect('th.subject', 's')
      .where('s.id = :subjectId', { subjectId })
      .andWhere('cl.sort_order = :classLevel', { classLevel })
      .orderBy('t.name', 'ASC')
      .getMany();
  }

  async getCurriculum(query: CurriculumQuery): Promise<AgentTopicObjective[]> {
    const { topic, classLevel } = query;

    console.log('CurriculumService.getCurriculum - query:', query);

    const data = await this.topicRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.subTheme', 'st')
      .leftJoinAndSelect('st.theme', 'th')
      .leftJoinAndSelect('th.classLevel', 'cl')
      .leftJoinAndSelect('th.subject', 's')
      .where('t.name ILIKE :topic', { topic: `%${topic}%` })
      .andWhere('cl.sort_order = :classLevel', { classLevel })
      .getMany();

    // console.log('CurriculumService.getCurriculum - data:', data);

    const learningObjectives = data.map((topic) => ({
      id: topic.id,
      classlevel: topic.subTheme.theme.classLevel.sortOrder,
      subject: topic.subTheme.theme.subject.name,
      name: topic.name,
      performanceObjectives: topic.performanceObjectives,
      teacherActivities: topic.teacherActivities,
      pupilActivities: topic.pupilActivities,
      materials: topic.materials,
      content: topic.content,
      evaluationGuide: topic.evaluationGuide,
    }));

    console.log(
      'CurriculumService.getCurriculum - learningObjectives:',
      learningObjectives,
    );
    return learningObjectives;
  }

  // async getLearningObjectives(query: CurriculumQuery) {
  //   console.log(query);
  //   const results = await this.getCurriculum(query);

  //   if (results.length === 0) {
  //     return { found: false, objectives: [], content: [] };
  //   }

  //   const first = results[0];
  //   return {
  //     found: true,
  //     topic: first.name,
  //     classLevel: first.subTheme?.theme?.classLevel?.name,
  //     subject: first.subTheme?.theme?.subject?.name,
  //     objectives: first.performanceObjectives,
  //     content: first.content,
  //   };
  // }
}

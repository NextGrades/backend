import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Subject } from 'src/curriculum/entities/subject.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CurriculumService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
  ) {}

  async getSubjects() {
    return this.subjectRepo
      .createQueryBuilder('s')
      .select(['s.id', 's.name', 's.slug'])
      .orderBy('s.name', 'ASC')
      .getMany();
  }
}

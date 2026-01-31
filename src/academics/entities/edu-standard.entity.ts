import { Entity, PrimaryGeneratedColumn, Index, Column } from 'typeorm';

@Entity('education_standards')
export class EducationStandard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  name: string;

  @Column({ nullable: true })
  country?: string;
}

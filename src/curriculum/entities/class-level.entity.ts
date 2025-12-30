import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Theme } from './theme.entity';

@Entity({ name: 'class_levels' })
export class ClassLevel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column()
  sortOrder: number;

  @OneToMany(() => Theme, (theme: Theme) => theme.classLevel)
  themes: Theme[];
}

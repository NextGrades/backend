import { IsString, IsNotEmpty } from 'class-validator';

export class TeachAgentDto {
  @IsString()
  @IsNotEmpty()
  topicId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}

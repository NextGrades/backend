import { IsString, IsNotEmpty } from 'class-validator';

export class TeachAgentDto {
  @IsString()
  @IsNotEmpty()
  topicId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class AskAgentDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  conversationId: string;
  @IsString()
  @IsNotEmpty()
  question: string;
}

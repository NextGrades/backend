import { IsString, IsNotEmpty } from 'class-validator';

export class TeachAgentDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}

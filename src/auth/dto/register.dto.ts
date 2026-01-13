import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  firstName: string;

  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;

  @Type(() => Number)
  @IsInt()
  @Min(3)
  @Max(12)
  classLevel: number;
}

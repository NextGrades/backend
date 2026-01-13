import { User } from 'src/users/entities/user.entity';

export type PublicUser = Omit<User, 'password' | 'updatedAt'>;

export interface CreateUserResponse {
  message: string;
  data: PublicUser;
}

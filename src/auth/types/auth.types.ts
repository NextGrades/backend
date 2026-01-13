import { User } from 'src/users/entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

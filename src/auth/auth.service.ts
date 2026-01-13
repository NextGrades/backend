import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';

import { LoginDto } from 'src/auth/dto/login-dto';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { AuthResponse, JwtPayload } from 'src/auth/types/auth.types';
import { HttpLogger } from 'src/logger/http-logger.service';

import { User } from 'src/users/entities/user.entity';
import { PublicUser } from 'src/users/user.types';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  private readonly context = AuthService.name;
  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
    private readonly logger: HttpLogger,
  ) {}

  /* -------------------- REGISTER -------------------- */
  async register(dto: RegisterDto): Promise<PublicUser> {
    const user = await this.userService.create(dto);
    this.logger.log(`New user registered: ${user.email}`, this.context);
    return user;
  }

  /* -------------------- LOGIN -------------------- */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.userService.findByEmail(dto.email);

    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  /* -------------------- TOKEN BUILDER -------------------- */
  private async buildAuthResponse(user: User): Promise<AuthResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken: string = await this.jwtService.signAsync(payload);

    const refreshToken: string = await this.jwtService.signAsync(payload);

    return {
      user,
      accessToken,
      refreshToken,
    } satisfies AuthResponse;
  }
}

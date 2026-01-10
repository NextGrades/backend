import { Injectable } from '@nestjs/common';
import { RequestLoggerService } from 'src/logger/request-logger.service';

@Injectable()
export class AuthService {
  constructor(private readonly logger: RequestLoggerService) {}
  findAll() {
    this.logger.log('Fetching all auth', AuthService.name);
    return `This action returns all auth`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}

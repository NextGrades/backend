// src/cache/redis-cache.module.ts
import { Module, Global, OnModuleInit, Inject } from '@nestjs/common';
import { CACHE_MANAGER, CacheModule } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';
import { SystemLogger } from 'src/logger/system-logger.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get('REDIS_PORT', 6379),
        password: configService.get('REDIS_PASSWORD', ''),
        ttl: configService.get('CACHE_TTL', 300), // 5 minutes default
      }),
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule implements OnModuleInit {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly logger: SystemLogger,
  ) {}

  async onModuleInit() {
    try {
      // Test the connection by setting and getting a value
      await this.cacheManager.set('health-check', 'ok', 10);
      const result = await this.cacheManager.get<string>('health-check');

      if (result === 'ok') {
        this.logger.log({
          event: 'redis_health_check',
          status: 'connected',
          message: 'Redis cache connection established successfully',
        });
      } else {
        this.logger.warn({
          event: 'redis_health_check',
          status: 'unexpected_value',
          message:
            'Redis cache connected but health check returned unexpected value',
          result,
        });
      }
    } catch (error) {
      this.logger.error({
        event: 'redis_health_check',
        status: 'failed',
        message: 'Redis cache connection failed',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
}

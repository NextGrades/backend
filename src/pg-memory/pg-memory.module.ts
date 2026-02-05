import { Module, FactoryProvider } from '@nestjs/common';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';

import { InMemoryStore } from '@langchain/langgraph';
import { ConfigService } from '@nestjs/config';
import { RedisStore } from 'lib/redis-store';

export const CHECKPOINTER = Symbol('CHECKPOINTER');
export const MEMORY_STORE = Symbol('MEMORY_STORE');
export const REDIS_MEMORY_STORE = Symbol('REDIS_MEMORY_STORE');

const CheckpointerProvider: FactoryProvider = {
  provide: CHECKPOINTER,
  useFactory: async (config: ConfigService) => {
    const saver = PostgresSaver.fromConnString(
      config.get<string>('DATABASE_URL')!,
    );

    await saver.setup();
    return saver;
  },
  inject: [ConfigService],
};

const MemoryStoreProvider: FactoryProvider = {
  provide: MEMORY_STORE,
  useFactory: () => {
    return new InMemoryStore();
  },
};

const RedisMemoryStoreProvider: FactoryProvider = {
  provide: REDIS_MEMORY_STORE,
  useFactory: async (config: ConfigService) => {
    const store = await RedisStore.fromConnString(
      config.get<string>('REDIS_URL')!,
    );

    return store;
  },
  inject: [ConfigService],
};

@Module({
  providers: [
    CheckpointerProvider,
    MemoryStoreProvider,
    RedisMemoryStoreProvider,
  ],
  exports: [CHECKPOINTER, MEMORY_STORE, REDIS_MEMORY_STORE],
})
export class PgMemoryModule {}

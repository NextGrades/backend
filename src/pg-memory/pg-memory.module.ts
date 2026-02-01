// postgres-memory.module.ts
import { Module, FactoryProvider } from '@nestjs/common';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { InMemoryStore } from '@langchain/langgraph';
import { ConfigService } from '@nestjs/config';

export const CHECKPOINTER = Symbol('CHECKPOINTER');
export const MEMORY_STORE = Symbol('MEMORY_STORE');

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
  useFactory: () => new InMemoryStore(),
};

@Module({
  providers: [CheckpointerProvider, MemoryStoreProvider],
  exports: [CHECKPOINTER, MEMORY_STORE],
})
export class PgMemoryModule {}

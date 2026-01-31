// postgres-memory.module.ts
import { Module, FactoryProvider } from '@nestjs/common';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { InMemoryStore } from '@langchain/langgraph';
import { ConfigService } from '@nestjs/config';

export const CHECKPOINTER = 'CHECKPOINTER';
export const MEMORY_STORE = 'MEMORY_STORE';

const CheckpointerProvider: FactoryProvider = {
  provide: CHECKPOINTER,
  useFactory: async (configService: ConfigService) => {
    const dbUri = configService.get<string>('DATABASE_URL')!;
    const checkpointer = PostgresSaver.fromConnString(dbUri);
    await checkpointer.setup(); // runs migrations
    return checkpointer;
  },
  inject: [ConfigService],
};

const MemoryStoreProvider: FactoryProvider = {
  provide: MEMORY_STORE,
  useFactory: () => {
    // JS LangGraph ONLY supports in-memory store
    return new InMemoryStore();
  },
};

@Module({
  providers: [CheckpointerProvider, MemoryStoreProvider],
  exports: [CHECKPOINTER, MEMORY_STORE],
})
export class PgMemoryModule {}

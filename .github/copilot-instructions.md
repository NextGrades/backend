# NextGrade AI Coding Agent Instructions

## Project Overview
**NextGrade** is an educational platform with a full-stack architecture:
- **Backend**: NestJS API (`nextgrade-backend/`) - handles curriculum, AI teaching agents, audio synthesis, user auth
- **Frontend**: React PWA (`nextgrades-pwa/`) - file-based routing, TanStack Query for data fetching

The system enables personalized learning through LangChain agents that teach lessons and generate exercises based on Nigerian curriculum.

## Architecture & Data Flow

### Backend Structure (NestJS)
The backend is **modular** with these core domains:
- **Auth** (`src/auth/`) - JWT-based authentication, registers users
- **Users** (`src/users/`) - user profile management, age tracking for agent context
- **Curriculum** (`src/curriculum/`) - hierarchical structure: Subject → Theme → SubTheme → Topic (from NERDC database)
- **Agent** (`src/agent/`) - LangChain-powered teaching & exercise generation; two agents: teaching agent (explains topics) and exercise agent (generates quiz/problems)
- **Audio** (`src/audio/`) - text-to-speech streaming via `msedge-tts`

**Key flows:**
1. User registers → JWT issued
2. Client fetches curriculum hierarchy via `/curriculum` endpoints
3. Client requests teaching content/exercises via `/agent` endpoints → Agent uses curriculum data + user age to customize responses
4. Audio endpoint `/audio/speak` streams MP3 (streaming, not buffered)

### Frontend Architecture (React)
- **File-based routing**: `src/routes/` auto-generates routes (TanStack Router)
- **Root layout**: `__root.tsx` wraps all pages with Header + TanStack DevTools
- **Data fetching patterns**:
  - **Route loaders** (`fetchSubjects()`) - pre-fetch data before rendering
  - **React Query** - optional, for mutations/background updates (configured in `integrations/tanstack-query/`)
- **Key routes**:
  - `/lesson/subjects/` - list all subjects
  - `/lesson/subjects/$subjectId` - topics for subject
  - `/lesson/topics/$topicId` - detailed learning page with exercises
  - `/quick-exercises/$exerciseSlug` - individual exercise renderer

**API client**: `src/common/api/axios.ts` - centralized axios instance with base URL from env vars

## Critical Developer Workflows

### Starting Development
**Backend:**
```bash
cd nextgrade-backend
npm install
npm run start:dev          # watch mode with hot reload
# Health check: GET http://localhost:3000/health
```

**Frontend:**
```bash
cd nextgrades-pwa
npm install
npm run dev                # Vite dev server on :5173
```

### Database & Migrations (Backend)
```bash
npm run migration:generate -- --name DescribeChange    # Generate from schema changes
npm run migration:run                                   # Apply pending migrations
npm run migration:revert                                # Rollback last migration
```
Uses TypeORM with PostgreSQL (connection via `DATABASE_URL` env var). **Never use `synchronize: true` in production**; migrations are mandatory.

### Testing
```bash
# Backend
npm run test              # unit tests
npm run test:e2e          # integration tests
npm run test:cov          # coverage

# Frontend
npm run test              # Vitest
```

### Production Build & Docker
```bash
# Backend
npm run build             # Output to dist/
npm run start:prod        # Run compiled version

# Frontend
npm run build && tsc      # Vite build + TS check
npm run preview           # Preview production build

# Docker Compose (full stack)
docker-compose up         # Requires .env; uses port 7500 for API, 6380 for Redis
```

## Code Patterns & Conventions

### NestJS Response Wrapper
All endpoints return a standardized response:
```typescript
// src/common/http/response.helpers.ts
return ok(data, 'Success message');  // { success: true, message, data }
```
Controllers wrap service responses with `ok()` helper. DTOs use `class-validator` for validation (auto-applied via `ValidationPipe`).

### Service Dependency Injection
Services are injected via constructor, never instantiated directly:
```typescript
constructor(private readonly curriculumService: CurriculumService) {}
```

### Agent Setup (LangChain)
The `AgentService` initializes two agents with a `MemorySaver` checkpoint system:
- Teaching agent: responds to lesson requests with structured `teachingResponseFormat`
- Exercise agent: responds with `exerciseResponseFormat`
- Both agents access curriculum data via `getNerdcCurriculum` tool

### Frontend: Route Loaders for Data
Prefer loaders over useEffect for route-level data:
```typescript
export const Route = createFileRoute('/lesson/subjects/')({
  component: SubjectPage,
  loader: () => fetchSubjects(),  // Runs before component renders
  errorComponent: ({ error }) => <div>Error: {error.message}</div>,
});
```

### Type Safety
Frontend uses `src/common/types/` for API response shapes:
```typescript
type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
function isApiSuccess<T>(response: ApiResponse<T>): ... // Type guard
```

## Integration Points & External Dependencies

### Google GenAI / LangChain
- `@google/genai` & `@langchain/google-genai` - used in agent creation
- Agents generate responses in JSON format (structured output)
- Agent factory (`src/agent/agent.factory.ts`) centralizes model & tool setup

### Redis Cache
- Configured in `src/cache/redis-cache.module.ts`
- Used for session/data caching (see `cache-manager-redis-store`)
- Docker compose: Redis runs on port 6380

### Environment Variables (Backend)
```
DATABASE_URL=postgresql://user:pass@host/db
JWT_SECRET=your-secret
JWT_EXPIRES_IN=3600
```

### Environment Variables (Frontend)
```
VITE_API_DEV_URL=http://localhost:3000
VITE_API_PROD_URL=https://api.nextgrade.com
```

## Debugging Tips

- **Backend logs**: Winston logger with request ID middleware; check `logs/` directory
- **Frontend DevTools**: Open TanStack Router + Query devtools via UI (bottom-right corner in dev mode)
- **Database**: Use TypeORM CLI to inspect schema: `npm run typeorm -- schema:sync`
- **Health check**: Backend health endpoint at `GET /health`

## Project-Specific Gotchas

1. **Audio endpoint is streaming**: Don't buffer entire response; let clients stream MP3 directly
2. **Agent checkpointer uses memory**: Not persisted; consider upgrading to persistent storage for production
3. **Frontend env vars must be prefixed `VITE_`**: Only these are available at build time
4. **Curriculum is read-only**: Loaded from database; changes via migrations only
5. **No synchronize in TypeORM**: All schema changes via explicit migrations

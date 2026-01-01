export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  error?: {
    code: string;
    details?: unknown;
  };
  meta?: Record<string, unknown>;
}

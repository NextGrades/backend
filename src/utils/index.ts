export function extractHttpExceptionMessage(res: unknown): string {
  if (typeof res === 'string') return res;

  if (typeof res === 'object' && res !== null && 'message' in res) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const msg = (res as any).message;
    return Array.isArray(msg) ? msg.join(', ') : String(msg);
  }

  return 'Request failed';
}

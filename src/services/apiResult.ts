export type ApiResult<T> =
  { kind: 'success'; data: T } | { kind: 'error'; message: string; recoverable: boolean };

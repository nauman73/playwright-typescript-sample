/** An error with a stable code and an HTTP status that `handle()` turns into a JSON response. */
export class AppError extends Error {
  constructor(
    public code: string,
    public status: number,
    message = code,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

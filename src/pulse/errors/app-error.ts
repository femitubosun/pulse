export class AppError extends Error {
  constructor({ message }: { message: string; action?: string }) {
    super(message);
  }
}

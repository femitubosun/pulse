import { AppError } from "./app-error";

export function makeError(input: { action?: string; message: string }) {
  return new AppError(input);
}

import { AppError } from "../errors/app-error";
import { Pulse } from "../pulse";

export async function executeSyncHandler(
  action: string,
  data: any,
  runtime: Pulse,
): Promise<any> {
  const handler = runtime.getHandler(action);

  if (!handler) {
    throw new AppError({
      message: `No handler found for action: ${action}`,
      action,
    });
  }

  return await handler({
    input: data.input,
  });
}

export function getWrapperHandler(
  action: string,
  originalHandler: Function,
  runtime: Pulse,
) {
  return async (jobData: { input: unknown }) => {
    return await originalHandler({
      input: jobData.input,
    });
  };
}

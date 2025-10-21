// import { AppError } from "@gj-source/error";
// import { makeLogger } from "@gj-source/logging";
// import { runtime } from "../runtime";
// import { getActionProps } from "./handlers";

import { AppError } from "../errors/app-error";
import { runtime } from "../runtime";

export function getActionProps(action: string): {
  // logger: ReturnType<typeof makeLogger>;
  // makeError: ReturnType<typeof preMakeAsyncActionError>;
  // cacheKey: ReturnType<typeof makeActionCacheKey>;
} {
  // const logger = makeLogger(action.toUpperCase());
  // const makeError = preMakeAsyncActionError(action);
  // const cacheKey = makeActionCacheKey(action);

  return {
    // logger,
    // makeError,
    // cacheKey,
  };
}

export async function executeSyncHandler(
  action: string,
  data: any,
): Promise<any> {
  const handler = runtime.getHandler(action);

  if (!handler) {
    throw new AppError({
      message: `No handler found for action: ${action}`,
      action,
    });
  }

  // const actionLogger = makeLogger(action.toUpperCase());

  try {
    return await handler({
      ...data,
      context: {
        ...data.context,
        actionName: action,
      },
      ...getActionProps(action),
    });
  } catch (error) {
    // actionLogger.error(`Error`, error);
    throw error;
  }
}

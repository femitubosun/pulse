import z from "zod";
import { ExtractActionTypes } from "./__defs__/generics";
import { ActionDef } from "./action";
import { executeSyncHandler } from "./helpers/handler";

/**
 * Function to call an action and await the result
 * @param action
 * @param input
 * @constructor
 */
export const callAction = async <T extends ActionDef<any, any>>(
  action: T,
  input: {
    context: any;
    input: z.infer<ExtractActionTypes<T, "input">>;
  },
): Promise<{
  context: any;
  data: z.infer<ExtractActionTypes<T, "output">>;
}> => {
  const res = await executeSyncHandler(action.name, input);

  return res as Promise<z.infer<ExtractActionTypes<T, "output">>>;
};

// /**
//  * Function to add an action to the queue
//  * @param action
//  * @param input
//  * @constructor
//  */
// export const scheduleAction = async <T extends ActionDef<any, any>>(
//   action: T,
//   input: {
//     context: any;
//     input: z.infer<ExtractActionTypes<T, "input">>;
//     scheduledAt?: Date;
//   },
// ): Promise<{ jobId: string; job: any }> => {
//   return await runtime.scheduleJob(action, input);
// };

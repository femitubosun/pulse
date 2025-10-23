import z from "zod";
import { ExtractActionTypes } from "./__defs__/generics";
import { ActionDef } from "./action";
import { executeSyncHandler } from "./helpers/handler";
import { Pulse } from "./pulse";

/**
 * Function to call an action and await the result
 * @param action
 * @param input
 * @constructor
 */
export const callAction = async <T extends ActionDef<any, any>>(
  action: T,
  input: {
    input: z.infer<ExtractActionTypes<T, "input">>;
  },
): Promise<z.infer<ExtractActionTypes<T, "output">>> => {
  if (!Pulse.current) {
    throw new Error("Pulse not initialized. Call 'new Pulse(config)' first.");
  }
  const res = await executeSyncHandler(action.name, input, Pulse.current);

  return res as z.infer<ExtractActionTypes<T, "output">>;
};

/**
 * Function to add an action to the queue
 * @param action
 * @param input
 * @constructor
 */
export const scheduleAction = async <T extends ActionDef<any, any>>(
  action: T,
  input: {
    input: z.infer<ExtractActionTypes<T, "input">>;
    scheduledAt?: Date;
  },
): Promise<{ jobId: string; job: any }> => {
  if (!Pulse.current) {
    throw new Error("Pulse not initialized. Call 'new Pulse(config)' first.");
  }
  return await Pulse.current.scheduleJob(action, input);
};

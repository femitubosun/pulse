import z from "zod";
import { Action } from "./action";
import { ExtractActionTypes } from "./generics";

export type ActionHandler<T extends Action> = (params: {
  input: z.infer<ExtractActionTypes<T, "input">>;
}) => Promise<{ output: z.infer<ExtractActionTypes<T, "output">> }>;

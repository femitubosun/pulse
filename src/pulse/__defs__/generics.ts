import z from "zod";
import { ActionDef } from "../action";

export type ExtractActionTypes<
  T,
  U extends "input" | "output",
> = U extends "input"
  ? T extends ActionDef<infer Input, z.ZodType>
    ? Input
    : never
  : T extends ActionDef<z.ZodType, infer Output>
    ? Output
    : never;

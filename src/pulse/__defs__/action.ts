import z from "zod";
import { ActionDef } from "../action";

export type Action = ActionDef<z.ZodType, z.ZodType>;

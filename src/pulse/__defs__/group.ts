import { ActionDef } from "../action";
import { Action } from "./action";
import { ActionHandler } from "./action-handler";

export type ActionGroup = {
  [key: string]: Action | ActionGroup;
};

type ActionGroupDefHandler<Ag extends ActionGroup> = {
  [AgK in keyof Ag]?: Ag[AgK] extends Action
    ? ActionHandler<Ag[AgK]>
    : Ag[AgK] extends ActionGroup
      ? Partial<ActionGroupDefHandler<Ag[AgK]>>
      : never;
};

export type ActionGroupHandler<T extends ActionGroup> =
  ActionGroupDefHandler<T>;

// Type to extract handler type for a specific action from ActionGroup
export type ExtractActionHandler<
  _AG extends ActionGroup,
  ActionPath extends ActionDef<any, any>,
> = ActionPath extends Action ? ActionHandler<ActionPath> : never;

import { Action } from "./action";

export type PulseConfig = {
  appName: string;
  actionContextFactory: (a: Action) => unknown;
  queue: {
    redisUrl: string;
  };
};

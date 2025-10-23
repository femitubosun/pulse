import type { RedisOptions } from "ioredis";
import Redis from "ioredis";
import type z from "zod";
import { ExtractActionTypes } from "./__defs__/generics";
import type { Logger } from "./__defs__/logger";
import { CRON } from "./__defs__/settings";
import { ActionDef } from "./action";
import { makeError } from "./errors/make-error";
import { getWrapperHandler } from "./helpers/handler";
import { makeLogger } from "./logger";
import type { Module, ModuleAction } from "./module";
import { Queue } from "./queue";

type PulseConfig = {
  appName: string;
  queue: RedisOptions & {
    omitQueue?: boolean;
  };
  actionConfigFactory: (actionProps: {
    name: string;
    module: string;
  }) => unknown;
};

export class Pulse {
  public static current: Pulse | null = null;

  private appName: string;
  private queueConfig: RedisOptions;
  private _logger?: Logger;
  private redisConn: Redis;
  private _queue?: Queue;
  private _shouldQueue: boolean;

  public _appActions: Map<
    string,
    ModuleAction<ActionDef<z.ZodType, z.ZodType>>
  > = new Map();
  public _appCrons: Array<string> = [];

  constructor(private config: PulseConfig) {
    const { omitQueue, ...queueConfig } = config.queue;

    this.appName = config.appName;
    this.queueConfig = queueConfig;
    this.redisConn = new Redis(this.queueConfig);
    this._queue = new Queue(this.redisConn);
    this._shouldQueue = !!!omitQueue;
    Pulse.current = this;
  }

  get logger() {
    if (!this._logger) {
      this._logger = makeLogger(this.appName);
    }
    return this._logger;
  }

  registerModules(modules: Array<Module<any>>, queue?: Queue) {
    this._appActions = new Map(modules.flatMap((m) => [...m._actions]));
    if (queue) {
      this._queue = queue;
    }
    this._appCrons.push(...modules.flatMap((m) => m._crons));
  }

  async start() {
    if (!this._appActions.size) {
      this.logger.warn("No app actions or handlers found");

      return;
    }

    // Cron logic not implemented
    await this.#cleanupRepeatableJobs();
    await this.startCrons();
  }

  async startCrons() {
    this.logger.log(`Starting crons`);
    this._appCrons.forEach(async (c) => {
      await this.#startCron(c);
    });
  }

  getHandler(name: string) {
    return this._appActions.get(name)?.handler;
  }

  getQueue() {
    return this._queue;
  }

  async scheduleJob<T extends ActionDef<any, any>>(
    action: T,
    input: {
      input: z.infer<ExtractActionTypes<T, "input">>;
      scheduledAt?: Date;
    },
  ): Promise<{ jobId: string; job: any }> {
    if (!this._queue) {
      throw new Error("Queue not initialized");
    }

    const actionDef = this.#getValidAction(action.name);
    if (!actionDef) {
      this.logger.warn(`Action definition not found`);
      throw makeError({
        message: `Action definition not found for ${action.name}`,
      });
    }

    const actionQueue = this._queue.getOrCreateQ(action.name);

    const wrappedHandler = getWrapperHandler(
      action.name,
      actionDef.handler!,
      this,
    );

    this._queue.getOrCreateWorker(action.name, wrappedHandler, {
      connection: this.redisConn,
      concurrency: action._settings?.concurrency ?? 10,
    });

    const jobSettings: any = {};

    if (input.scheduledAt) {
      const delayMs = input.scheduledAt.getTime() - Date.now();
      if (delayMs <= 0) {
        throw new Error(
          `Scheduled time must be in the future. Provided: ${input.scheduledAt.toISOString()}`,
        );
      }
      jobSettings.delay = delayMs;
    }

    if (action._settings?.jobRetry) {
      jobSettings.attempts = action._settings.jobRetry.attempts;
      if (action._settings.jobRetry.backoff) {
        jobSettings.backoff = {
          type: action._settings.jobRetry.backoff.type,
          delay: action._settings.jobRetry.backoff.delay,
        };
      }
    }

    const job = await actionQueue.add(
      action.name,
      { input: input.input },
      jobSettings,
    );

    return {
      jobId: job.id as string,
      job,
    };
  }

  async cancelScheduledJob(
    actionName: string,
    jobId: string,
  ): Promise<boolean> {
    const queue = this.#validateQueue();
    if (!queue) {
      this.logger.warn(`Queue for cancel job not found`);
      return false;
    }

    return await queue.cancelJobById(actionName, jobId);
  }

  async #startCron(name: string) {
    this.logger.log(`Starting cron for ${name}`);

    const queue = this.#validateQueue();
    if (!queue) {
      this.logger.warn(`Queue not found`);
      return;
    }

    const action = this.#getValidCronAction(name);
    if (!action) {
      this.logger.warn(`Action not found`);
      return;
    }

    const actionQueue = queue.getOrCreateQ(name);
    const pattern = CRON[action.def._settings!.cron!];

    const wrappedHandler = getWrapperHandler(name, action.handler!, this);

    queue.getOrCreateWorker(name, wrappedHandler, {
      concurrency: action.def._settings?.concurrency ?? 10,
      connection: queue.redisConn!,
    });

    await actionQueue!.add(
      name,
      { input: undefined },
      {
        repeat: {
          pattern,
        },
      },
    );

    this.logger.log(`Started cron ${name}: ${action.def._settings?.cron}`);
  }

  #shouldStartQueue() {
    return this._shouldQueue;
  }

  #validateQueue() {
    if (!this._queue) {
      this.logger.warn("No queue. Cannot start cron");
      return null;
    }

    if (!this._queue.redisConn) {
      this.logger.warn("No connection. Cannot start cron");
      return null;
    }

    return this._queue!;
  }

  #getValidCronAction(name: string) {
    const action = this._appActions.get(name);

    if (!action) {
      this.logger.warn("Handler not found");
      return;
    }

    if (!action.def._settings?.cron) {
      this.logger.warn("Cannot find cron settings");

      return;
    }

    return action;
  }

  #getValidAction(name: string) {
    const action = this._appActions.get(name);

    if (!action) {
      this.logger.warn("Handler not found");
      return;
    }

    return action;
  }

  async #cleanupRepeatableJobs() {
    const queue = this.#validateQueue();
    if (!queue) {
      this.logger.warn("No queue available for cleanup");
      return;
    }

    this.logger.log("Cleaning up existing repeatable jobs before startup");

    try {
      await queue.cleanAllRepeatableJobsFromAllQueues();
      this.logger.log("Successfully cleaned up all existing repeatable jobs");
    } catch (error) {
      this.logger.error("Failed to clean up repeatable jobs", error);
    }
  }

  async shutdown() {
    this.logger.log("Starting graceful shutdown of action runtime...");

    try {
      if (this._queue) {
        this.logger.log("Closing queue connections...");
        await this._queue.clean();
        this.logger.log("Queue connections closed successfully");
      }

      this._appActions.clear();
      this._appCrons.length = 0;

      this.logger.log("Action runtime shutdown complete");
    } catch (error) {
      this.logger.error("Error during action runtime shutdown", error);
      throw error;
    }
  }
}

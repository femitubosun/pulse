import z from "zod";
import { QSettings } from "./__defs__/settings";

export class ActionDef<Input extends z.ZodType, Output extends z.ZodType> {
  public _input?: Input;
  public _output?: Output;
  public _isSync = false;
  public _settings?: Partial<QSettings>;

  constructor(public readonly name: string) {}

  input<T extends z.ZodType>(schema: T): ActionDef<T, Output> {
    this._input = schema as unknown as Input;

    return this as unknown as ActionDef<T, Output>;
  }

  output<T extends z.ZodType>(schema: T): ActionDef<Input, T> {
    this._output = schema as unknown as Output;

    return this as unknown as ActionDef<Input, T>;
  }

  settings(settings: Partial<QSettings>) {
    this._settings = settings;
    return this;
  }

  sync() {
    this._isSync = true;
    return this;
  }
}

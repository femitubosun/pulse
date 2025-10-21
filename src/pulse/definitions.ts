import { ActionGroup } from "./__defs__/group";
import { ActionDef } from "./action";
import { Module } from "./module";

/**
 * Function to define an action group
 * @param def
 * @constructor
 */
export function G<T extends ActionGroup>(def: T): T {
  return def;
}

/**
 * Function to define an action
 * @param name
 * @constructor
 */
export function A(name: string) {
  return new ActionDef(name);
}

/**
 * Function to make an action module
 * @param string module name
 * @param g group definition
 */
export function makeModule<T extends ActionGroup>(
  string: string,
  group: T,
): Module<T> {
  return new Module(string, group);
}

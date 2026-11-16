import { DEFAULT_WMS_CAPACITY_SCENARIO, type WmsCapacityScenarioInput } from "./wms-capacity-scenario";

/**
 * Local, in-memory undo/redo for what-if assumptions only.
 * No server action, persisted storage, or regulated warehouse operation is involved.
 */
export type WmsScenarioHistory = Readonly<{
  past: readonly WmsCapacityScenarioInput[];
  present: WmsCapacityScenarioInput;
  future: readonly WmsCapacityScenarioInput[];
  lastAction: "initial" | "edit" | "reset" | "undo" | "redo";
}>;

export type WmsScenarioHistoryAction =
  | Readonly<{ type: "edit"; key: keyof WmsCapacityScenarioInput; value: number }>
  | Readonly<{ type: "reset" | "undo" | "redo" }>;

export function initialWmsScenarioHistory(): WmsScenarioHistory {
  return { past: [], present: DEFAULT_WMS_CAPACITY_SCENARIO, future: [], lastAction: "initial" };
}

export function reduceWmsScenarioHistory(
  state: WmsScenarioHistory,
  action: WmsScenarioHistoryAction,
): WmsScenarioHistory {
  if (action.type === "edit") {
    if (Object.is(state.present[action.key], action.value)) return state;
    return {
      past: [...state.past, state.present],
      present: { ...state.present, [action.key]: action.value },
      future: [],
      lastAction: "edit",
    };
  }
  if (action.type === "reset") {
    const unchanged = (Object.keys(DEFAULT_WMS_CAPACITY_SCENARIO) as Array<keyof WmsCapacityScenarioInput>)
      .every((key) => Object.is(state.present[key], DEFAULT_WMS_CAPACITY_SCENARIO[key]));
    if (unchanged) return state;
    return {
      past: [...state.past, state.present],
      present: DEFAULT_WMS_CAPACITY_SCENARIO,
      future: [],
      lastAction: "reset",
    };
  }
  if (action.type === "undo") {
    const previous = state.past.at(-1);
    if (!previous) return state;
    return {
      past: state.past.slice(0, -1),
      present: previous,
      future: [state.present, ...state.future],
      lastAction: "undo",
    };
  }
  if (action.type === "redo") {
    const next = state.future[0];
    if (!next) return state;
    return {
      past: [...state.past, state.present],
      present: next,
      future: state.future.slice(1),
      lastAction: "redo",
    };
  }
  return state;
}

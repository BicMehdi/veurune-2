export function nextSaveId(parentSaveId: string): string;
export function eventFileForTurn(turn: number): string;
export function parseDocument(text: string, label: string): Record<string, unknown>;
export function validateHiddenState(value: unknown, label?: string): Record<string, unknown>;
export function validateMehdiSheet(value: unknown, label?: string): Record<string, unknown>;
export function materializeTurnPayload(
  baseCurrentValue: unknown,
  baseWorldValue: unknown,
  baseHiddenValue: unknown,
  ...rest: unknown[]
): Record<string, unknown>;
export function validateTurnPayload(
  baseCurrentValue: unknown,
  existingEventsText: string,
  payloadValue: unknown,
  baseState?: { hidden?: unknown },
): {
  files: Record<string, string>;
  saveId: string;
  turn: number;
  eventCount: number;
};

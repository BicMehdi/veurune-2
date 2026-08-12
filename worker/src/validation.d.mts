export function nextSaveId(parentSaveId: string): string;
export function eventFileForTurn(turn: number): string;
export function parseDocument(text: string, label: string): Record<string, unknown>;
export function validateTurnPayload(
  baseCurrentValue: unknown,
  existingEventsText: string,
  payloadValue: unknown,
): {
  files: Record<string, string>;
  saveId: string;
  turn: number;
  eventCount: number;
};

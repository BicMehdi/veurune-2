export type DiceRoll = {
  roll_id: string;
  label: string | null;
  notation: string;
  dice: number[];
  dice_total: number;
  generated_at: string;
  fiction_advanced: false;
};

function secureDie(sides: number) {
  const range = 0x1_0000_0000;
  const limit = Math.floor(range / sides) * sides;
  const buffer = new Uint32Array(1);
  do crypto.getRandomValues(buffer); while (buffer[0] >= limit);
  return (buffer[0] % sides) + 1;
}

export function rollDice(count: number, sides: number, label?: string): DiceRoll {
  if (!Number.isInteger(count) || count < 1 || count > 10) throw new Error("count doit être compris entre 1 et 10");
  if (!Number.isInteger(sides) || sides < 2 || sides > 100) throw new Error("sides doit être compris entre 2 et 100");
  const dice = Array.from({ length: count }, () => secureDie(sides));
  return {
    roll_id: crypto.randomUUID(),
    label: label || null,
    notation: `${count}d${sides}`,
    dice,
    dice_total: dice.reduce((sum, die) => sum + die, 0),
    generated_at: new Date().toISOString(),
    fiction_advanced: false,
  };
}

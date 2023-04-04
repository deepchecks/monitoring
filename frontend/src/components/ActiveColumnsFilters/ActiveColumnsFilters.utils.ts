export const MAX_CHARACTERS = 60;

export function buildFiltersChipLabel(key: string, value: [number, number]) {
  return `${key}: ${Number.isInteger(value[0]) ? value[0] : parseFloat(value[0].toFixed(3))} - ${
    Number.isInteger(value[1]) ? value[1] : parseFloat(value[1].toFixed(3))
  }`;
}

export function cutFiltersChipLabel(key: string, labelsString: string) {
  return `${key}: ${labelsString.slice(0, MAX_CHARACTERS)}...`;
}

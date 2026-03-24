import { cities, states } from "estados-cidades";

export function listBrazilStates(): string[] {
  return states();
}

export function listBrazilCitiesByState(stateUf: string): string[] {
  if (!stateUf) return [];
  return cities(stateUf) ?? [];
}

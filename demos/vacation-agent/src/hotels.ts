export type Hotel = {
  id: string;
  name: string;
  totalEur: number;
  accessible: boolean;
  available: boolean;
};

export type Goal = {
  subgoal: string;
  budgetEur: number;
  nights: number;
};

export const SCENARIO_NAMES = ['happy', 'sold-out', 'budget-drop'] as const;
export type ScenarioName = (typeof SCENARIO_NAMES)[number];

export type Scenario = {
  name: ScenarioName;
  goal: Goal;
  hotels: Hotel[];
};

const HOTELS: readonly Hotel[] = [
  { id: 'A', name: 'Casa Azul', totalEur: 520, accessible: true, available: true },
  { id: 'B', name: 'Villa Limone', totalEur: 480, accessible: false, available: true },
  { id: 'C', name: 'Hotel Mirador', totalEur: 590, accessible: true, available: true },
];

export function isScenarioName(value: string): value is ScenarioName {
  return (SCENARIO_NAMES as readonly string[]).includes(value);
}

export function createScenario(name: ScenarioName): Scenario {
  const hotels = HOTELS.map(hotel => ({
    ...hotel,
    available: name === 'sold-out' && hotel.id === 'A' ? false : hotel.available,
  }));
  const budgetEur = name === 'budget-drop' ? 500 : 600;
  return {
    name,
    goal: { subgoal: 'find an accessible hotel', budgetEur, nights: 3 },
    hotels,
  };
}

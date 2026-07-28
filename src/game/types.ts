// Game types

export interface Vec2 {
  x: number;
  y: number;
}

export interface Island {
  id: number;
  center: Vec2;
  radius: number;
  points: Vec2[];
  biome: Biome;
  buildingSlots: Vec2[];
  discovered: boolean;
}

export enum Biome {
  Tropical = 'Tropical',
  Jungle = 'Jungle',
  Volcanic = 'Volcanic',
  Tundra = 'Tundra',
  Sandy = 'Sandy',
}

export const BIOME_COLORS: Record<Biome, string> = {
  [Biome.Tropical]: '#4CAF50',
  [Biome.Jungle]: '#1B5E20',
  [Biome.Volcanic]: '#795548',
  [Biome.Tundra]: '#B0BEC5',
  [Biome.Sandy]: '#FFD57A',
};

export const BIOME_BEACH_COLORS: Record<Biome, string> = {
  [Biome.Tropical]: '#F0DC9F',
  [Biome.Jungle]: '#F0DC9F',
  [Biome.Volcanic]: '#503C32',
  [Biome.Tundra]: '#C8D2D7',
  [Biome.Sandy]: '#F0DC9F',
};

export enum BuildingType {
  Base = 'Base',
  Farm = 'Farm',
  LumberMill = 'Lumber Mill',
  Quarry = 'Quarry',
  Wall = 'Wall',
  Tower = 'Tower',
  Lighthouse = 'Lighthouse',
}

export const BUILDING_COSTS: Record<BuildingType, { wood: number; stone: number }> = {
  [BuildingType.Base]: { wood: 0, stone: 0 },
  [BuildingType.Farm]: { wood: 20, stone: 10 },
  [BuildingType.LumberMill]: { wood: 15, stone: 15 },
  [BuildingType.Quarry]: { wood: 15, stone: 20 },
  [BuildingType.Wall]: { wood: 10, stone: 15 },
  [BuildingType.Tower]: { wood: 25, stone: 30 },
  [BuildingType.Lighthouse]: { wood: 40, stone: 50 },
};

export const BUILDING_MAX_HP: Record<BuildingType, number> = {
  [BuildingType.Base]: 200,
  [BuildingType.Farm]: 50,
  [BuildingType.LumberMill]: 60,
  [BuildingType.Quarry]: 80,
  [BuildingType.Wall]: 150,
  [BuildingType.Tower]: 100,
  [BuildingType.Lighthouse]: 120,
};

export const BUILDING_COLORS: Record<BuildingType, string> = {
  [BuildingType.Base]: '#FFD700',
  [BuildingType.Farm]: '#8BC34A',
  [BuildingType.LumberMill]: '#795548',
  [BuildingType.Quarry]: '#9E9E9E',
  [BuildingType.Wall]: '#646464',
  [BuildingType.Tower]: '#F44336',
  [BuildingType.Lighthouse]: '#FFEB3B',
};

export interface Building {
  id: number;
  type: BuildingType;
  islandId: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attackTimer: number;
  productionTimer: number;
}

export enum EnemyType {
  Foam = 'Foam',
  Walker = 'Walker',
  Shadow = 'Shadow',
  DeepOne = 'Deep One',
}

export const ENEMY_COLORS: Record<EnemyType, string> = {
  [EnemyType.Foam]: '#B4C8DC',
  [EnemyType.Walker]: '#327832',
  [EnemyType.Shadow]: '#3C1450',
  [EnemyType.DeepOne]: '#143C50',
};

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  targetX: number;
  targetY: number;
  targetBuilding: number | null;
  attackTimer: number;
  wobble: number;
  alive: boolean;
}

export interface Resources {
  wood: number;
  stone: number;
  food: number;
  nightEssence: number;
}

export enum Phase {
  Day = 'DAY',
  Sunset = 'SUNSET',
  Night = 'NIGHT',
  Dawn = 'DAWN',
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface DawnReport {
  nightNumber: number;
  buildingsLost: number;
  enemiesKilled: number;
  nightEssenceGained: number;
  timer: number;
}

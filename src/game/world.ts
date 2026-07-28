import { Island, Biome, Vec2 } from './types';
import { PerlinNoise } from './noise';

export class World {
  islands: Island[];
  worldSize: number;
  seed: number;

  constructor(seed: number, islandCount: number) {
    this.seed = seed;
    this.worldSize = 3000;
    this.islands = this.generate(islandCount);
  }

  private generate(islandCount: number): Island[] {
    const perlin = new PerlinNoise(this.seed);
    const islands: Island[] = [];

    for (let i = 0; i < islandCount; i++) {
      const angle = (i / islandCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      const dist = 200 + Math.random() * (this.worldSize * 0.4 - 200);
      const cx = this.worldSize / 2 + Math.cos(angle) * dist;
      const cy = this.worldSize / 2 + Math.sin(angle) * dist;
      const radius = 60 + Math.random() * 100;

      const biomes = [Biome.Tropical, Biome.Jungle, Biome.Volcanic, Biome.Tundra, Biome.Sandy];
      const biome = biomes[Math.floor(Math.random() * biomes.length)];

      // Generate island shape using perlin noise
      const numPoints = 24;
      const points: Vec2[] = [];
      for (let j = 0; j < numPoints; j++) {
        const a = (j / numPoints) * Math.PI * 2;
        const noiseVal = perlin.get((cx + Math.cos(a) * 100) * 0.01, (cy + Math.sin(a) * 100) * 0.01);
        const r = radius * (0.7 + 0.3 * noiseVal);
        points.push({
          x: cx + Math.cos(a) * r,
          y: cy + Math.sin(a) * r,
        });
      }

      // Generate building slots
      const slotCount = Math.max(3, Math.floor(radius / 30));
      const buildingSlots: Vec2[] = [];
      for (let k = 0; k < slotCount; k++) {
        const a = Math.random() * Math.PI * 2;
        const d = 10 + Math.random() * (radius * 0.6 - 10);
        const sx = cx + Math.cos(a) * d;
        const sy = cy + Math.sin(a) * d;
        if (this.pointInPolygon({ x: sx, y: sy }, points)) {
          buildingSlots.push({ x: sx, y: sy });
        }
      }

      if (buildingSlots.length === 0) {
        buildingSlots.push({ x: cx, y: cy });
      }

      islands.push({
        id: i,
        center: { x: cx, y: cy },
        radius,
        points,
        biome,
        buildingSlots,
        discovered: false,
      });
    }

    // Sort by distance from center
    islands.sort((a, b) => {
      const da = Math.pow(a.center.x - this.worldSize / 2, 2) + Math.pow(a.center.y - this.worldSize / 2, 2);
      const db = Math.pow(b.center.x - this.worldSize / 2, 2) + Math.pow(b.center.y - this.worldSize / 2, 2);
      return da - db;
    });

    // Re-assign IDs and mark first as discovered
    islands.forEach((island, idx) => {
      island.id = idx;
      island.discovered = idx === 0;
    });

    return islands;
  }

  pointInPolygon(point: Vec2, polygon: Vec2[]): boolean {
    let inside = false;
    const n = polygon.length;
    let j = n - 1;

    for (let i = 0; i < n; i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;

      if ((yi > point.y) !== (yj > point.y) && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
      j = i;
    }

    return inside;
  }
}

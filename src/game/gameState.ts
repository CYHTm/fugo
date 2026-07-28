import {
  Building, BuildingType, BUILDING_COSTS, BUILDING_MAX_HP,
  Enemy, EnemyType, Resources, Phase, Particle, DawnReport, Vec2
} from './types';
import { World } from './world';

export class GameState {
  phase: Phase = Phase.Day;
  phaseTimer: number = 0;
  nightNumber: number = 0;
  resources: Resources = { wood: 100, stone: 60, food: 50, nightEssence: 0 };
  buildings: Building[] = [];
  enemies: Enemy[] = [];
  selectedIsland: number | null = 0;
  placingBuilding: BuildingType | null = null;
  gameOver: boolean = false;
  totalBuildingsLost: number = 0;
  totalEnemiesKilled: number = 0;
  nightSpawnTimer: number = 0;
  showHelp: boolean = true;
  dawnReport: DawnReport | null = null;
  message: { text: string; timer: number } | null = null;
  screenShake: number = 0;
  particles: Particle[] = [];
  private nextId: number = 0;

  getDayDuration(): number { return 60; }
  getSunsetDuration(): number { return 8; }
  getNightDuration(): number { return 40 + this.nightNumber * 5; }
  getDawnDuration(): number { return 5; }

  getPhaseDuration(): number {
    switch (this.phase) {
      case Phase.Day: return this.getDayDuration();
      case Phase.Sunset: return this.getSunsetDuration();
      case Phase.Night: return this.getNightDuration();
      case Phase.Dawn: return this.getDawnDuration();
    }
  }

  getDarkness(): number {
    switch (this.phase) {
      case Phase.Day: {
        const progress = this.phaseTimer / this.getDayDuration();
        return progress > 0.8 ? (progress - 0.8) / 0.2 * 0.15 : 0;
      }
      case Phase.Sunset: {
        const progress = this.phaseTimer / this.getSunsetDuration();
        return 0.15 + progress * 0.55;
      }
      case Phase.Night: return 0.7;
      case Phase.Dawn: {
        const progress = this.phaseTimer / this.getDawnDuration();
        return 0.7 * (1 - progress);
      }
    }
  }

  showMessage(text: string) {
    this.message = { text, timer: 3.0 };
  }

  addParticle(x: number, y: number, color: string) {
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 100,
        vy: (Math.random() - 0.5) * 100,
        life: 1.0,
        maxLife: 1.0,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  canAfford(type: BuildingType): boolean {
    const cost = BUILDING_COSTS[type];
    return this.resources.wood >= cost.wood && this.resources.stone >= cost.stone;
  }

  placeBuilding(type: BuildingType, islandId: number, x: number, y: number): boolean {
    if (!this.canAfford(type)) return false;

    const cost = BUILDING_COSTS[type];
    this.resources.wood -= cost.wood;
    this.resources.stone -= cost.stone;

    this.buildings.push({
      id: this.nextId++,
      type,
      islandId,
      x, y,
      hp: BUILDING_MAX_HP[type],
      maxHp: BUILDING_MAX_HP[type],
      attackTimer: 0,
      productionTimer: 0,
    });

    this.showMessage(`${type} built!`);
    return true;
  }

  spawnEnemy(type: EnemyType, x: number, y: number): void {
    const nightScale = 1 + this.nightNumber * 0.15;
    const baseHp: Record<EnemyType, number> = {
      [EnemyType.Foam]: 20,
      [EnemyType.Walker]: 40,
      [EnemyType.Shadow]: 30,
      [EnemyType.DeepOne]: 150,
    };
    const hp = baseHp[type] * nightScale;

    this.enemies.push({
      id: this.nextId++,
      type,
      x, y,
      hp,
      maxHp: hp,
      targetX: x,
      targetY: y,
      targetBuilding: null,
      attackTimer: 0,
      wobble: Math.random() * Math.PI * 2,
      alive: true,
    });
  }

  spawnWave(world: World): void {
    const count = 3 + this.nightNumber * 2;

    for (const island of world.islands) {
      if (!island.discovered) continue;

      const hasBuildings = this.buildings.some(b => b.islandId === island.id && b.hp > 0);
      if (!hasBuildings) continue;

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = island.radius + 80 + Math.random() * 120;
        const x = island.center.x + Math.cos(angle) * dist;
        const y = island.center.y + Math.sin(angle) * dist;

        let type: EnemyType;
        if (this.nightNumber <= 3) {
          type = EnemyType.Foam;
        } else if (this.nightNumber <= 7) {
          type = Math.random() < 0.33 ? EnemyType.Walker : EnemyType.Foam;
        } else if (this.nightNumber <= 14) {
          const r = Math.random();
          type = r < 0.25 ? EnemyType.Shadow : r < 0.5 ? EnemyType.Walker : EnemyType.Foam;
        } else {
          const r = Math.random();
          type = r < 0.2 ? EnemyType.DeepOne : r < 0.4 ? EnemyType.Shadow : r < 0.6 ? EnemyType.Walker : EnemyType.Foam;
        }

        this.spawnEnemy(type, x, y);
      }
    }
  }

  update(dt: number, world: World): void {
    if (this.gameOver) return;

    // Update message
    if (this.message) {
      this.message.timer -= dt;
      if (this.message.timer <= 0) this.message = null;
    }

    // Update dawn report
    if (this.dawnReport) {
      this.dawnReport.timer -= dt;
      if (this.dawnReport.timer <= 0) this.dawnReport = null;
    }

    // Update screen shake
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 5);
    }

    // Update particles
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 100 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);

    // Phase logic
    this.phaseTimer += dt;

    switch (this.phase) {
      case Phase.Day:
        this.updateDay(dt);
        if (this.phaseTimer >= this.getDayDuration()) {
          this.phase = Phase.Sunset;
          this.phaseTimer = 0;
          this.showMessage('The sun is setting... Prepare your defenses!');
        }
        break;

      case Phase.Sunset:
        if (this.phaseTimer >= this.getSunsetDuration()) {
          this.phase = Phase.Night;
          this.phaseTimer = 0;
          this.nightNumber++;
          this.nightSpawnTimer = 0;
          this.showMessage(`NIGHT ${this.nightNumber} — They are coming!`);
          this.spawnWave(world);
        }
        break;

      case Phase.Night:
        this.updateNight(dt, world);
        if (this.phaseTimer >= this.getNightDuration()) {
          this.phase = Phase.Dawn;
          this.phaseTimer = 0;

          const remaining = this.enemies.filter(e => e.alive).length;
          this.totalEnemiesKilled += remaining;
          const essence = this.enemies
            .filter(e => e.alive)
            .reduce((sum, e) => sum + this.getEssenceDrop(e.type), 0);

          this.enemies = [];

          const hasBase = this.buildings.some(b => b.type === BuildingType.Base && b.hp > 0);
          if (!hasBase) {
            this.gameOver = true;
          } else {
            this.dawnReport = {
              nightNumber: this.nightNumber,
              buildingsLost: 0,
              enemiesKilled: this.totalEnemiesKilled,
              nightEssenceGained: essence,
              timer: 5.0,
            };
            this.resources.nightEssence += essence;
          }
        }
        break;

      case Phase.Dawn:
        if (this.phaseTimer >= this.getDawnDuration()) {
          this.phase = Phase.Day;
          this.phaseTimer = 0;
          this.showMessage('A new day begins. Build and prepare!');
        }
        break;
    }
  }

  private updateDay(dt: number): void {
    for (const building of this.buildings) {
      if (building.hp <= 0) continue;

      building.productionTimer += dt;
      if (building.productionTimer >= 5.0) {
        building.productionTimer = 0;
        switch (building.type) {
          case BuildingType.Farm: this.resources.food += 3; break;
          case BuildingType.LumberMill: this.resources.wood += 4; break;
          case BuildingType.Quarry: this.resources.stone += 3; break;
        }
      }
    }
  }

  private updateNight(dt: number, world: World): void {
    // Spawn additional waves
    this.nightSpawnTimer += dt;
    const spawnInterval = Math.max(5, 15 - this.nightNumber * 0.5);
    if (this.nightSpawnTimer >= spawnInterval) {
      this.nightSpawnTimer = 0;
      this.spawnWave(world);
    }

    const shakeEvents: number[] = [];
    const particleEvents: { x: number; y: number; color: string }[] = [];

    // Enemy stats
    const enemySpeed: Record<EnemyType, number> = {
      [EnemyType.Foam]: 30,
      [EnemyType.Walker]: 20,
      [EnemyType.Shadow]: 50,
      [EnemyType.DeepOne]: 12,
    };

    const enemyDamage: Record<EnemyType, number> = {
      [EnemyType.Foam]: 5,
      [EnemyType.Walker]: 10,
      [EnemyType.Shadow]: 8,
      [EnemyType.DeepOne]: 25,
    };

    // Update enemies
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      // Find nearest building
      let nearestDist = Infinity;
      let nearestIdx = -1;
      for (let i = 0; i < this.buildings.length; i++) {
        const b = this.buildings[i];
        if (b.hp <= 0) continue;
        const dx = b.x - enemy.x;
        const dy = b.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }

      if (nearestIdx >= 0) {
        const b = this.buildings[nearestIdx];
        enemy.targetX = b.x;
        enemy.targetY = b.y;
        enemy.targetBuilding = nearestIdx;

        const dx = enemy.targetX - enemy.x;
        const dy = enemy.targetY - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 15) {
          enemy.attackTimer += dt;
          if (enemy.attackTimer >= 1.0) {
            enemy.attackTimer = 0;
            const damage = enemyDamage[enemy.type] * (1 + this.nightNumber * 0.1);
            this.buildings[nearestIdx].hp -= damage;
            shakeEvents.push(0.3);
            particleEvents.push({ x: b.x, y: b.y, color: '#FF6432' });
          }
        } else {
          const speed = enemySpeed[enemy.type];
          enemy.x += (dx / dist) * speed * dt;
          enemy.y += (dy / dist) * speed * dt;
        }
      }
    }

    // Tower attacks
    const towerRange: Partial<Record<BuildingType, number>> = {
      [BuildingType.Tower]: 120,
      [BuildingType.Lighthouse]: 200,
    };
    const towerDamage: Partial<Record<BuildingType, number>> = {
      [BuildingType.Tower]: 15,
      [BuildingType.Lighthouse]: 8,
    };
    const towerCooldown: Partial<Record<BuildingType, number>> = {
      [BuildingType.Tower]: 1.0,
      [BuildingType.Lighthouse]: 0.5,
    };

    for (const building of this.buildings) {
      if (building.hp <= 0) continue;
      const range = towerRange[building.type];
      if (!range) continue;

      building.attackTimer += dt;
      const cd = towerCooldown[building.type] || 1;
      if (building.attackTimer >= cd) {
        let nearestDist = range;
        let nearestIdx = -1;
        for (let i = 0; i < this.enemies.length; i++) {
          const e = this.enemies[i];
          if (!e.alive) continue;
          const dx = e.x - building.x;
          const dy = e.y - building.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestIdx = i;
          }
        }

        if (nearestIdx >= 0) {
          building.attackTimer = 0;
          const e = this.enemies[nearestIdx];
          const wasAlive = e.alive;
          e.hp -= towerDamage[building.type] || 10;
          if (e.hp <= 0) e.alive = false;
          if (wasAlive && !e.alive) {
            this.totalEnemiesKilled++;
            particleEvents.push({ x: e.x, y: e.y, color: '#C832FF' });
          }
        }
      }
    }

    // Apply effects
    for (const shake of shakeEvents) {
      this.screenShake = Math.max(this.screenShake, shake);
    }
    for (const pe of particleEvents) {
      this.addParticle(pe.x, pe.y, pe.color);
    }

    // Clean up
    this.enemies = this.enemies.filter(e => e.alive);
    const beforeCount = this.buildings.length;
    this.buildings = this.buildings.filter(b => b.hp > 0);
    this.totalBuildingsLost += beforeCount - this.buildings.length;
  }

  private getEssenceDrop(type: EnemyType): number {
    switch (type) {
      case EnemyType.Foam: return 1;
      case EnemyType.Walker: return 3;
      case EnemyType.Shadow: return 5;
      case EnemyType.DeepOne: return 20;
    }
  }
}

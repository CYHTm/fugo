import { Camera } from './camera';
import { GameState } from './gameState';
import { World } from './world';
import {
  Building, BuildingType, BUILDING_COLORS,
  Enemy, EnemyType, ENEMY_COLORS,
  Island, BIOME_COLORS, BIOME_BEACH_COLORS, Phase
} from './types';

export class Renderer {
  private waterTime: number = 0;
  private lastAttackLines: { x1: number; y1: number; x2: number; y2: number; timer: number }[] = [];

  render(ctx: CanvasRenderingContext2D, world: World, camera: Camera, game: GameState, canvasWidth: number, canvasHeight: number, dt: number) {
    this.waterTime += dt;

    // Update attack lines
    this.lastAttackLines = this.lastAttackLines.filter(l => {
      l.timer -= dt;
      return l.timer > 0;
    });

    // Clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Apply camera with shake
    const shake = game.screenShake > 0 ? {
      x: Math.sin(this.waterTime * 100) * game.screenShake * 5,
      y: Math.cos(this.waterTime * 100) * game.screenShake * 5,
    } : { x: 0, y: 0 };

    ctx.save();
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x + shake.x, -camera.y + shake.y);

    // Draw water
    this.drawWater(ctx, world, camera, game, canvasWidth, canvasHeight);

    // Draw islands
    for (const island of world.islands) {
      if (!island.discovered) {
        this.drawIslandSilhouette(ctx, island);
      } else {
        this.drawIsland(ctx, island, game);
      }
    }

    // Draw buildings
    for (const building of game.buildings) {
      if (building.hp > 0) {
        this.drawBuilding(ctx, building, game);
      }
    }

    // Draw enemies
    if (game.phase === Phase.Night || game.phase === Phase.Sunset) {
      for (const enemy of game.enemies) {
        if (enemy.alive) {
          this.drawEnemy(ctx, enemy, game);
        }
      }
    }

    // Draw attack lines
    for (const line of this.lastAttackLines) {
      ctx.strokeStyle = `rgba(255, 100, 50, ${line.timer * 2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(line.x1, line.y1);
      ctx.lineTo(line.x2, line.y2);
      ctx.stroke();
    }

    // Draw lighthouse glow
    if (game.phase === Phase.Night || game.phase === Phase.Sunset) {
      for (const building of game.buildings) {
        if (building.hp > 0 && building.type === BuildingType.Lighthouse) {
          const pulse = Math.sin(this.waterTime * 2) * 0.1 + 0.3;
          const grad = ctx.createRadialGradient(building.x, building.y, 0, building.x, building.y, 200);
          grad.addColorStop(0, `rgba(255, 255, 200, ${pulse * 0.3})`);
          grad.addColorStop(1, 'rgba(255, 255, 200, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(building.x, building.y, 200, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw particles
    for (const p of game.particles) {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Building placement preview
    if (game.placingBuilding && game.selectedIsland !== null) {
      const world = camera.screenToWorld(this.lastMouseX, this.lastMouseY, canvasWidth, canvasHeight);
      ctx.strokeStyle = 'rgba(100, 255, 100, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(world.x, world.y, 15, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    // Darkness overlay
    const darkness = game.getDarkness();
    if (darkness > 0) {
      ctx.fillStyle = `rgba(0, 0, 20, ${darkness})`;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // Sunset warm tint
    if (game.phase === Phase.Sunset) {
      const progress = game.phaseTimer / game.getSunsetDuration();
      const warmth = Math.max(0, 1 - progress) * 0.15;
      ctx.fillStyle = `rgba(255, 100, 25, ${warmth})`;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
  }

  lastMouseX: number = 0;
  lastMouseY: number = 0;

  setMousePosition(x: number, y: number) {
    this.lastMouseX = x;
    this.lastMouseY = y;
  }

  private drawWater(ctx: CanvasRenderingContext2D, world: World, camera: Camera, game: GameState, canvasWidth: number, canvasHeight: number) {
    const darkness = game.getDarkness();
    const r = Math.floor(30 * (1 - darkness) + 8 * darkness);
    const g = Math.floor(80 * (1 - darkness) + 15 * darkness);
    const b = Math.floor(140 * (1 - darkness) + 35 * darkness);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(-500, -500, world.worldSize + 1000, world.worldSize + 1000);

    // Wave highlights
    const step = 80;
    const startX = Math.floor((camera.x - canvasWidth / camera.zoom / 2 - 100) / step) * step;
    const startY = Math.floor((camera.y - canvasHeight / camera.zoom / 2 - 100) / step) * step;
    const endX = camera.x + canvasWidth / camera.zoom / 2 + 100;
    const endY = camera.y + canvasHeight / camera.zoom / 2 + 100;

    ctx.fillStyle = 'rgba(150, 200, 255, 0.15)';
    for (let y = startY; y < endY; y += step) {
      for (let x = startX; x < endX; x += step) {
        const wave = (Math.sin(x * 0.01 + this.waterTime * 0.5) + Math.sin(y * 0.015 + this.waterTime * 0.3)) * 0.5;
        if (wave > 0.3) {
          const offsetX = Math.sin(this.waterTime * 10 + y * 0.1) * 3;
          ctx.beginPath();
          ctx.arc(x + offsetX, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  private drawIslandSilhouette(ctx: CanvasRenderingContext2D, island: Island) {
    if (island.points.length < 3) return;
    ctx.fillStyle = 'rgba(20, 25, 35, 0.6)';
    ctx.beginPath();
    ctx.moveTo(island.points[0].x, island.points[0].y);
    for (let i = 1; i < island.points.length; i++) {
      ctx.lineTo(island.points[i].x, island.points[i].y);
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawIsland(ctx: CanvasRenderingContext2D, island: Island, game: GameState) {
    if (island.points.length < 3) return;

    const darkness = game.getDarkness();

    // Shore (slightly larger)
    ctx.fillStyle = this.adjustColor(BIOME_BEACH_COLORS[island.biome], darkness);
    ctx.beginPath();
    const shorePoints = island.points.map(p => {
      const dx = p.x - island.center.x;
      const dy = p.y - island.center.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      return { x: island.center.x + dx * 1.08, y: island.center.y + dy * 1.08 };
    });
    ctx.moveTo(shorePoints[0].x, shorePoints[0].y);
    for (let i = 1; i < shorePoints.length; i++) {
      ctx.lineTo(shorePoints[i].x, shorePoints[i].y);
    }
    ctx.closePath();
    ctx.fill();

    // Island body
    ctx.fillStyle = this.adjustColor(BIOME_COLORS[island.biome], darkness);
    ctx.beginPath();
    ctx.moveTo(island.points[0].x, island.points[0].y);
    for (let i = 1; i < island.points.length; i++) {
      ctx.lineTo(island.points[i].x, island.points[i].y);
    }
    ctx.closePath();
    ctx.fill();

    // Trees/details based on biome
    this.drawIslandDetails(ctx, island, darkness);

    // Selection highlight
    if (game.selectedIsland === island.id) {
      const pulse = Math.sin(Date.now() / 300) * 0.15 + 0.25;
      ctx.strokeStyle = `rgba(255, 255, 255, ${pulse + 0.4})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(island.points[0].x, island.points[0].y);
      for (let i = 1; i < island.points.length; i++) {
        ctx.lineTo(island.points[i].x, island.points[i].y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Night mutation effect
    if (game.phase === Phase.Night) {
      const pulse = Math.sin(Date.now() / 500 + island.id) * 0.1 + 0.1;
      ctx.fillStyle = `rgba(80, 0, 120, ${pulse})`;
      ctx.beginPath();
      ctx.moveTo(island.points[0].x, island.points[0].y);
      for (let i = 1; i < island.points.length; i++) {
        ctx.lineTo(island.points[i].x, island.points[i].y);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawIslandDetails(ctx: CanvasRenderingContext2D, island: Island, darkness: number) {
    // Add small decorative elements
    const rng = this.seededRandom(island.id * 12345);
    const detailCount = Math.floor(island.radius / 20);

    for (let i = 0; i < detailCount; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = rng() * island.radius * 0.7;
      const x = island.center.x + Math.cos(angle) * dist;
      const y = island.center.y + Math.sin(angle) * dist;

      if (!new World(0, 0).pointInPolygon({ x, y }, island.points)) continue;

      // Don't draw near buildings - they'll cover it
      ctx.fillStyle = this.adjustColor('#2D5016', darkness);
      ctx.beginPath();
      ctx.arc(x, y, 3 + rng() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawBuilding(ctx: CanvasRenderingContext2D, building: Building, game: GameState) {
    const darkness = game.getDarkness();
    const color = this.adjustColor(BUILDING_COLORS[building.type], darkness);
    const size = this.getBuildingSize(building.type);

    ctx.save();
    ctx.translate(building.x, building.y);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(2, 4, size * 0.8, size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    switch (building.type) {
      case BuildingType.Base:
        this.drawCastle(ctx, size, color);
        break;
      case BuildingType.Farm:
        this.drawFarm(ctx, size, color);
        break;
      case BuildingType.LumberMill:
        this.drawLumberMill(ctx, size, color);
        break;
      case BuildingType.Quarry:
        this.drawQuarry(ctx, size, color);
        break;
      case BuildingType.Wall:
        this.drawWall(ctx, size, color);
        break;
      case BuildingType.Tower:
        this.drawTower(ctx, size, color, game);
        break;
      case BuildingType.Lighthouse:
        this.drawLighthouse(ctx, size, color, game);
        break;
    }

    ctx.restore();

    // HP bar
    if (building.hp < building.maxHp) {
      const barW = size * 2;
      const barH = 4;
      const barX = building.x - barW / 2;
      const barY = building.y - size - 10;
      const hpRatio = building.hp / building.maxHp;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(barX, barY, barW, barH);

      const hpColor = hpRatio > 0.5 ? '#44ff44' : hpRatio > 0.25 ? '#ffff44' : '#ff4444';
      ctx.fillStyle = hpColor;
      ctx.fillRect(barX, barY, barW * hpRatio, barH);
    }
  }

  private drawCastle(ctx: CanvasRenderingContext2D, size: number, color: string) {
    // Main body
    ctx.fillStyle = color;
    ctx.fillRect(-size, -size, size * 2, size * 2);

    // Towers at corners
    const towerSize = size * 0.4;
    ctx.fillStyle = this.lighten(color, 20);
    for (const [tx, ty] of [[-size, -size], [size - towerSize, -size], [-size, size - towerSize], [size - towerSize, size - towerSize]]) {
      ctx.fillRect(tx, ty, towerSize, towerSize);
    }

    // Flag
    ctx.fillStyle = '#FF4444';
    ctx.fillRect(-2, -size - 10, 10, 6);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-2, -size - 10, 2, 12);

    // Door
    ctx.fillStyle = '#5C3317';
    ctx.fillRect(-3, 0, 6, size);
  }

  private drawFarm(ctx: CanvasRenderingContext2D, size: number, color: string) {
    // Wheat field
    ctx.fillStyle = '#DAA520';
    ctx.fillRect(-size, -size * 0.3, size * 2, size * 1.3);

    // Barn
    ctx.fillStyle = '#8B0000';
    ctx.fillRect(-size * 0.4, -size, size * 0.8, size * 0.8);

    // Barn roof
    ctx.fillStyle = '#5C0000';
    ctx.beginPath();
    ctx.moveTo(-size * 0.5, -size);
    ctx.lineTo(0, -size * 1.3);
    ctx.lineTo(size * 0.5, -size);
    ctx.closePath();
    ctx.fill();
  }

  private drawLumberMill(ctx: CanvasRenderingContext2D, size: number, color: string) {
    // Building
    ctx.fillStyle = color;
    ctx.fillRect(-size, -size * 0.5, size * 1.5, size);

    // Roof
    ctx.fillStyle = '#3E2723';
    ctx.beginPath();
    ctx.moveTo(-size * 1.1, -size * 0.5);
    ctx.lineTo(-size * 0.25, -size * 1.1);
    ctx.lineTo(size * 0.6, -size * 0.5);
    ctx.closePath();
    ctx.fill();

    // Logs
    ctx.fillStyle = '#6D4C41';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(size * 0.3 + i * 5, size * 0.3, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawQuarry(ctx: CanvasRenderingContext2D, size: number, color: string) {
    // Rock pile
    ctx.fillStyle = '#616161';
    ctx.beginPath();
    ctx.arc(-size * 0.3, size * 0.2, size * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Mine entrance
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.4, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-size * 0.4, -size * 0.05, size * 0.8, size * 0.5);

    // Support beams
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-size * 0.4, -size * 0.4, 3, size * 0.9);
    ctx.fillRect(size * 0.35, -size * 0.4, 3, size * 0.9);
  }

  private drawWall(ctx: CanvasRenderingContext2D, size: number, color: string) {
    ctx.fillStyle = color;
    ctx.fillRect(-size, -size * 0.5, size * 2, size);

    // Battlements
    ctx.fillStyle = this.lighten(color, 20);
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(-size + i * size * 0.8, -size * 0.7, size * 0.4, size * 0.2);
    }
  }

  private drawTower(ctx: CanvasRenderingContext2D, size: number, color: string, game: GameState) {
    // Tower body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-size * 0.6, size);
    ctx.lineTo(-size * 0.4, -size);
    ctx.lineTo(size * 0.4, -size);
    ctx.lineTo(size * 0.6, size);
    ctx.closePath();
    ctx.fill();

    // Top platform
    ctx.fillStyle = this.lighten(color, 20);
    ctx.fillRect(-size * 0.7, -size * 1.1, size * 1.4, size * 0.3);

    // Arrow slit
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-2, -size * 0.3, 4, size * 0.4);

    // Range indicator at night
    if (game.phase === Phase.Night) {
      ctx.strokeStyle = 'rgba(255, 100, 50, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 120, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawLighthouse(ctx: CanvasRenderingContext2D, size: number, color: string, game: GameState) {
    // Striped tower
    const stripes = 4;
    const stripeH = (size * 2) / stripes;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? color : '#FFFFFF';
      ctx.fillRect(-size * 0.4, -size + i * stripeH, size * 0.8, stripeH);
    }

    // Light on top
    const glow = Math.sin(Date.now() / 250) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255, 255, 150, ${glow})`;
    ctx.beginPath();
    ctx.arc(0, -size * 1.2, size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Glow effect
    const grad = ctx.createRadialGradient(0, -size * 1.2, 0, 0, -size * 1.2, size * 2);
    grad.addColorStop(0, `rgba(255, 255, 150, ${glow * 0.5})`);
    grad.addColorStop(1, 'rgba(255, 255, 150, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, -size * 1.2, size * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, game: GameState) {
    const color = ENEMY_COLORS[enemy.type];
    const size = this.getEnemySize(enemy.type);
    const wobble = Math.sin(Date.now() / 200 + enemy.wobble) * 2;

    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    switch (enemy.type) {
      case EnemyType.Foam:
        ctx.globalAlpha = 0.7 + Math.sin(Date.now() / 300 + enemy.wobble) * 0.3;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(wobble, wobble * 0.5, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-wobble * 0.5, -wobble, size * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;

      case EnemyType.Walker:
        ctx.fillStyle = color;
        this.drawPolygon(ctx, 0, 0, 5, size, wobble * 0.1);
        // Branch arms
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-size * 0.5, 0);
        ctx.lineTo(-size, -size * 0.3 + wobble);
        ctx.moveTo(size * 0.5, 0);
        ctx.lineTo(size, -size * 0.3 - wobble);
        ctx.stroke();
        break;

      case EnemyType.Shadow:
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 125 + enemy.wobble) * 0.3;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        // Red eyes
        ctx.fillStyle = '#FF0000';
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(-3, -2, 2, 0, Math.PI * 2);
        ctx.arc(3, -2, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;

      case EnemyType.DeepOne:
        ctx.fillStyle = color;
        this.drawPolygon(ctx, 0, 0, 8, size, Date.now() / 50);
        ctx.fillStyle = 'rgba(0, 200, 200, 0.5)';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        // Tentacles
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2 + Date.now() / 1000;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * size, Math.sin(angle) * size);
          ctx.lineTo(Math.cos(angle) * size * 1.5 + wobble, Math.sin(angle) * size * 1.5);
          ctx.stroke();
        }
        break;
    }

    ctx.restore();

    // HP bar
    if (enemy.hp < enemy.maxHp) {
      const barW = size * 2;
      const barH = 3;
      const barX = enemy.x - barW / 2;
      const barY = enemy.y - size - 8;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#FF4444';
      ctx.fillRect(barX, barY, barW * (enemy.hp / enemy.maxHp), barH);
    }
  }

  private drawPolygon(ctx: CanvasRenderingContext2D, x: number, y: number, sides: number, radius: number, rotation: number) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 + rotation;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  private getBuildingSize(type: BuildingType): number {
    switch (type) {
      case BuildingType.Base: return 18;
      case BuildingType.Wall: return 10;
      case BuildingType.Lighthouse: return 16;
      default: return 12;
    }
  }

  private getEnemySize(type: EnemyType): number {
    switch (type) {
      case EnemyType.Foam: return 6;
      case EnemyType.Walker: return 10;
      case EnemyType.Shadow: return 8;
      case EnemyType.DeepOne: return 20;
    }
  }

  private adjustColor(hex: string, darkness: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const nr = Math.floor(r * (1 - darkness * 0.7));
    const ng = Math.floor(g * (1 - darkness * 0.7));
    const nb = Math.floor(b * (1 - darkness * 0.6));

    return `rgb(${nr}, ${ng}, ${nb})`;
  }

  private lighten(hex: string, amount: number): string {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }
}

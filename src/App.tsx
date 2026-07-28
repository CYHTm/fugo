import { useState, useEffect, useCallback, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameUI } from './components/GameUI';
import { Camera } from './game/camera';
import { GameState } from './game/gameState';
import { World } from './game/world';
import { Renderer } from './game/renderer';
import { BuildingType, BUILDING_COSTS, Phase } from './game/types';

const SEED = 42;

function App() {
  const [initialized, setInitialized] = useState(false);
  const worldRef = useRef<World | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const rendererRef = useRef<Renderer | null>(null);

  // Initialize game
  useEffect(() => {
    const world = new World(SEED, 12);
    const camera = new Camera(world.islands[0].center.x, world.islands[0].center.y);
    camera.targetZoom = 0.8;
    camera.zoom = 0.8;
    const game = new GameState();
    const renderer = new Renderer();

    // Place starting base
    const start = world.islands[0];
    game.placeBuilding(BuildingType.Base, 0, start.buildingSlots[0].x, start.buildingSlots[0].y);
    if (start.buildingSlots.length > 1) {
      game.placeBuilding(BuildingType.LumberMill, 0, start.buildingSlots[1].x, start.buildingSlots[1].y);
    }
    // Restore resources after starting buildings
    game.resources = { wood: 100, stone: 60, food: 50, nightEssence: 0 };

    game.showMessage('Welcome to Fugo: Archipelago! Press H for help.');

    worldRef.current = world;
    cameraRef.current = camera;
    gameRef.current = game;
    rendererRef.current = renderer;
    setInitialized(true);

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h') {
        game.showHelp = !game.showHelp;
      }
      if (e.key.toLowerCase() === 'r' && game.gameOver) {
        // Restart
        const newWorld = new World(SEED + Math.floor(Math.random() * 10000), 12);
        const newCamera = new Camera(newWorld.islands[0].center.x, newWorld.islands[0].center.y);
        newCamera.targetZoom = 0.8;
        newCamera.zoom = 0.8;
        const newGame = new GameState();
        const startIsland = newWorld.islands[0];
        newGame.placeBuilding(BuildingType.Base, 0, startIsland.buildingSlots[0].x, startIsland.buildingSlots[0].y);
        newGame.resources = { wood: 100, stone: 60, food: 50, nightEssence: 0 };

        worldRef.current = newWorld;
        cameraRef.current = newCamera;
        gameRef.current = newGame;
      }

      // Number keys for building selection
      const num = parseInt(e.key);
      if (num >= 1 && num <= 6) {
        const types = [
          BuildingType.Farm,
          BuildingType.LumberMill,
          BuildingType.Quarry,
          BuildingType.Wall,
          BuildingType.Tower,
          BuildingType.Lighthouse,
        ];
        const type = types[num - 1];
        if (type && game.selectedIsland !== null && game.canAfford(type)) {
          game.placingBuilding = game.placingBuilding === type ? null : type;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleWorldClick = useCallback((worldX: number, worldY: number) => {
    const world = worldRef.current;
    const game = gameRef.current;
    if (!world || !game) return;

    if (game.placingBuilding && game.selectedIsland !== null) {
      const island = world.islands[game.selectedIsland];
      if (world.pointInPolygon({ x: worldX, y: worldY }, island.points)) {
        // Check not too close to existing building
        const tooClose = game.buildings.some(b =>
          b.islandId === game.selectedIsland &&
          b.hp > 0 &&
          Math.sqrt(Math.pow(b.x - worldX, 2) + Math.pow(b.y - worldY, 2)) < 20
        );
        if (tooClose) {
          game.showMessage('Too close to another building!');
        } else {
          if (game.placeBuilding(game.placingBuilding, game.selectedIsland, worldX, worldY)) {
            game.placingBuilding = null;
          }
        }
      } else {
        game.showMessage('Must place on the selected island!');
      }
    } else {
      // Try to select an island
      let found = false;
      for (const island of world.islands) {
        if (world.pointInPolygon({ x: worldX, y: worldY }, island.points)) {
          game.selectedIsland = island.id;
          if (!island.discovered) {
            island.discovered = true;
            game.showMessage(`Discovered ${island.biome} island!`);
          }
          found = true;
          break;
        }
      }
      if (!found) {
        game.selectedIsland = null;
      }
    }
  }, []);

  const handleRightClick = useCallback(() => {
    const game = gameRef.current;
    if (game) {
      game.placingBuilding = null;
    }
  }, []);

  const handleSelectBuilding = useCallback((type: BuildingType | null) => {
    const game = gameRef.current;
    if (game) {
      if (type && game.selectedIsland === null) {
        game.showMessage('Select an island first!');
        return;
      }
      if (type && !game.canAfford(type)) {
        game.showMessage('Not enough resources!');
        return;
      }
      game.placingBuilding = type;
    }
  }, []);

  if (!initialized || !worldRef.current || !cameraRef.current || !gameRef.current || !rendererRef.current) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050510',
        color: '#FCD34D',
        fontSize: 24,
        fontFamily: 'system-ui',
      }}>
        🏝️ Loading Fugo: Archipelago...
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <GameCanvas
        world={worldRef.current}
        camera={cameraRef.current}
        game={gameRef.current}
        renderer={rendererRef.current}
        onWorldClick={handleWorldClick}
        onRightClick={handleRightClick}
      />
      <GameUI
        game={gameRef.current}
        world={worldRef.current}
        onSelectBuilding={handleSelectBuilding}
      />
    </div>
  );
}

export default App;

import { useEffect, useRef, useCallback } from 'react';
import { Camera } from '../game/camera';
import { GameState } from '../game/gameState';
import { World } from '../game/world';
import { Renderer } from '../game/renderer';
import { BuildingType } from '../game/types';

interface GameCanvasProps {
  world: World;
  camera: Camera;
  game: GameState;
  renderer: Renderer;
  onWorldClick: (worldX: number, worldY: number) => void;
  onRightClick: () => void;
}

export function GameCanvas({ world, camera, game, renderer, onWorldClick, onRightClick }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef({ x: 0, y: 0, buttons: 0, wheel: 0 });
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    keysRef.current.add(e.key.toLowerCase());
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysRef.current.delete(e.key.toLowerCase());
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseRef.current.x = e.clientX - rect.left;
    mouseRef.current.y = e.clientY - rect.top;
    renderer.setMousePosition(mouseRef.current.x, mouseRef.current.y);
  }, [renderer]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (e.button === 0) {
      const canvas = canvasRef.current!;
      const worldPos = camera.screenToWorld(x, y, canvas.width, canvas.height);
      onWorldClick(worldPos.x, worldPos.y);
    } else if (e.button === 2) {
      onRightClick();
    }

    mouseRef.current.buttons = e.buttons;
  }, [camera, onWorldClick, onRightClick]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    mouseRef.current.buttons = e.buttons;
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    mouseRef.current.wheel = -e.deltaY;
    setTimeout(() => { mouseRef.current.wheel = 0; }, 50);
  }, []);

  const handleContextMenu = useCallback((e: Event) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('contextmenu', handleContextMenu);

    const gameLoop = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = time;

      // Update
      camera.update(keysRef.current, mouseRef.current, dt, canvas.width, canvas.height);
      game.update(dt, world);

      // Render
      renderer.render(ctx, world, camera, game, canvas.width, canvas.height, dt);

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [world, camera, game, renderer, handleKeyDown, handleKeyUp, handleMouseMove, handleMouseDown, handleMouseUp, handleWheel, handleContextMenu]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100vw',
        height: '100vh',
        cursor: game.placingBuilding ? 'crosshair' : 'grab',
      }}
    />
  );
}

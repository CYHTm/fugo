import { Vec2 } from './types';

export class Camera {
  x: number;
  y: number;
  zoom: number;
  targetX: number;
  targetY: number;
  targetZoom: number;
  private dragStart: Vec2 | null = null;
  private dragCamStart: Vec2 | null = null;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.zoom = 1.0;
    this.targetX = x;
    this.targetY = y;
    this.targetZoom = 1.0;
  }

  update(keys: Set<string>, mouseState: { x: number; y: number; buttons: number; wheel: number }, dt: number, canvasWidth: number, canvasHeight: number) {
    // Smooth interpolation
    const lerpSpeed = 0.1;
    this.x += (this.targetX - this.x) * lerpSpeed;
    this.y += (this.targetY - this.y) * lerpSpeed;
    this.zoom += (this.targetZoom - this.zoom) * lerpSpeed;

    // Keyboard pan
    const panSpeed = 500 / this.zoom;
    if (keys.has('w') || keys.has('arrowup')) this.targetY -= panSpeed * dt;
    if (keys.has('s') || keys.has('arrowdown')) this.targetY += panSpeed * dt;
    if (keys.has('a') || keys.has('arrowleft')) this.targetX -= panSpeed * dt;
    if (keys.has('d') || keys.has('arrowright')) this.targetX += panSpeed * dt;

    // Mouse drag pan (right or middle button)
    if (mouseState.buttons & 6) { // Right (2) or middle (4)
      if (!this.dragStart) {
        this.dragStart = { x: mouseState.x, y: mouseState.y };
        this.dragCamStart = { x: this.targetX, y: this.targetY };
      } else if (this.dragCamStart) {
        this.targetX = this.dragCamStart.x - (mouseState.x - this.dragStart.x) / this.zoom;
        this.targetY = this.dragCamStart.y - (mouseState.y - this.dragStart.y) / this.zoom;
      }
    } else {
      this.dragStart = null;
      this.dragCamStart = null;
    }

    // Scroll zoom
    if (mouseState.wheel !== 0) {
      this.targetZoom *= 1 + mouseState.wheel * 0.001;
      this.targetZoom = Math.max(0.2, Math.min(4.0, this.targetZoom));
    }
  }

  screenToWorld(sx: number, sy: number, canvasWidth: number, canvasHeight: number): Vec2 {
    return {
      x: (sx - canvasWidth / 2) / this.zoom + this.x,
      y: (sy - canvasHeight / 2) / this.zoom + this.y,
    };
  }

  worldToScreen(wx: number, wy: number, canvasWidth: number, canvasHeight: number): Vec2 {
    return {
      x: (wx - this.x) * this.zoom + canvasWidth / 2,
      y: (wy - this.y) * this.zoom + canvasHeight / 2,
    };
  }

  centerOn(x: number, y: number) {
    this.targetX = x;
    this.targetY = y;
  }

  applyTransform(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  resetTransform(ctx: CanvasRenderingContext2D) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

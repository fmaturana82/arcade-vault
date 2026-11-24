// Motor de METEORO — port a TypeScript de references/started-games/02-asteroids/game.js.
// TypeScript puro (sin React): mundo toroidal 800×600, dt limitado a 50 ms.
export const W = 800;
export const H = 600;
// ── Input ─────────────────────────────────────────────────────────────────────
/** Estado del teclado: teclas mantenidas y pulsaciones nuevas (por `KeyboardEvent.code`). */
export class InputState {
  private keys: Record<string, boolean> = {};
  private justPressed: Record<string, boolean> = {};
  keyDown(code: string): void {
    if (!this.keys[code]) this.justPressed[code] = true;
    this.keys[code] = true;
  }
  keyUp(code: string): void {
    this.keys[code] = false;
  }
  /** ¿Está la tecla mantenida? */
  held(code: string): boolean {
    return !!this.keys[code];
  }
  /** ¿Se acaba de pulsar? Consume la pulsación. */
  pressed(code: string): boolean {
    const val = !!this.justPressed[code];
    this.justPressed[code] = false;
    return val;
  }
  clear(): void {
    this.keys = {};
    this.justPressed = {};
  }
}
// ── Utils ─────────────────────────────────────────────────────────────────────
interface Point {
  x: number;
  y: number;
}
const wrap = (v: number, max: number) => ((v % max) + max) % max;
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
// ── Constants ─────────────────────────────────────────────────────────────────
const POWERUP_DROP_CHANCE = 0.15;
const POWERUP_DURATION = 5;
const POWERUP_TTL = 12;
const TRIPLE_SPREAD = 0.18;
const MAX_DT = 0.05;
// ── Paleta neón del vault ─────────────────────────────────────────────────────
const COLORS = {
  bg: "#02030a",
  ship: "#00f5ff",
  rock: "#f5ff00",
  bullet: "#ffffff",
  powerUp: "#ff006e",
  thrust: "rgba(255, 0, 110, 0.9)",
} as const;
/** RGB de las partículas (se desvanecen con alpha). */
const SPARK_ROCK = "245,255,0";
const SPARK_SHIP = "0,245,255";

/**
 * Glow suave con shadowBlur. shadowBlur no se escala con la transformación del contexto,
 * así que se multiplica por la escala actual (devicePixelRatio) para verse igual en HiDPI.
 */
function glow(
  ctx: CanvasRenderingContext2D,
  color: string,
  blur: number,
): void {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur * ctx.getTransform().a;
}

/** Segundos de explosión tras perder la última vida antes de avisar del fin. */
const GAMEOVER_DELAY = 1;
// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl = 1.1;
  radius = 2;
  dead = false;
  constructor(x: number, y: number, angle: number) {
    const SPEED = 520;
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
  }
  update(dt: number): void {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = COLORS.bullet;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
// ── Asteroid ──────────────────────────────────────────────────────────────────
type AsteroidSize = 1 | 2 | 3;
const RADII = [0, 16, 30, 50]; // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32]; // velocidad base por tamaño
const POINTS = [0, 100, 50, 20]; // puntos por tamaño
class Asteroid {
  x: number;
  y: number;
  size: AsteroidSize;
  radius: number;
  dead = false;
  vx: number;
  vy: number;
  rotSpeed: number;
  rot: number;
  verts: [number, number][] = [];
  constructor(x: number, y: number, size: AsteroidSize = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = RADII[size];
    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);
    // Polígono irregular
    const n = randInt(8, 13);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }
  update(dt: number): void {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }
  split(): Asteroid[] {
    if (this.size <= 1) return [];
    const next = (this.size - 1) as AsteroidSize;
    return [
      new Asteroid(this.x, this.y, next),
      new Asteroid(this.x, this.y, next),
    ];
  }
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = COLORS.rock;
    ctx.lineWidth = 2;
    glow(ctx, COLORS.rock, 12);
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}
// ── PowerUp ───────────────────────────────────────────────────────────────────
class PowerUp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius = 12;
  ttl = POWERUP_TTL;
  dead = false;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 40);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }
  update(dt: number): void {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }
  draw(ctx: CanvasRenderingContext2D): void {
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;
    const pulse = 0.85 + Math.sin(performance.now() / 150) * 0.15;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = COLORS.powerUp;
    ctx.lineWidth = 2;
    glow(ctx, COLORS.powerUp, 18);
    const r = this.radius * pulse;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = COLORS.powerUp;
    glow(ctx, COLORS.powerUp, 8);
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("3x", this.x, this.y);
    ctx.restore();
  }
}
// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  tripleShot = 0;
  x = W / 2;
  y = H / 2;
  angle = -Math.PI / 2;
  vx = 0;
  vy = 0;
  radius = 12;
  thrusting = false;
  invincible = 3;
  shootCooldown = 0;
  dead = false;
  constructor() {
    this.reset();
  }
  reset(): void {
    this.x = W / 2;
    this.y = H / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.radius = 12;
    this.thrusting = false;
    this.invincible = 3;
    this.shootCooldown = 0;
    this.dead = false;
  }
  update(dt: number, input: InputState): void {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleShot > 0) this.tripleShot -= dt;
    const ROT = 3.5; // rad/s
    const THRUST = 260; // px/s²
    const DRAG = 0.987;
    if (input.held("ArrowLeft")) this.angle -= ROT * dt;
    if (input.held("ArrowRight")) this.angle += ROT * dt;
    this.thrusting = input.held("ArrowUp");
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }
    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }
  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShot > 0) {
      return [
        new Bullet(ox, oy, this.angle - TRIPLE_SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + TRIPLE_SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }
  draw(ctx: CanvasRenderingContext2D): void {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0)
      return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = COLORS.ship;
    ctx.lineWidth = 2;
    glow(ctx, COLORS.ship, 14);
    ctx.lineJoin = "round";
    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo(20, 0); // nariz
    ctx.lineTo(-12, -9); // ala izquierda
    ctx.lineTo(-7, 0); // muesca trasera
    ctx.lineTo(-12, 9); // ala derecha
    ctx.closePath();
    ctx.stroke();
    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8, 4);
      ctx.strokeStyle = COLORS.thrust;
      glow(ctx, COLORS.powerUp, 8);
      ctx.stroke();
    }
    ctx.restore();
  }
}
// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead = false;
  /** Color "r,g,b" de la chispa. */
  rgb: string;
  constructor(x: number, y: number, rgb: string) {
    this.x = x;
    this.y = y;
    this.rgb = rgb;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl = this.life;
  }
  update(dt: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const alpha = this.ttl / this.life;
    // Sin shadowBlur: las partículas son muchas y el glow es caro.
    ctx.strokeStyle = `rgba(${this.rgb},${alpha.toFixed(2)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}
// ── Estado del juego ──────────────────────────────────────────────────────────
export type GameState = "playing" | "dead" | "gameover";
/** Mundo del juego: entidades, reglas y dibujo. No conoce el DOM ni el bucle. */
export class MeteoroWorld {
  ship!: Ship;
  bullets: Bullet[] = [];
  asteroids: Asteroid[] = [];
  particles: Particle[] = [];
  powerUps: PowerUp[] = [];
  score = 0;
  lives = 3;
  level = 1;
  state: GameState = "playing";
  deadTimer = 0;
  gameOverDelay = 0;
  powerUpSpawned = false;
  killsSinceSpawn = 0;
  constructor() {
    this.initGame();
  }
  private spawnAsteroids(count: number): void {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      this.asteroids.push(new Asteroid(x, y, 3));
    }
  }
  initGame(): void {
    this.ship = new Ship();
    this.bullets = [];
    this.asteroids = [];
    this.particles = [];
    this.powerUps = [];
    this.powerUpSpawned = false;
    this.killsSinceSpawn = 0;
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.state = "playing";
    this.deadTimer = 0;
    this.gameOverDelay = 0;
    this.spawnAsteroids(4);
  }
  /** ¿Terminó la explosión final y hay que avisar del fin de partida? */
  get gameOverReady(): boolean {
    return this.state === "gameover" && this.gameOverDelay <= 0;
  }
  private nextLevel(): void {
    this.level++;
    this.bullets = [];
    this.particles = [];
    this.powerUps = [];
    this.powerUpSpawned = false;
    this.killsSinceSpawn = 0;
    this.ship.reset();
    this.spawnAsteroids(3 + this.level);
  }
  private explode(x: number, y: number, count = 8, rgb = SPARK_ROCK): void {
    for (let i = 0; i < count; i++)
      this.particles.push(new Particle(x, y, rgb));
  }
  private killShip(): void {
    this.explode(this.ship.x, this.ship.y, 14, SPARK_SHIP);
    this.ship.dead = true;
    this.lives--;
    if (this.lives <= 0) {
      this.state = "gameover";
      this.gameOverDelay = GAMEOVER_DELAY;
    } else {
      this.state = "dead";
      this.deadTimer = 2;
    }
  }
  private updateParticles(dt: number): void {
    this.particles.forEach((p) => p.update(dt));
    this.particles = this.particles.filter((p) => !p.dead);
  }
  // ── Update ──────────────────────────────────────────────────────────────────
  update(dt: number, input: InputState): void {
    if (this.state === "gameover") {
      // Sin reinicio con Espacio: la plataforma abre el modal tras la explosión.
      this.gameOverDelay -= dt;
      this.updateParticles(dt);
      this.asteroids.forEach((a) => a.update(dt));
      return;
    }
    if (this.state === "dead") {
      this.deadTimer -= dt;
      this.updateParticles(dt);
      this.asteroids.forEach((a) => a.update(dt));
      if (this.deadTimer <= 0) {
        this.state = "playing";
        this.ship.reset();
      }
      return;
    }
    // Disparar
    if (input.pressed("Space")) {
      this.bullets.push(...this.ship.tryShoot());
    }
    this.ship.update(dt, input);
    this.bullets.forEach((b) => b.update(dt));
    this.asteroids.forEach((a) => a.update(dt));
    this.particles.forEach((p) => p.update(dt));
    this.powerUps.forEach((p) => p.update(dt));
    this.bullets = this.bullets.filter((b) => !b.dead);
    this.particles = this.particles.filter((p) => !p.dead);
    this.powerUps = this.powerUps.filter((p) => !p.dead);
    for (const p of this.powerUps) {
      if (!p.dead && dist(this.ship, p) < this.ship.radius + p.radius) {
        p.dead = true;
        this.ship.tripleShot = POWERUP_DURATION;
      }
    }
    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of this.bullets) {
      for (const a of this.asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          this.score += POINTS[a.size];
          this.explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!this.powerUpSpawned) {
            this.killsSinceSpawn++;
            const guaranteed = this.killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              this.powerUps.push(new PowerUp(a.x, a.y));
              this.powerUpSpawned = true;
            }
          }
        }
      }
    }
    this.asteroids = this.asteroids.filter((a) => !a.dead).concat(newAsteroids);
    this.bullets = this.bullets.filter((b) => !b.dead);
    // Nave vs asteroide
    if (this.ship.invincible <= 0) {
      for (const a of this.asteroids) {
        if (dist(this.ship, a) < this.ship.radius + a.radius * 0.82) {
          this.killShip();
          break;
        }
      }
    }
    // Nivel completado
    if (this.asteroids.length === 0) this.nextLevel();
  }
  // ── Draw ──────────────────────────────────────────────────────────────────
  // Sin HUD ni GAME OVER: los muestra la plataforma (HUD y modal de React).
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);
    this.particles.forEach((p) => p.draw(ctx));
    this.asteroids.forEach((a) => a.draw(ctx));
    this.powerUps.forEach((p) => p.draw(ctx));
    this.bullets.forEach((b) => b.draw(ctx));
    this.ship.draw(ctx);
  }
}
// ── Loop principal ────────────────────────────────────────────────────────────
/** Bucle `requestAnimationFrame` con `dt` en segundos limitado a 50 ms. */
export class GameLoop {
  private rafId: number | null = null;
  private lastTime: number | null = null;
  constructor(private readonly tick: (dt: number) => void) {}
  get running(): boolean {
    return this.rafId !== null;
  }
  start(): void {
    if (this.rafId !== null) return;
    this.lastTime = null;
    this.rafId = requestAnimationFrame(this.frame);
  }
  stop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.lastTime = null;
  }
  private frame = (ts: number): void => {
    const dt =
      this.lastTime === null
        ? 0
        : Math.min((ts - this.lastTime) / 1000, MAX_DT);
    this.lastTime = ts;
    this.tick(dt);
    this.rafId = requestAnimationFrame(this.frame);
  };
}

// ── API pública ───────────────────────────────────────────────────────────────

export interface MeteoroStats {
  score: number;
  lives: number;
  level: number;
  /** Segundos restantes de disparo triple; 0 si no está activo. */
  tripleShot: number;
}

export interface MeteoroCallbacks {
  /** Solo se llama cuando cambia algún valor (tripleShot redondeado a 0,1 s). */
  onStats: (stats: MeteoroStats) => void;
  onGameOver: (finalScore: number) => void;
  /** Tecla P / Escape. */
  onTogglePause: () => void;
}

export interface MeteoroGame {
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void;
}

/** Teclas cuyo comportamiento por defecto (scroll) se anula mientras se juega. */
const GAME_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
]);
const PAUSE_KEYS = new Set(["KeyP", "Escape"]);

/** ¿El evento viene de un campo donde el usuario escribe? */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

/**
 * Crea una partida de METEORO sobre `canvas` (resolución lógica 800×600; el backing store
 * puede ser mayor, p. ej. escalado por devicePixelRatio) y la arranca.
 * Gestiona su propio requestAnimationFrame y sus listeners; `destroy()` los elimina.
 */
export function createMeteoroGame(
  canvas: HTMLCanvasElement,
  callbacks: MeteoroCallbacks,
): MeteoroGame {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("METEORO: el navegador no admite canvas 2D");

  const world = new MeteoroWorld();
  const input = new InputState();
  let paused = false;
  let destroyed = false;
  let gameOverNotified = false;
  let lastStats: MeteoroStats | null = null;

  const draw = () => {
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    world.draw(ctx);
  };

  const emitStats = () => {
    const stats: MeteoroStats = {
      score: world.score,
      lives: world.lives,
      level: world.level,
      tripleShot: Math.max(0, Math.round(world.ship.tripleShot * 10) / 10),
    };
    if (
      lastStats &&
      lastStats.score === stats.score &&
      lastStats.lives === stats.lives &&
      lastStats.level === stats.level &&
      lastStats.tripleShot === stats.tripleShot
    )
      return;
    lastStats = stats;
    callbacks.onStats(stats);
  };

  const loop = new GameLoop((dt) => {
    world.update(dt, input);
    emitStats();
    draw();
    if (world.gameOverReady && !gameOverNotified) {
      gameOverNotified = true;
      loop.stop();
      callbacks.onGameOver(world.score);
    }
  });

  const onKeyDown = (e: KeyboardEvent) => {
    if (isTypingTarget(e.target)) return;
    if (world.state === "gameover") return; // partida terminada: no se capturan teclas
    if (PAUSE_KEYS.has(e.code)) {
      e.preventDefault();
      if (!e.repeat) callbacks.onTogglePause();
      return;
    }
    if (paused) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    input.keyDown(e.code);
  };
  const onKeyUp = (e: KeyboardEvent) => input.keyUp(e.code);
  const onBlur = () => input.clear();

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  emitStats();
  draw();
  loop.start();

  return {
    pause() {
      if (destroyed) return;
      paused = true;
      loop.stop();
      input.clear();
    },
    resume() {
      if (destroyed) return;
      paused = false;
      if (!gameOverNotified) loop.start();
    },
    restart() {
      if (destroyed) return;
      world.initGame();
      gameOverNotified = false;
      input.clear();
      emitStats();
      draw();
      if (!paused) loop.start();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      loop.stop();
      input.clear();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    },
  };
}

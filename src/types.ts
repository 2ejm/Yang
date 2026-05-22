export type UpgradeType = 'damage' | 'fireRate' | 'range' | 'maxHp' | 'regen' | 'speed' | 'magnet' | 'projectileCount';

export interface Upgrade {
  id: UpgradeType;
  name: string;
  desc: string;
  level: number;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  valuePerLevel: number;
}

export interface PlayerShip {
  x: number;
  y: number;
  angle: number;
  hp: number;
  maxHp: number;
  regen: number;
  speed: number;
  damage: number;
  fireRate: number; // shots per second
  lastFireTime: number;
  range: number;
  magnet: number;
  projectileCount: number;
}

export interface Meteor {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  angle: number;
  rotationSpeed: number;
  color: string;
  mineralType: 'common' | 'rare' | 'exotic';
  points: { x: number; y: number }[]; // rugged exterior coordinate offsets
}

export interface Mineral {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  type: 'common' | 'rare' | 'exotic';
  color: string;
  collected: boolean;
}

export interface PirateShip {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  angle: number;
  lastFireTime: number;
  radius: number;
  fireCooldown: number; // ms
}

export interface Laser {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  isEnemy: boolean;
  angle: number;
  radius: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'spark' | 'dust' | 'debris' | 'star';
}

export interface GameStats {
  score: number;
  mineralsCollected: number;
  meteorsDestroyed: number;
  piratesDestroyed: number;
  timeSurvived: number; // seconds
}

export type SheepType = 'normal' | 'fire' | 'freeze' | 'lightning' | 'poison';

export interface SheepUnit {
  id: string;
  type: SheepType;
  tier: number; // Tier 1, 2, 3, etc.
  slotIdx: number; // 0 to 15 on a 4x4 posture grid
  x: number; // calculated visual position
  y: number; // calculated visual position
  lastShotTime: number; // to control firing rate
}

export interface GoldSheepUnit {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isChewing: boolean;
  chewTimer: number;
  flipX: boolean;
}

export interface Wolf {
  id: string;
  x: number;
  y: number;
  maxHp: number;
  hp: number;
  speed: number;
  baseSpeed: number; // original velocity
  size: number; // wolf physical size, scales up with rounds
  damage: number; // damage dealt to fence per second
  waveNum: number; // the wave they belong to
  slowTimer: number; // duration of slowing effect
  poisonTimer: number; // duration of poison DOT
  poisonDmg: number; // DPS of poison
  attackCooldown: number; // frequency of fence bites
  lastAttackTime: number; // timestamp of last fence bite
}

export interface Projectile {
  id: string;
  type: SheepType;
  tier: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetWolfId: string;
  damage: number;
  speed: number;
  splashRadius?: number;
  chainCount?: number; // for electric sheep chain lightning jumps
  hasChainedId?: string[]; // track hit wolves to prevent backward looping
}

export interface GameStats {
  score: number;
  gold: number;
  waveNum: number;
  waveTimeLeft: number; // countdown in seconds
  waveTotalDuration: number; // e.g. 30 seconds
  goldSheepCount: number;
  wolvesDefeated: number;
  fenceHp: number;
  fenceMaxHp: number;
  fenceRegen: number; // hp restored per second
  highScore: number;
}

// Global upgrade levels that players can purchase with gold
export interface DefenseUpgrades {
  normalAtkLevel: number; // damage amplification percentage for Normal Sheep
  fireAtkLevel: number;   // damage amplification percentage for Fire Sheep
  freezeSlowLevel: number; // increase slow duration or rate for Ice Sheep
  lightningAtkLevel: number; // lightning damage and chain speed boost
  poisonAtkLevel: number;   // poison TICK damage boost
  fenceUpgradeLevel: number; // max hp increase
  fenceRegenLevel: number;  // defense fence self-repair level
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'fleece' | 'spark' | 'ember' | 'ice' | 'zap' | 'toxic' | 'rep' | 'gold_coin';
  opacity?: number;
}

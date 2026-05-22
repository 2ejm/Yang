import React, { useEffect, useRef, useState } from 'react';
import { GameStats, DefenseUpgrades, SheepUnit, SheepType, GoldSheepUnit, Wolf, Projectile, Particle } from '../types';
import { sfx } from '../utils/audio';

interface GameCanvasProps {
  stats: GameStats;
  setStats: React.Dispatch<React.SetStateAction<GameStats>>;
  upgrades: DefenseUpgrades;
  sheepUnits: SheepUnit[];
  setSheepUnits: React.Dispatch<React.SetStateAction<SheepUnit[]>>;
  selectedSlotIdx: number | null;
  setSelectedSlotIdx: (idx: number | null) => void;
  isPlaying: boolean;
  isPaused: boolean;
  onGameOver: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  stats,
  setStats,
  upgrades,
  sheepUnits,
  setSheepUnits,
  selectedSlotIdx,
  setSelectedSlotIdx,
  isPlaying,
  isPaused,
  onGameOver,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // High FPS physics refs
  const frameIdRef = useRef<number | null>(null);
  const dimensionsRef = useRef({ width: 800, height: 550 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 550 });

  // Entity Lists
  const wolvesRef = useRef<Wolf[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const goldSheepsRef = useRef<GoldSheepUnit[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  // Timers and spawn controllers
  const lastStateUpdateSecRef = useRef<number>(0);
  const wolfSpawnTimerRef = useRef<number>(0); // countdown in ms to next wolf spawn
  const incomeTimerRef = useRef<number>(0); // timer in ms for periodic gold income payout

  // Track mouse coordinates for slot highlight
  const mouseRef = useRef({ x: 0, y: 0 });
  const isMouseInCanvasRef = useRef(false);

  // Grid offsets & geometric spacing
  const gridConfig = {
    rowCount: 4,
    colCount: 4,
    slotSize: 62,
    gap: 12,
    xOffset: 50,
    yOffset: 160,
  };

  // Convert slot index (0-15) to pasture 2D coordinates (X, Y center)
  const getSlotCoord = (idx: number) => {
    const row = Math.floor(idx / gridConfig.colCount);
    const col = idx % gridConfig.colCount;
    const x = gridConfig.xOffset + col * (gridConfig.slotSize + gridConfig.gap) + gridConfig.slotSize / 2;
    const y = gridConfig.yOffset + row * (gridConfig.slotSize + gridConfig.gap) + gridConfig.slotSize / 2;
    return { x, y };
  };

  // Find slot index from coordinates (returns null if not in a slot)
  const getSlotIndexFromCoord = (x: number, y: number) => {
    for (let i = 0; i < 16; i++) {
      const coord = getSlotCoord(i);
      const dist = Math.hypot(x - coord.x, y - coord.y);
      if (dist < gridConfig.slotSize / 2 + 2) {
        return i;
      }
    }
    return null;
  };

  // Sync dimensions and initialize Golden Sheep backyard roster
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const w = width || 800;
        const h = height || 550;
        dimensionsRef.current = { width: w, height: h };
        setDimensions({ width: w, height: h });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Set up golden sheep when goldSheepCount property changes in parent React state
  useEffect(() => {
    const diff = stats.goldSheepCount - goldSheepsRef.current.length;
    if (diff > 0) {
      // Add missing gold sheep
      for (let i = 0; i < diff; i++) {
        goldSheepsRef.current.push({
          id: Math.random().toString(36).substring(2, 9),
          x: 60 + Math.random() * 260,
          y: 35 + Math.random() * 60,
          vx: (Math.random() * 0.4 - 0.2),
          vy: (Math.random() * 0.3 - 0.15),
          isChewing: false,
          chewTimer: 0,
          flipX: Math.random() > 0.5,
        });
      }
    } else if (diff < 0) {
      // Shink list
      goldSheepsRef.current = goldSheepsRef.current.slice(0, stats.goldSheepCount);
    }
  }, [stats.goldSheepCount]);

  // Restart everything on game start
  useEffect(() => {
    if (isPlaying) {
      wolvesRef.current = [];
      projectilesRef.current = [];
      particlesRef.current = [];
      wolfSpawnTimerRef.current = 1000; // spawn first wolf very quickly
      incomeTimerRef.current = 5000; // first income in 5 seconds
      lastStateUpdateSecRef.current = 0;

      // Reset Gold Sheep Units
      goldSheepsRef.current = [];
      for (let i = 0; i < stats.goldSheepCount; i++) {
        goldSheepsRef.current.push({
          id: Math.random().toString(36).substring(2, 9),
          x: 60 + Math.random() * 260,
          y: 35 + Math.random() * 60,
          vx: (Math.random() * 0.4 - 0.2),
          vy: (Math.random() * 0.3 - 0.15),
          isChewing: false,
          chewTimer: 0,
          flipX: Math.random() > 0.5,
        });
      }
    }
  }, [isPlaying]);

  // Handle Canvas Interaction clicks
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPlaying || isPaused) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const clickedSlotIdx = getSlotIndexFromCoord(clickX, clickY);

    if (clickedSlotIdx !== null) {
      const sheepInClickedSlot = sheepUnits.find((u) => u.slotIdx === clickedSlotIdx);

      // If we clicked a pasture slot:
      if (selectedSlotIdx === null) {
        // First selection behavior: select slot if a sheep sits there
        if (sheepInClickedSlot) {
          setSelectedSlotIdx(clickedSlotIdx);
          sfx.playBaa(1.1); // friendly bleat
        }
      } else {
        // Second selection behavior: we already have a selected sheep
        const selectedSheepUnit = sheepUnits.find((u) => u.slotIdx === selectedSlotIdx);

        if (selectedSheepUnit) {
          if (clickedSlotIdx === selectedSlotIdx) {
            // Deselect on clicking the same unit
            setSelectedSlotIdx(null);
          } else if (!sheepInClickedSlot) {
            // Move sheep to empty slot!
            const coords = getSlotCoord(clickedSlotIdx);
            const updatedUnits = sheepUnits.map((u) => {
              if (u.slotIdx === selectedSlotIdx) {
                return { ...u, slotIdx: clickedSlotIdx, x: coords.x, y: coords.y };
              }
              return u;
            });
            setSheepUnits(updatedUnits);
            setSelectedSlotIdx(null);
            sfx.playShoot('normal'); // move sound
          } else {
            // Swapping sheep units! Or selecting the other sheep unit
            const coordsTarget = getSlotCoord(clickedSlotIdx);
            const coordsSource = getSlotCoord(selectedSlotIdx);
            const updatedUnits = sheepUnits.map((u) => {
              if (u.slotIdx === selectedSlotIdx) {
                return { ...u, slotIdx: clickedSlotIdx, x: coordsTarget.x, y: coordsTarget.y };
              }
              if (u.slotIdx === clickedSlotIdx) {
                return { ...u, slotIdx: selectedSlotIdx, x: coordsSource.x, y: coordsSource.y };
              }
              return u;
            });
            setSheepUnits(updatedUnits);
            setSelectedSlotIdx(null);
            sfx.playShoot('normal');
          }
        } else {
          setSelectedSlotIdx(null);
        }
      }
    } else {
      // Clicked outside pasture: deselect
      setSelectedSlotIdx(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    isMouseInCanvasRef.current = true;
  };

  // Helper Spark generator
  const spawnParticles = (
    x: number, 
    y: number, 
    color: string, 
    count: number = 8, 
    type: Particle['type'] = 'spark',
    avgSpeed: number = 2.0
  ) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * avgSpeed + 0.6;
      particlesRef.current.push({
        id: Math.random().toString(36).substring(2, 9),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: Math.random() * 20 + 15,
        size: Math.random() * 3 + 1,
        color,
        type,
        opacity: 1,
      });
    }
  };

  // Spawns wolf based on wave level
  const spawnWolf = (waveNum: number) => {
    const w = dimensionsRef.current.width;

    // Create a group pack size that scales with wave progression
    const packSize = Math.max(1, Math.min(6, Math.floor(1 + (waveNum - 1) * 0.45)));
    
    // Softer HP scaling for swarms to be clean and satisfying to wipe out!
    const baseHp = Math.round(30 * Math.pow(1.16, waveNum - 1) + (waveNum - 1) * 5);
    const size = Math.min(26, 12 + waveNum * 0.7); // size increase
    const speed = Math.min(2.1, 0.65 + waveNum * 0.08); // speed scaling
    const fenceDmg = 5 + waveNum * 1.5; // bite severity

    for (let i = 0; i < packSize; i++) {
      const spawnX = w + 20 + i * (25 + Math.random() * 20); // slightly staggered
      const spawnY = 150 + Math.random() * (dimensionsRef.current.height - 210);

      wolvesRef.current.push({
        id: Math.random().toString(36).substring(2, 9),
        x: spawnX,
        y: spawnY,
        maxHp: baseHp,
        hp: baseHp,
        speed: speed * (0.9 + Math.random() * 0.2), // slight random speed variation
        baseSpeed: speed,
        size,
        damage: fenceDmg,
        waveNum,
        slowTimer: 0,
        poisonTimer: 0,
        poisonDmg: 0,
        attackCooldown: 1000, // bite every 1.0s
        lastAttackTime: 0,
      });
    }
  };

  // The physics and drawing loop
  const performGameStep = (timestamp: number) => {
    if (isPaused || !isPlaying) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      frameIdRef.current = requestAnimationFrame(performGameStep);
      return;
    }

    const w = dimensionsRef.current.width;
    const h = dimensionsRef.current.height;
    const deltaMs = 16.66; // 60 FPS approx

    // ----------------------------------------------------
    // PHYSICS GAUGE & COUNTER TICK (Once per second)
    // ----------------------------------------------------
    const curSecond = Math.floor(timestamp / 1000);
    if (curSecond !== lastStateUpdateSecRef.current) {
      lastStateUpdateSecRef.current = curSecond;

      // 1. Tick Wave duration timer
      setStats((prev) => {
        let nextTimer = prev.waveTimeLeft - 1;
        let nextWaveNum = prev.waveNum;
        let nextScores = prev.score + 1; // survival points

        if (nextTimer <= 0) {
          nextWaveNum += 1;
          nextTimer = prev.waveTotalDuration;
          
          // Trigger alarm
          sfx.playWaveAlert();
          
          // Trigger floating banner/text particle
          spawnParticles(w / 2, h / 2, '#38bdf8', 35, 'rep', 3.5);
        }

        // Apply automatic Fence HP regeneration if upgraded
        let nextFenceHp = prev.fenceHp;
        if (upgrades.fenceRegenLevel > 0 && nextFenceHp < prev.fenceMaxHp) {
          const regenVal = upgrades.fenceRegenLevel * 3; // +3 hp per sec per lvl
          nextFenceHp = Math.min(prev.fenceMaxHp, nextFenceHp + regenVal);
          
          // Sparkly green sparkles on the wall to show self-repair
          if (nextFenceHp > prev.fenceHp) {
            spawnParticles(420, 100 + Math.random() * (h - 150), '#10b981', 3, 'rep', 1);
          }
        }

        return {
          ...prev,
          waveTimeLeft: nextTimer,
          waveNum: nextWaveNum,
          score: nextScores,
          fenceHp: nextFenceHp,
        };
      });
    }

    // ----------------------------------------------------
    // INCOMS (Resource Sheep Periodic payout ticks)
    // ----------------------------------------------------
    incomeTimerRef.current -= deltaMs;
    if (incomeTimerRef.current <= 0) {
      incomeTimerRef.current = 5000; // pay income every 5 seconds

      const incomeValue = stats.goldSheepCount * 12; // 12G per gold sheep
      if (incomeValue > 0) {
        setStats((prev) => ({ ...prev, gold: prev.gold + incomeValue, score: prev.score + incomeValue * 2 }));
        sfx.playCoin();

        // Emit massive coin particles on all gold sheep!
        goldSheepsRef.current.forEach((gs) => {
          spawnParticles(gs.x, gs.y - 10, '#fbbf24', 5, 'gold_coin', 1.8);
        });
      }
    }

    // ----------------------------------------------------
    // WOLVES SPAWN TICKER
    // ----------------------------------------------------
    wolfSpawnTimerRef.current -= deltaMs;
    if (wolfSpawnTimerRef.current <= 0) {
      // Spawn next wolf swarm pack
      spawnWolf(stats.waveNum);

      // Set cooldown: significantly reduced wait time for a swarming feel
      const minSpawnRate = 900;
      const baseSpawnRate = 3800;
      wolfSpawnTimerRef.current = Math.max(minSpawnRate, baseSpawnRate - stats.waveNum * 180 - Math.random() * 1200);
    }

    // ----------------------------------------------------
    // PHYSICS: WANDERING RESURCE SHEEP
    // ----------------------------------------------------
    goldSheepsRef.current.forEach((gs) => {
      if (gs.isChewing) {
        gs.chewTimer -= deltaMs;
        if (gs.chewTimer <= 0) {
          gs.isChewing = false;
          // select new random velocity vector
          const moveAngle = Math.random() * Math.PI * 2;
          const moveSpeed = 0.15 + Math.random() * 0.25;
          gs.vx = Math.cos(moveAngle) * moveSpeed;
          gs.vy = Math.sin(moveAngle) * moveSpeed;
          gs.flipX = gs.vx < 0;
        }
      } else {
        gs.x += gs.vx;
        gs.y += gs.vy;

        // Backyard fence boundary checks: x from 40 to 350, y from 15 to 110
        if (gs.x < 40 || gs.x > 350 || gs.y < 15 || gs.y > 110) {
          // steer back
          const angleToCenter = Math.atan2(60 - gs.y, 200 - gs.x);
          const moveSpeed = 0.2;
          gs.vx = Math.cos(angleToCenter) * moveSpeed;
          gs.vy = Math.sin(angleToCenter) * moveSpeed;
          gs.flipX = gs.vx < 0;
        }

        // Probability of chewing grass
        if (Math.random() < 0.003) {
          gs.isChewing = true;
          gs.chewTimer = 1000 + Math.random() * 2000;
          gs.vx = 0;
          gs.vy = 0;
        }
      }
    });

    // ----------------------------------------------------
    // PHYSICS: HOSTILE WOLF PACKS RUNNING & BITING
    // ----------------------------------------------------
    const nextWolves: Wolf[] = [];
    wolvesRef.current.forEach((wolf) => {
      const fenceX = 420; // x line of our wall

      // Manage Status durations
      if (wolf.slowTimer > 0) {
        wolf.slowTimer -= deltaMs;
        wolf.speed = wolf.baseSpeed * 0.45; // slowed to 45%
        if (wolf.slowTimer <= 0) {
          wolf.speed = wolf.baseSpeed;
        }
      }

      if (wolf.poisonTimer > 0) {
        wolf.poisonTimer -= deltaMs;
        // Do DOT damage
        const dotTickValue = (wolf.poisonDmg / 60); // damage per frame
        wolf.hp -= dotTickValue;
        
        // Spawn green poison particles
        if (Math.random() < 0.06) {
          spawnParticles(wolf.x, wolf.y, '#a21caf', 2, 'toxic', 0.8);
        }
      }

      // Check if dead from Poison DOT or previous damage
      if (wolf.hp <= 0) {
        // Wolf dies!
        sfx.playHit('normal');
        spawnParticles(wolf.x, wolf.y, '#4b5563', 8, 'spark', 1.5);
        setStats((prev) => ({
          ...prev,
          wolvesDefeated: prev.wolvesDefeated + 1,
          gold: prev.gold + (5 + wolf.waveNum), // reward gold on wolf death!
          score: prev.score + wolf.waveNum * 15,
        }));
        return; // drop wolf from next list
      }

      const reachWall = (wolf.x - wolf.size) <= fenceX;

      if (!reachWall) {
        // Move towards the left fence!
        wolf.x -= wolf.speed;
      } else {
        // Arrive at fence! Force lock position
        wolf.x = fenceX + wolf.size;

        // Perform biting attacks on fence!
        const curTime = timestamp;
        if (curTime - wolf.lastAttackTime > wolf.attackCooldown) {
          wolf.lastAttackTime = curTime;
          sfx.playFenceDamage();
          spawnParticles(fenceX, wolf.y, '#d97706', 4, 'spark', 1.8);

          // Deduct fence health
          setStats((prev) => {
            const nextHp = prev.fenceHp - wolf.damage;
            if (nextHp <= 0) {
              // Game over triggers!
              setTimeout(() => onGameOver(), 10);
            }
            return {
              ...prev,
              fenceHp: Math.max(0, nextHp),
            };
          });
        }
      }

      nextWolves.push(wolf);
    });
    wolvesRef.current = nextWolves;

    // ----------------------------------------------------
    // SHEEP FIRE SELECTION ENGINE
    // ----------------------------------------------------
    sheepUnits.forEach((sheep) => {
      // Rates based on Tiers: faster firing on Tier 3!
      // Tier 1: 1000ms, Tier 2: 800ms, Tier 3: 550ms
      const fireCoold = Math.max(400, 1100 - sheep.tier * 200);
      const rightNow = timestamp;

      if (rightNow - sheep.lastShotTime > fireCoold) {
        // Identify target wolf
        // Defense sheep ONLY target wolves in their line of sight/range
        // Because wolves are only on the right, sheep on the left shoot rightward
        let bestTarget: Wolf | null = null;
        let minDistanceValue = 400 + sheep.tier * 100; // max shoot range gets scaled on Tier

        wolvesRef.current.forEach((w) => {
          const dst = Math.hypot(w.x - sheep.x, w.y - sheep.y);
          if (dst < minDistanceValue) {
            minDistanceValue = dst;
            bestTarget = w;
          }
        });

        if (bestTarget) {
          const wolf: Wolf = bestTarget;
          sfx.playShoot(sheep.type);
          sheep.lastShotTime = rightNow;

          // Calculate Damage based on Type upgrades!
          let baseTypeDmg = 15;
          let upgradeMultPercent = 100;

          if (sheep.type === 'normal') {
            baseTypeDmg = 16;
            upgradeMultPercent = 100 + upgrades.normalAtkLevel * 15;
          } else if (sheep.type === 'fire') {
            baseTypeDmg = 14;
            upgradeMultPercent = 100 + upgrades.fireAtkLevel * 15;
          } else if (sheep.type === 'freeze') {
            baseTypeDmg = 10;
            upgradeMultPercent = 100 + upgrades.freezeSlowLevel * 10;
          } else if (sheep.type === 'lightning') {
            baseTypeDmg = 9;
            upgradeMultPercent = 100 + upgrades.lightningAtkLevel * 15;
          } else if (sheep.type === 'poison') {
            baseTypeDmg = 6;
            upgradeMultPercent = 100 + upgrades.poisonAtkLevel * 15;
          }

          // Tier boosts damage exponentially!
          // Tier 1: x1, Tier 2: x3.2, Tier 3: x10
          const tierScale = sheep.tier === 1 ? 1 : sheep.tier === 2 ? 3.2 : 10;
          const finalDamage = Math.round(baseTypeDmg * (upgradeMultPercent / 100) * tierScale);

          // Find shooting angle vector
          const shootAngle = Math.atan2(wolf.y - sheep.y, wolf.x - sheep.x);
          const bulletSpeed = 9;

          projectilesRef.current.push({
            id: Math.random().toString(36).substring(2, 9),
            type: sheep.type,
            tier: sheep.tier,
            x: sheep.x,
            y: sheep.y,
            vx: Math.cos(shootAngle) * bulletSpeed,
            vy: Math.sin(shootAngle) * bulletSpeed,
            targetWolfId: wolf.id,
            damage: finalDamage,
            speed: bulletSpeed,
            splashRadius: sheep.type === 'fire' ? (50 + sheep.tier * 20) : undefined,
          });
        }
      }
    });

    // ----------------------------------------------------
    // PHYSICS: PROJECTILES PROPAGATING & IMPACT
    // ----------------------------------------------------
    const nextProjectiles: Projectile[] = [];
    projectilesRef.current.forEach((proj) => {
      // Find track wolf
      const targetWolf = wolvesRef.current.find((w) => w.id === proj.targetWolfId);

      if (targetWolf) {
        // Homing bullet adjustments!
        const dX = targetWolf.x - proj.x;
        const dY = targetWolf.y - proj.y;
        const dDist = Math.hypot(dX, dY);

        if (dDist > 12) {
          // Adjust velocity vectors
          proj.vx = (dX / dDist) * proj.speed;
          proj.vy = (dY / dDist) * proj.speed;
          
          // Propagate
          proj.x += proj.vx;
          proj.y += proj.vy;
          
          nextProjectiles.push(proj);
        } else {
          // Collided with target wolf! Execute element mechanics
          executeBulletImpact(proj, targetWolf);
        }
      } else {
        // Target is dead. Homing turns to straight propagation
        proj.x += proj.vx;
        proj.y += proj.vy;

        // If hits any other wolf, crack it!
        let hasHitAny = false;
        for (let i = 0; i < wolvesRef.current.length; i++) {
          const w = wolvesRef.current[i];
          const dist = Math.hypot(w.x - proj.x, w.y - proj.y);
          if (dist < w.size) {
            executeBulletImpact(proj, w);
            hasHitAny = true;
            break;
          }
        }

        // Keep inside bounds if did not crash yet
        if (!hasHitAny && proj.x > 0 && proj.x < w && proj.y > 0 && proj.y < h) {
          nextProjectiles.push(proj);
        }
      }
    });
    projectilesRef.current = nextProjectiles;

    // Bullet impact handler helper
    function executeBulletImpact(proj: Projectile, wolf: Wolf) {
      sfx.playHit(proj.type);

      if (proj.type === 'normal') {
        wolf.hp -= proj.damage;
        // grey fluffy wool particles
        spawnParticles(wolf.x, wolf.y, '#f1f5f9', 5, 'fleece', 1.2);
      } 
      else if (proj.type === 'fire') {
        // Fire splash explosion damages ALL wolves in circle
        const radius = proj.splashRadius || 60;
        
        // Spawn massive fire plume particles
        spawnParticles(proj.x, proj.y, '#f97316', 15, 'ember', 2.5);
        sfx.playHit('fire');

        wolvesRef.current.forEach((w) => {
          const splDist = Math.hypot(w.x - proj.x, w.y - proj.y);
          if (splDist < radius) {
            // damages proportional to center distance:
            const intensity = 1.0 - (splDist / (radius * 1.2));
            const splDmg = Math.round(proj.damage * Math.max(0.4, intensity));
            w.hp -= splDmg;
            
            // tiny red text/amber flare
            if (Math.random() < 0.2) {
              spawnParticles(w.x, w.y, '#ef4444', 3, 'ember', 0.8);
            }
          }
        });
      } 
      else if (proj.type === 'freeze') {
        wolf.hp -= proj.damage;
        // Freeze slow timer: 2.5s base, scales up on level
        const slowMs = 2500 + upgrades.freezeSlowLevel * 150;
        wolf.slowTimer = Math.max(wolf.slowTimer, slowMs);
        
        // Blue icy sparkles
        spawnParticles(wolf.x, wolf.y, '#38bdf8', 6, 'ice', 1.5);
        sfx.playHit('freeze');
      } 
      else if (proj.type === 'lightning') {
        wolf.hp -= proj.damage;
        spawnParticles(wolf.x, wolf.y, '#facc15', 5, 'zap', 2.0);

        // Chain Lightning jumps to 2-4 alternative nearby wolves!
        const maxChains = proj.tier === 1 ? 2 : proj.tier === 2 ? 3 : 5;
        let chainTargetIds = [wolf.id];
        let currentChainWolf = wolf;

        for (let i = 0; i < maxChains; i++) {
          let nextChainWolf: Wolf | null = null;
          let minChainDist = 140; // chain jumping distance

          for (let j = 0; j < wolvesRef.current.length; j++) {
            const w = wolvesRef.current[j];
            if (chainTargetIds.includes(w.id)) continue;

            const chainDist = Math.hypot(w.x - currentChainWolf.x, w.y - currentChainWolf.y);
            if (chainDist < minChainDist) {
              minChainDist = chainDist;
              nextChainWolf = w;
            }
          }

          if (nextChainWolf) {
            // Add chain connection lines drawing!
            // In canvas, we can push connection particle lines
            particlesRef.current.push({
              id: Math.random().toString(36).substring(2, 9),
              x: currentChainWolf.x,
              y: currentChainWolf.y,
              vx: nextChainWolf.x, // carry target coordinate for vector lines drawing!
              vy: nextChainWolf.y,
              life: 0,
              maxLife: 6, // flashes instantly
              size: 2,
              color: '#fbbf24',
              type: 'zap',
            });

            // Deal chain damage: slightly decaying
            const chainDmg = Math.round(proj.damage * 0.82);
            nextChainWolf.hp -= chainDmg;
            spawnParticles(nextChainWolf.x, nextChainWolf.y, '#fbbf24', 2, 'zap', 1.2);
            
            chainTargetIds.push(nextChainWolf.id);
            currentChainWolf = nextChainWolf;
          } else {
            break; // no other wolves near
          }
        }
      } 
      else if (proj.type === 'poison') {
        wolf.hp -= proj.damage;
        // Poison DOT parameters: ticks every 500ms, last 4 seconds
        // Tier 1: 3/tick. Tier 2: 10/tick. Tier 3: 35/tick + upgrade level multiplier
        const baseTick = proj.tier === 1 ? 5 : proj.tier === 2 ? 18 : 60;
        const multiplier = 100 + upgrades.poisonAtkLevel * 15;
        const tickDmg = Math.round(baseTick * (multiplier / 100));

        wolf.poisonTimer = 4000; // poison ticks last 4 seconds
        wolf.poisonDmg = tickDmg * 2.0; // stores annualized DPS

        spawnParticles(wolf.x, wolf.y, '#e879f9', 7, 'toxic', 1.3);
      }
    }

    // ----------------------------------------------------
    // PHYSICS: FLOATING EFFECTS & RENDER PARTICLES
    // ----------------------------------------------------
    const nextParticles: Particle[] = [];
    particlesRef.current.forEach((p) => {
      p.life++;
      p.opacity = 1 - (p.life / p.maxLife);

      if (p.type === 'zap') {
        // Zap particles are instantaneous lighting bolt connectors, no velocity physics
        if (p.life < p.maxLife) {
          nextParticles.push(p);
        }
      } else {
        p.x += p.vx;
        p.y += p.vy;
        
        // float slightly upwards for coins/greetings
        if (p.type === 'gold_coin' || p.type === 'rep') {
          p.vy -= 0.015;
        }

        if (p.life < p.maxLife) {
          nextParticles.push(p);
        }
      }
    });
    particlesRef.current = nextParticles;

    // ----------------------------------------------------
    // DRAWING SCENERY & RANCH BACKGROUNDS
    // ----------------------------------------------------
    // 1. Lush green pasture field grass
    ctx.fillStyle = '#14532d'; // elegant deep dark pasture green
    ctx.fillRect(0, 0, w, h);

    // Decorative lighter grass clovers
    ctx.strokeStyle = '#15803d'; // slightly brighter green grid veins
    ctx.lineWidth = 1;
    for (let lX = 50; lX < w; lX += 80) {
      ctx.beginPath();
      ctx.moveTo(lX, 0);
      ctx.lineTo(lX, h);
      ctx.stroke();
    }
    for (let lY = 40; lY < h; lY += 80) {
      ctx.beginPath();
      ctx.moveTo(0, lY);
      ctx.lineTo(w, lY);
      ctx.stroke();
    }

    // 2. Draw INCOME SHEEP GARDEN (BACKYARD pasture at top-left)
    ctx.fillStyle = '#064e3b'; // slightly contrasting dark pine green
    ctx.fillRect(30, 10, 335, 115);
    
    // Draw gold boundary fence
    ctx.strokeStyle = '#eab308'; // glowing yellow/gold border fence
    ctx.lineWidth = 2.5;
    ctx.strokeRect(30, 10, 335, 115);

    // Draw little wooden sign "황금 목장 (G+)"
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(140, 5, 110, 15);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1;
    ctx.strokeRect(140, 5, 110, 15);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 9px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('🪙 황금 인컴 목장 (골드양)', 195, 16);

    // 3. Draw MAIN COMBAT PASTURE (Where defensive sheeps live)
    ctx.fillStyle = '#166534'; // bright battle field
    ctx.fillRect(40, 150, 315, 315);
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 150, 315, 315);

    // Grid slots drawings (4x4)
    for (let i = 0; i < 16; i++) {
      const coord = getSlotCoord(i);
      const isSelected = selectedSlotIdx === i;
      
      // Determine if hovered
      const slotMouseDist = Math.hypot(mouseRef.current.x - coord.x, mouseRef.current.y - coord.y);
      const isHovered = isMouseInCanvasRef.current && slotMouseDist < gridConfig.slotSize / 2;

      ctx.save();
      // Draw circular pen
      ctx.beginPath();
      ctx.arc(coord.x, coord.y, gridConfig.slotSize / 2, 0, Math.PI * 2);
      
      if (isSelected) {
        ctx.fillStyle = 'rgba(99, 102, 241, 0.45)'; // vibrant indigo highlight
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2.5;
      } else if (isHovered) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)'; // white highlight
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1.6;
      } else {
        ctx.fillStyle = 'rgba(20, 83, 45, 0.45)'; // dark pen
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 1.2;
      }

      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 4. Draw THE DEFENSIVE WOODEN FENCE (울타리)
    const fenceX = 420;
    ctx.save();
    ctx.fillStyle = '#78350f'; // mahogany dark brown
    ctx.fillRect(fenceX - 10, 10, 20, h - 20);

    // Draw horizontal steel locks and logs
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    for (let fY = 20; fY < h - 20; fY += 30) {
      // Wood grains
      ctx.beginPath();
      ctx.moveTo(fenceX - 10, fY);
      ctx.lineTo(fenceX + 10, fY);
      ctx.stroke();

      // Wood log nodules
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(fenceX, fY + 10, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Outer thick framing
    ctx.strokeStyle = '#d97706'; // glowing iron strips
    ctx.lineWidth = 1.2;
    ctx.strokeRect(fenceX - 11, 10, 22, h - 20);
    ctx.restore();

    // ----------------------------------------------------
    // ENTITIES DRAWING PORTION (Sheep, Wolves, Bullet, etc)
    // ----------------------------------------------------
    
    // A. Draw GOLD RESOURCE SHEEP Units
    goldSheepsRef.current.forEach((gs) => {
      ctx.save();
      ctx.translate(gs.x, gs.y);
      if (gs.flipX) {
        ctx.scale(-1, 1);
      }

      // 1. Shadow
      ctx.fillStyle = 'rgba(5, 46, 22, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 10, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 1.5 Tiny Cute Legs (Layered behind fleece)
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-5, 4); ctx.lineTo(-5, 10);
      ctx.moveTo(-2, 4); ctx.lineTo(-2, 10);
      ctx.moveTo(2, 4); ctx.lineTo(2, 10);
      ctx.moveTo(5, 4); ctx.lineTo(5, 10);
      ctx.stroke();
      // tiny black hooves
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-6, 9.5, 2, 2);
      ctx.fillRect(-3, 9.5, 2, 2);
      ctx.fillRect(1, 9.5, 2, 2);
      ctx.fillRect(4, 9.5, 2, 2);

      // 2. Head & Ear (Left facing body primarily)
      ctx.fillStyle = '#fef08a'; // pale yellow skin
      ctx.beginPath();
      ctx.arc(-11, -1, 5.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Little floppy head ear
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(-8, -4, 2, 3.5, -0.4, 0, Math.PI * 2);
      ctx.fill();
      
      // tiny gold horn
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(-12, -5);
      ctx.quadraticCurveTo(-15, -10, -10, -11);
      ctx.stroke();

      // 3. Fluffy Gold Body (Chubby circles clumped)
      ctx.fillStyle = '#fbbf24'; // bright sparkly gold
      const puffs = [
        { cx: 0, cy: -4, r: 8 },
        { cx: -5, cy: 1, r: 7.5 },
        { cx: 5, cy: 1, r: 7.5 },
        { cx: 6, cy: -3, r: 7 },
        { cx: -1, cy: 5, r: 8 },
      ];
      puffs.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // 4. Googly Eyes
      ctx.fillStyle = '#1e293b'; // dark eye
      ctx.beginPath();
      ctx.arc(-12, -2, 1.4, 0, Math.PI * 2);
      ctx.fill();

      // 5. Chew Animation grass
      if (gs.isChewing) {
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-13, 2);
        ctx.lineTo(-18, 5 + Math.sin(timestamp * 0.015) * 2);
        ctx.stroke();
      }

      ctx.restore();
    });

    // B. Draw DEFENSIVE COMBAT SHEEP UNITS
    sheepUnits.forEach((sheep) => {
      ctx.save();
      ctx.translate(sheep.x, sheep.y);

      // 1. Pen Ground Shadow
      ctx.fillStyle = 'rgba(20, 83, 45, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 15, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Size scale based on Tier
      const sizeScale = sheep.tier === 1 ? 1.0 : sheep.tier === 2 ? 1.25 : 1.52;

      // 1.5 Tiny Cute Legs (Layered behind fleece)
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.8 * sizeScale;
      ctx.beginPath();
      ctx.moveTo(-5 * sizeScale, 4 * sizeScale); ctx.lineTo(-5 * sizeScale, 13 * sizeScale);
      ctx.moveTo(-1 * sizeScale, 4 * sizeScale); ctx.lineTo(-1 * sizeScale, 13 * sizeScale);
      ctx.moveTo(3 * sizeScale, 4 * sizeScale); ctx.lineTo(3 * sizeScale, 13 * sizeScale);
      ctx.moveTo(7 * sizeScale, 4 * sizeScale); ctx.lineTo(7 * sizeScale, 13 * sizeScale);
      ctx.stroke();
      // tiny black hooves
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-6.5 * sizeScale, 11.5 * sizeScale, 2.5 * sizeScale, 2.2 * sizeScale);
      ctx.fillRect(-2.5 * sizeScale, 11.5 * sizeScale, 2.5 * sizeScale, 2.2 * sizeScale);
      ctx.fillRect(1.5 * sizeScale, 11.5 * sizeScale, 2.5 * sizeScale, 2.2 * sizeScale);
      ctx.fillRect(5.5 * sizeScale, 11.5 * sizeScale, 2.5 * sizeScale, 2.2 * sizeScale);

      // 2. Select visual parameters based on Sheep type & tier
      // Set type colors
      let faceColor = '#f1f5f9';
      let fleeceColor = '#cbd5e1';
      let accentColor = '#94a3b8';

      if (sheep.type === 'fire') {
        faceColor = '#f43f5e'; fleeceColor = '#e11d48'; accentColor = '#f97316';
      } else if (sheep.type === 'freeze') {
        faceColor = '#38bdf8'; fleeceColor = '#0284c7'; accentColor = '#60a5fa';
      } else if (sheep.type === 'lightning') {
        faceColor = '#facc15'; fleeceColor = '#d97706'; accentColor = '#fef08a';
      } else if (sheep.type === 'poison') {
        faceColor = '#d946ef'; fleeceColor = '#a21caf'; accentColor = '#c084fc';
      }

      // 3. Tiny head facing right towards enemies
      ctx.fillStyle = faceColor;
      ctx.beginPath();
      ctx.arc(12 * sizeScale, -2 * sizeScale, 6 * sizeScale, 0, Math.PI * 2);
      ctx.fill();

      // Floppy droopy ears on head
      ctx.fillStyle = faceColor;
      ctx.beginPath();
      ctx.ellipse(9 * sizeScale, -1 * sizeScale, 1.8 * sizeScale, 3.5 * sizeScale, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Curly wool cap on top of head
      ctx.fillStyle = fleeceColor;
      ctx.beginPath();
      ctx.arc(11 * sizeScale, -6 * sizeScale, 3 * sizeScale, 0, Math.PI * 2);
      ctx.fill();

      // Googly large big eyes that look right!
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(14 * sizeScale, -3.5 * sizeScale, 2.2 * sizeScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(15 * sizeScale, -3.5 * sizeScale, 1.1 * sizeScale, 0, Math.PI * 2);
      ctx.fill();

      // ELEMENT SPECIFIC PHYSICAL TRAITS (Horns / Accents)
      if (sheep.type === 'normal') {
        // Classic curvy wool ram horns
        ctx.strokeStyle = '#a16207';
        ctx.lineWidth = 1.9 * sizeScale;
        ctx.beginPath();
        ctx.arc(8 * sizeScale, -5 * sizeScale, 4.2 * sizeScale, Math.PI * 1.3, Math.PI * 0.3);
        ctx.stroke();
      } else if (sheep.type === 'fire') {
        // Fiery flame ears/horns swooping up
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(8 * sizeScale, -6 * sizeScale);
        ctx.quadraticCurveTo(5 * sizeScale, -15 * sizeScale, 9 * sizeScale, -14 * sizeScale);
        ctx.quadraticCurveTo(11 * sizeScale, -10 * sizeScale, 11 * sizeScale, -6 * sizeScale);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(10 * sizeScale, -6 * sizeScale);
        ctx.quadraticCurveTo(10 * sizeScale, -18 * sizeScale, 13 * sizeScale, -17 * sizeScale);
        ctx.quadraticCurveTo(13 * sizeScale, -11 * sizeScale, 12 * sizeScale, -6 * sizeScale);
        ctx.closePath();
        ctx.fill();
      } else if (sheep.type === 'freeze') {
        // Sharp light-blue frosty crystal spikes
        ctx.fillStyle = '#bae6fd';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 0.8 * sizeScale;
        // shard 1
        ctx.beginPath();
        ctx.moveTo(7 * sizeScale, -6 * sizeScale);
        ctx.lineTo(4 * sizeScale, -13 * sizeScale);
        ctx.lineTo(9 * sizeScale, -9 * sizeScale);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        // shard 2
        ctx.beginPath();
        ctx.moveTo(10 * sizeScale, -6 * sizeScale);
        ctx.lineTo(11 * sizeScale, -15 * sizeScale);
        ctx.lineTo(13 * sizeScale, -8 * sizeScale);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      } else if (sheep.type === 'lightning') {
        // Jagged shock lightning bolts
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.8 * sizeScale;
        ctx.beginPath();
        ctx.moveTo(9 * sizeScale, -5 * sizeScale);
        ctx.lineTo(6 * sizeScale, -11 * sizeScale);
        ctx.lineTo(10 * sizeScale, -10 * sizeScale);
        ctx.lineTo(8 * sizeScale, -16 * sizeScale);
        ctx.stroke();
      } else if (sheep.type === 'poison') {
        // Toxic slime bubbles on head
        ctx.fillStyle = '#e879f9';
        ctx.beginPath();
        ctx.arc(8 * sizeScale, -10 * sizeScale, 2.8 * sizeScale, 0, Math.PI * 2);
        ctx.arc(12 * sizeScale, -11 * sizeScale, 2.2 * sizeScale, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Glowing wool (Chubby cumulative circles)
      ctx.fillStyle = fleeceColor;
      const bp = [
        { x: 0, y: -5, r: 9 },
        { x: -7, y: 1, r: 8.5 },
        { x: 7, y: 1, r: 8.5 },
        { x: 6, y: -4, r: 8 },
        { x: -1, y: 6, r: 9 },
      ];
      bp.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x * sizeScale, p.y * sizeScale, p.r * sizeScale, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Crown decoration for Tier 2 or 3!
      if (sheep.tier >= 2) {
        ctx.fillStyle = '#facc15'; // golden crown
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // crown points
        ctx.moveTo(-6 * sizeScale, -13 * sizeScale);
        ctx.lineTo(-3 * sizeScale, -9 * sizeScale);
        ctx.lineTo(0, -14 * sizeScale);
        ctx.lineTo(3 * sizeScale, -9 * sizeScale);
        ctx.lineTo(6 * sizeScale, -13 * sizeScale);
        // crown base
        ctx.lineTo(4 * sizeScale, -7 * sizeScale);
        ctx.lineTo(-4 * sizeScale, -7 * sizeScale);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Tier 3 glowing aura arcs
        if (sheep.tier === 3) {
          ctx.strokeStyle = accentColor;
          ctx.setLineDash([4, 6]);
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(0, 0, 22 * sizeScale, timestamp * 0.003, timestamp * 0.003 + Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]); // reset
        }
      }

      // Display Tier star text beneath the cute unit
      ctx.fillStyle = '#ffffff';
      ctx.font = 'black 9px system-ui';
      ctx.textAlign = 'center';
      const tierStars = '★'.repeat(sheep.tier);
      ctx.fillText(tierStars, 0, 18 * sizeScale);

      ctx.restore();
    });

    // C. Draw HOSTILE WOLVES
    wolvesRef.current.forEach((wolf) => {
      ctx.save();
      ctx.translate(wolf.x, wolf.y);

      // Direction sweep legs animation based on speed
      const swing = Math.sin(timestamp * 0.012) * 5;

      // 1. Shadow
      ctx.fillStyle = 'rgba(5, 46, 22, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, wolf.size * 0.8, wolf.size * 1.1, wolf.size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Color mapping based on debuffs
      let bodyColor = '#4b5563'; // wolf Slate Gray
      let earBrushColor = '#ef4444'; // red malicious outline

      if (wolf.slowTimer > 0) {
        bodyColor = '#bae6fd'; // frozen blue!
        earBrushColor = '#0ea5e9';
      } else if (wolf.poisonTimer > 0) {
        bodyColor = '#d946ef'; // toxic fuchsia!
        earBrushColor = '#a21caf';
      }

      // 2. Draw Wolf snout & head facing left!
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      // wolf body ellipse
      ctx.ellipse(0, 0, wolf.size * 1.2, wolf.size * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Jagged back mane/fur (Wild beast details)
      ctx.fillStyle = wolf.slowTimer > 0 ? '#0ea5e9' : '#1f2937';
      ctx.beginPath();
      ctx.moveTo(-wolf.size * 0.3, -wolf.size * 0.7);
      ctx.lineTo(-wolf.size * 0.45, -wolf.size * 1.1);
      ctx.lineTo(0, -0.7 * wolf.size);
      ctx.lineTo(wolf.size * 0.25, -wolf.size * 1.05);
      ctx.lineTo(wolf.size * 0.5, -wolf.size * 0.7);
      ctx.closePath();
      ctx.fill();

      // Long bushy tail swaying procedurally
      const tailSway = Math.sin(timestamp * 0.008 + wolf.x * 0.04) * 0.24;
      ctx.save();
      ctx.translate(wolf.size * 1.0, -wolf.size * 0.15);
      ctx.rotate(0.4 + tailSway);
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, wolf.size * 0.82, wolf.size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      // tail fluffy tip
      ctx.fillStyle = earBrushColor;
      ctx.beginPath();
      ctx.ellipse(wolf.size * 0.55, 0, wolf.size * 0.34, wolf.size * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // snout triangle pointing left
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.moveTo(-wolf.size * 0.8, -wolf.size * 0.25);
      ctx.lineTo(-wolf.size * 1.85, wolf.size * 0.05);
      ctx.lineTo(-wolf.size * 0.7, wolf.size * 0.45);
      ctx.closePath();
      ctx.fill();

      // Snout nose tip
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-wolf.size * 1.85, wolf.size * 0.05, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Fierce white fangs showing in lower jaw
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      // top tooth
      ctx.moveTo(-wolf.size * 1.35, wolf.size * 0.12);
      ctx.lineTo(-wolf.size * 1.45, wolf.size * 0.36);
      ctx.lineTo(-wolf.size * 1.25, wolf.size * 0.12);
      ctx.closePath();
      ctx.fill();

      // Wolf ears pointing backwards/up (Double ears for depth!)
      // Back ear
      ctx.fillStyle = wolf.slowTimer > 0 ? '#0284c7' : '#374151';
      ctx.beginPath();
      ctx.moveTo(-wolf.size * 0.1, -wolf.size * 0.55);
      ctx.lineTo(wolf.size * 0.25, -wolf.size * 1.35);
      ctx.lineTo(wolf.size * 0.5, -wolf.size * 0.45);
      ctx.closePath();
      ctx.fill();

      // Front ear
      ctx.fillStyle = earBrushColor;
      ctx.beginPath();
      ctx.moveTo(0.15 * wolf.size, -0.6 * wolf.size);
      ctx.lineTo(0.55 * wolf.size, -1.45 * wolf.size);
      ctx.lineTo(0.75 * wolf.size, -0.45 * wolf.size);
      ctx.closePath();
      ctx.fill();

      // Malicious glowing red eyes
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.ellipse(-wolf.size * 1.05, -wolf.size * 0.18, 2.8, 1.3, -0.15, 0, Math.PI * 2);
      ctx.fill();
      // yellow slit pupil
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.ellipse(-wolf.size * 1.07, -wolf.size * 0.18, 0.8, 1.2, -0.15, 0, Math.PI * 2);
      ctx.fill();

      // 3. Legs swinging
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = wolf.size * 0.2;
      // front leg
      ctx.beginPath();
      ctx.moveTo(-wolf.size * 0.5, wolf.size * 0.6);
      ctx.lineTo(-wolf.size * 0.5 + swing, wolf.size * 1.1);
      ctx.stroke();
      // back leg
      ctx.beginPath();
      ctx.moveTo(wolf.size * 0.5, wolf.size * 0.6);
      ctx.lineTo(wolf.size * 0.5 - swing, wolf.size * 1.1);
      ctx.stroke();

      // 4. Draw simple HP gauge above wolf
      const barW = wolf.size * 1.8;
      const barH = 3.5;
      const hpRatio = wolf.hp / wolf.maxHp;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(-barW / 2, -wolf.size * 1.2, barW, barH);
      
      ctx.fillStyle = wolf.slowTimer > 0 ? '#38bdf8' : '#ef4444';
      ctx.fillRect(-barW / 2, -wolf.size * 1.2, barW * Math.max(0, hpRatio), barH);

      ctx.restore();
    });

    // D. Draw BULLET PROJECTILES
    projectilesRef.current.forEach((proj) => {
      ctx.save();
      ctx.translate(proj.x, proj.y);

      let bulletColor = '#f1f5f9';
      let size = 4 + proj.tier * 1.5;

      if (proj.type === 'fire') {
        bulletColor = '#ef4444';
      } else if (proj.type === 'freeze') {
        bulletColor = '#0ea5e9';
      } else if (proj.type === 'lightning') {
        bulletColor = '#eab308';
      } else if (proj.type === 'poison') {
        bulletColor = '#d946ef';
      }

      ctx.shadowColor = bulletColor;
      ctx.shadowBlur = proj.tier * 5;

      ctx.fillStyle = bulletColor;
      ctx.beginPath();
      
      // Fire projectiles are larger and more circular, freeze are elongated shards
      if (proj.type === 'freeze') {
        ctx.ellipse(0, 0, size * 1.8, size * 0.65, Math.atan2(proj.vy, proj.vx), 0, Math.PI * 2);
      } else {
        ctx.arc(0, 0, size, 0, Math.PI * 2);
      }
      ctx.fill();

      // Core white center for extra glow weight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // E. Draw CONNECTING LIGHTNING ZAP vectors
    particlesRef.current.forEach((p) => {
      if (p.type === 'zap') {
        ctx.save();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        
        // Jagged path rendering for procedural shockwaves!
        const dx = p.vx - p.x;
        const dy = p.vy - p.y;
        const dist = Math.hypot(dx, dy);
        const steps = 4;
        
        const normalX = -dy / dist;
        const normalY = dx / dist;

        for (let j = 1; j < steps; j++) {
          const ratio = j / steps;
          const wobble = (Math.random() * 18 - 9) * (1 - ratio);
          const tX = p.x + dx * ratio + normalX * wobble;
          const tY = p.y + dy * ratio + normalY * wobble;
          ctx.lineTo(tX, tY);
        }

        ctx.lineTo(p.vx, p.vy);
        ctx.stroke();
        ctx.restore();
      }
    });

    // F. Draw STANDARD DRIFT PARTICLES (greetings, fleece chunks, coins)
    particlesRef.current.forEach((p) => {
      if (p.type === 'zap') return; // already drawn above in backline

      ctx.save();
      ctx.globalAlpha = p.opacity || 1;
      ctx.fillStyle = p.color;

      if (p.type === 'gold_coin') {
        // Draw miniature shiny gold coin
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d97706';
        ctx.font = 'bold 7px system-ui';
        ctx.fillText('$', p.x - 2, p.y + 2.5);
      } 
      else if (p.type === 'rep') {
        // Drifts positive greetings text or new wave alerts
        ctx.font = 'black 14px system-ui';
        ctx.fillStyle = '#fbbf24';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ WAVE UPGRADE! ⚡', p.x, p.y);
      } 
      else if (p.type === 'fleece') {
        // Draws fuzzy wool clouds
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 1.8, 0, Math.PI * 2);
        ctx.fill();
      } 
      else {
        // Standard sparks/embers
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    // Queue next frame
    frameIdRef.current = requestAnimationFrame(performGameStep);
  };

  // Launch and bind drawing update engine loop
  useEffect(() => {
    frameIdRef.current = requestAnimationFrame(performGameStep);
    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
    };
  }, [isPlaying, isPaused, stats, upgrades, sheepUnits, selectedSlotIdx]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden relative shadow-inner cursor-crosshair min-h-[440px]"
    >
      <canvas
        id="ranch-game-stage"
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { isMouseInCanvasRef.current = false; }}
        onMouseEnter={() => { isMouseInCanvasRef.current = true; }}
        className="block"
      />

      {/* Touch helper HUD indicators */}
      <div className="absolute top-2 right-4 text-[9px] text-indigo-300 font-mono select-none pointer-events-none bg-neutral-950/70 p-1.5 rounded border border-indigo-500/20 max-w-[280px]">
        <span className="font-sans font-bold text-neutral-200">💡 통제 기기 매뉴얼:</span>
        <br />• 양 클릭 시 유닛 선택!
        <br />• 유닛 선택 후 빈 슬롯 클릭 시 이동/배치!
        <br />• 다른 양 클릭 시 슬롯 즉각 교환!
      </div>
    </div>
  );
};

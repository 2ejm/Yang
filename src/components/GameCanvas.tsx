import React, { useEffect, useRef, useState } from 'react';
import { GameStats, Laser, Meteor, Mineral, Particle, PirateShip, PlayerShip } from '../types';
import { sfx } from '../utils/audio';

interface GameCanvasProps {
  isPlaying: boolean;
  isPaused: boolean;
  onGameOver: () => void;
  onMineralsCollected: (amount: number) => void;
  shipHp: number;
  setShipHp: React.Dispatch<React.SetStateAction<number>>;
  maxHpModifier: number;
  regenModifier: number;
  damageModifier: number;
  fireRateModifier: number;
  rangeModifier: number;
  speedModifier: number;
  magnetModifier: number;
  projectileModifier: number;
  setStats: React.Dispatch<React.SetStateAction<GameStats>>;
  setPirateActive: (active: boolean) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  isPlaying,
  isPaused,
  onGameOver,
  onMineralsCollected,
  shipHp,
  setShipHp,
  maxHpModifier,
  regenModifier,
  damageModifier,
  fireRateModifier,
  rangeModifier,
  speedModifier,
  magnetModifier,
  projectileModifier,
  setStats,
  setPirateActive,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // High frequency tracking state using refs for buttery 60fps canvas performance
  const mouseRef = useRef({ x: 0, y: 0 });
  const isMouseInCanvasRef = useRef(false);
  const frameIdRef = useRef<number | null>(null);

  // Entities
  const playerRef = useRef<PlayerShip>({
    x: 400,
    y: 300,
    angle: 0,
    hp: 100,
    maxHp: 100,
    regen: 0,
    speed: 5,
    damage: 10,
    fireRate: 2,
    lastFireTime: 0,
    range: 200,
    magnet: 80,
    projectileCount: 1,
  });

  const meteorsRef = useRef<Meteor[]>([]);
  const mineralsRef = useRef<Mineral[]>([]);
  const piratesRef = useRef<PirateShip[]>([]);
  const lasersRef = useRef<Laser[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<{ x: number; y: number; size: number; alpha: number; speed: number }[]>([]);

  // Spawn Cooldown Timers
  const lastMeteorSpawnRef = useRef(0);
  const lastPirateSpawnRef = useRef(0);
  const timeElapsedRef = useRef(0); // overall seconds elapsed
  const statsTrackerRef = useRef<GameStats>({
    score: 0,
    mineralsCollected: 0,
    meteorsDestroyed: 0,
    piratesDestroyed: 0,
    timeSurvived: 0,
  });

  // Track resizing
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Synced upgrades application (inject modifications inside game loop immediately)
  useEffect(() => {
    playerRef.current.maxHp = 100 + maxHpModifier;
    playerRef.current.regen = regenModifier;
    playerRef.current.damage = 10 + damageModifier;
    playerRef.current.fireRate = 2 + fireRateModifier * 0.5; // increases shot speed
    playerRef.current.range = 200 + rangeModifier;
    playerRef.current.speed = 5 + speedModifier * 0.7;
    playerRef.current.magnet = 80 + magnetModifier;
    playerRef.current.projectileCount = 1 + projectileModifier;

    // Adjust HP up if maxHp has grown
    if (shipHp > playerRef.current.maxHp) {
      setShipHp(playerRef.current.maxHp);
    }
  }, [maxHpModifier, regenModifier, damageModifier, fireRateModifier, rangeModifier, speedModifier, magnetModifier, projectileModifier]);

  // Adjust local hp ref when component prop changes
  useEffect(() => {
    playerRef.current.hp = shipHp;
  }, [shipHp]);

  // Handle Resize beautifully
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const w = width || 800;
        const h = height || 600;
        setDimensions({ width: w, height: h });

        // Relocate player to center on first load setup
        if (playerRef.current.x === 400 && playerRef.current.y === 300) {
          playerRef.current.x = w / 2;
          playerRef.current.y = h / 2;
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    // Initialize starry field
    const stars = [];
    const starCount = 120;
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * 1200,
        y: Math.random() * 900,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.3,
        speed: Math.random() * 0.15 + 0.05,
      });
    }
    starsRef.current = stars;

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Helper spawn builders
  const generateRuggedMeteorPoints = (radius: number): { x: number; y: number }[] => {
    const points = [];
    const minPoints = 8;
    const maxPoints = 12;
    const numPoints = Math.floor(Math.random() * (maxPoints - minPoints + 1)) + minPoints;

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const variation = (Math.random() * 0.4 - 0.2) * radius; // 20% ruggedness
      points.push({
        x: Math.cos(angle) * (radius + variation),
        y: Math.sin(angle) * (radius + variation),
      });
    }
    return points;
  };

  const spawnMeteor = (x?: number, y?: number, customRadius?: number, customVel?: { vx: number; vy: number }) => {
    const w = dimensions.width;
    const h = dimensions.height;
    
    // Choose spawn position (edge of screen unless custom coordinate is fed)
    let mX = 0;
    let mY = 0;
    if (x !== undefined && y !== undefined) {
      mX = x;
      mY = y;
    } else {
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0) { // Top
        mX = Math.random() * w;
        mY = -50;
      } else if (edge === 1) { // Right
        mX = w + 50;
        mY = Math.random() * h;
      } else if (edge === 2) { // Bottom
        mX = Math.random() * w;
        mY = h + 50;
      } else { // Left
        mX = -50;
        mY = Math.random() * h;
      }
    }

    const radius = customRadius || (Math.random() * 32 + 10); // sizes 10px to 42px
    let maxHpVal = 10;
    let type: 'common' | 'rare' | 'exotic' = 'common';

    if (radius > 35) {
      maxHpVal = 55;
      type = 'exotic';
    } else if (radius > 22) {
      maxHpVal = 25;
      type = 'rare';
    }

    let vx = 0;
    let vy = 0;
    if (customVel) {
      vx = customVel.vx;
      vy = customVel.vy;
    } else {
      // Point towards center sector with variance
      const destX = w / 2 + (Math.random() * 300 - 150);
      const destY = h / 2 + (Math.random() * 300 - 150);
      const angle = Math.atan2(destY - mY, destX - mX);
      const speed = Math.random() * 1.5 + 0.6;
      vx = Math.cos(angle) * speed;
      vy = Math.sin(angle) * speed;
    }

    const colorSelection = type === 'exotic' 
      ? '#c084fc' // Exotic purple
      : type === 'rare' 
      ? '#38bdf8' // Rare cyan
      : '#94a3b8'; // Common metallic gray

    meteorsRef.current.push({
      id: Math.random().toString(36).substring(2, 9),
      x: mX,
      y: mY,
      vx,
      vy,
      radius,
      hp: maxHpVal,
      maxHp: maxHpVal,
      angle: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() * 0.03 - 0.015),
      color: colorSelection,
      mineralType: type,
      points: generateRuggedMeteorPoints(radius),
    });
  };

  const spawnMineral = (x: number, y: number, type: 'common' | 'rare' | 'exotic') => {
    let color = '#facc15'; // yellow/common
    let val = 1;

    if (type === 'rare') {
      color = '#0ea5e9'; // rare blue
      val = 3;
    } else if (type === 'exotic') {
      color = '#e879f9'; // exotic pink/violet
      val = 8;
    }

    // Give crystal a slight explosive pop out direction
    const popAngle = Math.random() * Math.PI * 2;
    const popSpeed = Math.random() * 1.2 + 0.5;

    mineralsRef.current.push({
      id: Math.random().toString(36).substring(2, 9),
      x,
      y,
      vx: Math.cos(popAngle) * popSpeed,
      vy: Math.sin(popAngle) * popSpeed,
      value: val,
      type,
      color,
      collected: false,
    });
  };

  const spawnPirate = () => {
    const w = dimensions.width;
    const h = dimensions.height;
    
    // Warp-in warning sound
    sfx.playPirateAlert();

    const edge = Math.floor(Math.random() * 4);
    let pX = 0;
    let pY = 0;
    if (edge === 0) {
      pX = Math.random() * w;
      pY = -60;
    } else if (edge === 1) {
      pX = w + 60;
      pY = Math.random() * h;
    } else if (edge === 2) {
      pX = Math.random() * w;
      pY = h + 60;
    } else {
      pX = -60;
      pY = Math.random() * h;
    }

    // Warp-in shockwave effect
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      particlesRef.current.push({
        x: pX,
        y: pY,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        life: 0,
        maxLife: 40,
        size: 2,
        color: '#f43f5e', // deep hacker pink/red
        type: 'spark',
      });
    }

    piratesRef.current.push({
      id: Math.random().toString(36).substring(2, 9),
      x: pX,
      y: pY,
      vx: 0,
      vy: 0,
      hp: 80 + statsTrackerRef.current.timeSurvived * 0.4, // scales nicely with survivals
      maxHp: 80 + statsTrackerRef.current.timeSurvived * 0.4,
      angle: 0,
      lastFireTime: 0,
      radius: 17,
      fireCooldown: 1500, // 1.5s fire rates
    });

    setPirateActive(true);
  };

  const spawnSparks = (x: number, y: number, color: string, count: number = 8, averageSpeed: number = 2.5) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * averageSpeed + 0.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: Math.random() * 25 + 15,
        size: Math.random() * 2.5 + 1,
        color,
        type: 'spark',
      });
    }
  };

  // Keyboard/Mouse handling
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

  const handleMouseLeave = () => {
    isMouseInCanvasRef.current = false;
  };

  const handleMouseEnter = () => {
    isMouseInCanvasRef.current = true;
  };

  // The central engine update and rendering loop
  const gameLoop = (timestamp: number) => {
    if (isPaused || !isPlaying) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      frameIdRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    // Time elapsed ticking
    if (!lastMeteorSpawnRef.current) lastMeteorSpawnRef.current = timestamp;
    if (!lastPirateSpawnRef.current) lastPirateSpawnRef.current = timestamp;

    const deltaSecs = 1 / 60; // 0.016 approx
    timeElapsedRef.current += deltaSecs;

    // Throttle score and ticker state updates back to parent to avoid severe React layout thrashing
    const secondsSurvived = Math.floor(timeElapsedRef.current);
    if (secondsSurvived !== statsTrackerRef.current.timeSurvived) {
      statsTrackerRef.current.timeSurvived = secondsSurvived;
      
      // Auto-Regen TICK
      if (playerRef.current.regen > 0 && playerRef.current.hp < playerRef.current.maxHp) {
        setShipHp((prev) => {
          const next = prev + playerRef.current.regen;
          return Math.min(playerRef.current.maxHp, next);
        });
      }

      // Add survival bonus score
      statsTrackerRef.current.score += 5;
      setStats({ ...statsTrackerRef.current });
    }

    // 1. Spawning schedules
    const currentSpawnRate = Math.max(1200, 3200 - secondsSurvived * 12); // SPAWNS ACCELERATE AS TIME GOES!
    if (timestamp - lastMeteorSpawnRef.current > currentSpawnRate) {
      spawnMeteor();
      // Occasionally double spawn!
      if (Math.random() < 0.25) {
        spawnMeteor();
      }
      lastMeteorSpawnRef.current = timestamp;
    }

    // Spawn pirates occasionally
    const pirateSpawnInterval = Math.max(12000, 24000 - secondsSurvived * 100);
    if (timestamp - lastPirateSpawnRef.current > pirateSpawnInterval) {
      if (piratesRef.current.length < 3) { // limit multi pirate chaos based on threat
        spawnPirate();
      }
      lastPirateSpawnRef.current = timestamp;
    }

    // 2. Clear canvas
    ctx.fillStyle = '#020205'; // very sleek dark deep background
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // 3. Render and drift background stars
    ctx.shadowBlur = 0;
    starsRef.current.forEach((star) => {
      // Drifts star space backdrop slowly downwards right
      star.y += star.speed;
      star.x += star.speed * 0.3;
      if (star.y > dimensions.height) {
        star.y = -5;
        star.x = Math.random() * dimensions.width;
      }
      if (star.x > dimensions.width) {
        star.x = -5;
      }

      ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    // 4. Update and move Player ship
    const player = playerRef.current;
    
    // Follow mouse smoothly (inertial damping)
    let targetX = mouseRef.current.x;
    let targetY = mouseRef.current.y;

    // If mouse is outside, float spaceship slightly centered
    if (!isMouseInCanvasRef.current) {
      targetX = dimensions.width / 2;
      targetY = dimensions.height / 2;
    }

    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const distMouse = Math.hypot(dx, dy);

    // Dynamic rotation angle - points towards lock on enemy if firing, otherwise points towards moving direction
    let targetAngle = player.angle;

    // Search nearest enemy inside Auto-Attack range
    let nearestEnemy: { id: string; x: number; y: number; hp: number; radius: number; isPirate: boolean } | null = null;
    let minEnemyDist = player.range;

    // Check Meteors in weapons line
    meteorsRef.current.forEach((m) => {
      const dist = Math.hypot(m.x - player.x, m.y - player.y);
      if (dist < minEnemyDist) {
        minEnemyDist = dist;
        nearestEnemy = { id: m.id, x: m.x, y: m.y, hp: m.hp, radius: m.radius, isPirate: false };
      }
    });

    // Check Pirate Ships loaded (prioritize targeting aggressive Pirate Ships!)
    piratesRef.current.forEach((p) => {
      const dist = Math.hypot(p.x - player.x, p.y - player.y);
      // Give pirates a small targeting advantage so player shoots pirates down first
      if (dist < player.range + 80) {
        const adjustedDist = dist * 0.7; // virtual discount for distance priority
        if (adjustedDist < minEnemyDist) {
          minEnemyDist = adjustedDist;
          nearestEnemy = { id: p.id, x: p.x, y: p.y, hp: p.hp, radius: p.radius, isPirate: true };
        }
      }
    });

    if (nearestEnemy) {
      const ne: any = nearestEnemy;
      targetAngle = Math.atan2(ne.y - player.y, ne.x - player.x);
    } else if (distMouse > 15) {
      targetAngle = Math.atan2(dy, dx);
    }

    // Interpolate angle for smooth rotating ship maneuvers
    const angleDiff = targetAngle - player.angle;
    // Normalize to -PI to PI
    const normalDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
    player.angle += normalDiff * 0.18;

    if (distMouse > 10) {
      // Accelerate towards coordinates
      const accelerationFactor = 0.08;
      player.x += dx * accelerationFactor * (player.speed / 5);
      player.y += dy * accelerationFactor * (player.speed / 5);
    }

    // Prevent ship moving out of boundary space
    player.x = Math.max(20, Math.min(dimensions.width - 20, player.x));
    player.y = Math.max(20, Math.min(dimensions.height - 20, player.y));

    // 5. Weapon automatic bullet triggers (Automatic shoots nearest)
    if (nearestEnemy) {
      const fireIntervalMs = 1000 / player.fireRate;
      if (timestamp - player.lastFireTime > fireIntervalMs) {
        sfx.playLaser(false);

        const targetEntity: any = nearestEnemy;
        const angleToEnemy = Math.atan2(targetEntity.y - player.y, targetEntity.x - player.x);
        
        // Multi gun setups!
        if (player.projectileCount === 1) {
          // One center laser
          lasersRef.current.push({
            id: Math.random().toString(36).substring(2, 9),
            x: player.x,
            y: player.y,
            vx: Math.cos(angleToEnemy) * 11,
            vy: Math.sin(angleToEnemy) * 11,
            damage: player.damage,
            isEnemy: false,
            angle: angleToEnemy,
            radius: 3.5,
          });
        } 
        else if (player.projectileCount === 2) {
          // Dual wide spread lasers (parallel offsets)
          const offsetAngle1 = angleToEnemy - 0.12;
          const offsetAngle2 = angleToEnemy + 0.12;
          
          [offsetAngle1, offsetAngle2].forEach((ang) => {
            lasersRef.current.push({
              id: Math.random().toString(36).substring(2, 9),
              x: player.x + Math.cos(ang) * 10,
              y: player.y + Math.sin(ang) * 10,
              vx: Math.cos(ang) * 11,
              vy: Math.sin(ang) * 11,
              damage: player.damage,
              isEnemy: false,
              angle: ang,
              radius: 3.5,
            });
          });
        } 
        else if (player.projectileCount === 3) {
          // Triple fan spreading
          const spreadAngs = [angleToEnemy - 0.22, angleToEnemy, angleToEnemy + 0.22];
          spreadAngs.forEach((ang) => {
            lasersRef.current.push({
              id: Math.random().toString(36).substring(2, 9),
              x: player.x,
              y: player.y,
              vx: Math.cos(ang) * 11,
              vy: Math.sin(ang) * 11,
              damage: player.damage,
              isEnemy: false,
              angle: ang,
              radius: 3.5,
            });
          });
        } 
        else if (player.projectileCount === 4) {
          // 4-Way Cross burst around the spaceship pointing at locked target primarily
          const baseAngles = [
            angleToEnemy,
            angleToEnemy + Math.PI / 2,
            angleToEnemy + Math.PI,
            angleToEnemy - Math.PI / 2
          ];
          baseAngles.forEach((ang) => {
            lasersRef.current.push({
              id: Math.random().toString(36).substring(2, 9),
              x: player.x,
              y: player.y,
              vx: Math.cos(ang) * 11,
              vy: Math.sin(ang) * 11,
              damage: player.damage * 0.9, // tiny scaling down for count balance
              isEnemy: false,
              angle: ang,
              radius: 4,
            });
          });
        }
        else {
          // Level 5: 360-degree Nova shockwaves! 6 heavy lasers shooting outward circle
          for (let i = 0; i < 6; i++) {
            const ang = angleToEnemy + (i * Math.PI) / 3;
            lasersRef.current.push({
              id: Math.random().toString(36).substring(2, 9),
              x: player.x,
              y: player.y,
              vx: Math.cos(ang) * 11,
              vy: Math.sin(ang) * 11,
              damage: player.damage * 0.85,
              isEnemy: false,
              angle: ang,
              radius: 4,
            });
          }
        }

        player.lastFireTime = timestamp;
      }
    }

    // 6. Update, check, split METEORS
    const nextMeteors: Meteor[] = [];
    meteorsRef.current.forEach((m) => {
      m.x += m.vx;
      m.y += m.vy;
      m.angle += m.rotationSpeed;

      // Keep if within boundary viewport with margin
      const margin = 100;
      if (m.x > -margin && m.x < dimensions.width + margin && m.y > -margin && m.y < dimensions.height + margin) {
        
        // Collsion check with Player ship
        const shipDist = Math.hypot(m.x - player.x, m.y - player.y);
        const colLimit = m.radius + 15; // ship average radius 15
        
        if (shipDist < colLimit) {
          // BOUNCE and REDUCE HP!
          const pushX = (player.x - m.x) / shipDist;
          const pushY = (player.y - m.y) / shipDist;
          
          // Shove player back slightly
          player.x += pushX * 12;
          player.y += pushY * 12;

          // Damage proportional to size of meteor
          const dmg = Math.round(m.radius * 0.55);
          sfx.playDamage();
          
          // Spawn collision sparks/rocks
          spawnSparks(player.x - pushX * 15, player.y - pushY * 15, '#94a3b8', 12, 3);

          setShipHp((prev) => {
            const result = prev - dmg;
            if (result <= 0) {
              onGameOver();
            }
            return Math.max(0, result);
          });

          // Meteor takes instant crash damage
          m.hp -= 20;
          if (m.hp <= 0) {
            // Shatter this meteor
            sfx.playExplosion('meteor');
            statsTrackerRef.current.meteorsDestroyed += 1;
            statsTrackerRef.current.score += Math.round(m.radius * 2);
            setStats({ ...statsTrackerRef.current });

            // Drop Mineral
            spawnMineral(m.x, m.y, m.mineralType);

            // Split mechanics!
            if (m.radius > 35) {
              // splits into 2 medium meteors
              const splRadius = 24;
              spawnMeteor(m.x, m.y, splRadius, { vx: m.vx + m.vy * 0.4, vy: m.vy - m.vx * 0.4 });
              spawnMeteor(m.x, m.y, splRadius, { vx: m.vx - m.vy * 0.4, vy: m.vy + m.vx * 0.4 });
            } else if (m.radius > 22) {
              // splits into 3 small meteors
              const splRadius = 12;
              spawnMeteor(m.x, m.y, splRadius, { vx: m.vx + 0.5, vy: m.vy - 0.5 });
              spawnMeteor(m.x, m.y, splRadius, { vx: m.vx - 0.5, vy: m.vy + 0.5 });
              spawnMeteor(m.x, m.y, splRadius, { vx: -m.vx * 0.8, vy: -m.vy * 0.8 });
            }
            return; // don't push into next list
          }
        }

        nextMeteors.push(m);
      }
    });
    meteorsRef.current = nextMeteors;

    // 7. Update, check ALIEN PIRATE ships
    const nextPirates: PirateShip[] = [];
    piratesRef.current.forEach((pirate) => {
      // Simple Follow AI: steer towards player ship
      const pDx = player.x - pirate.x;
      const pDy = player.y - pirate.y;
      const pDist = Math.hypot(pDx, pDy);

      let pVx = 0;
      let pVy = 0;

      // Keep comfortable distance from player (drifting/strafing) while firing
      const desiredRange = 250;
      const pirateSpeed = 1.9;

      if (pDist > desiredRange + 40) {
        // Move closer
        pVx = (pDx / pDist) * pirateSpeed;
        pVy = (pDy / pDist) * pirateSpeed;
      } else if (pDist < desiredRange - 40) {
        // Retreat back
        pVx = -(pDx / pDist) * pirateSpeed;
        pVy = -(pDy / pDist) * pirateSpeed;
      } else {
        // Orbit/Strafe
        pVx = (-pDy / pDist) * pirateSpeed * 0.6;
        pVy = (pDx / pDist) * pirateSpeed * 0.6;
      }

      pirate.x += pVx;
      pirate.y += pVy;
      pirate.angle = Math.atan2(pDy, pDx);

      // Firing triggers at player
      if (timestamp - pirate.lastFireTime > pirate.fireCooldown) {
        // Spawn menacing red laser beam
        sfx.playLaser(true);
        lasersRef.current.push({
          id: Math.random().toString(36).substring(2, 9),
          x: pirate.x,
          y: pirate.y,
          vx: (pDx / pDist) * 7.5,
          vy: (pDy / pDist) * 7.5,
          damage: 15,
          isEnemy: true,
          angle: pirate.angle,
          radius: 4,
        });
        pirate.lastFireTime = timestamp;
      }

      // Crash into player check
      if (pDist < pirate.radius + 15) {
        sfx.playDamage();
        sfx.playExplosion('pirate');
        
        // Hurt player severely
        setShipHp((prev) => {
          const next = prev - 30;
          if (next <= 0) onGameOver();
          return Math.max(0, next);
        });

        // Pirate shatters instantly
        spawnSparks(pirate.x, pirate.y, '#f43f5e', 20, 4);
        statsTrackerRef.current.piratesDestroyed += 1;
        setStats({ ...statsTrackerRef.current });
        
        // Spawn 3 gorgeous minerals
        spawnMineral(pirate.x, pirate.y, 'rare');
        spawnMineral(pirate.x + 10, pirate.y, 'exotic');
        spawnMineral(pirate.x, pirate.y + 10, 'rare');
        return;
      }

      // Filter check
      nextPirates.push(pirate);
    });
    piratesRef.current = nextPirates;

    // Update Banner state
    if (piratesRef.current.length === 0) {
      setPirateActive(false);
    }

    // 8. Move LASERS
    const nextLasers: Laser[] = [];
    lasersRef.current.forEach((laser) => {
      laser.x += laser.vx;
      laser.y += laser.vy;

      // Keep inside bounds
      if (laser.x > 0 && laser.x < dimensions.width && laser.y > 0 && laser.y < dimensions.height) {
        let hit = false;

        if (laser.isEnemy) {
          // Check collision with player
          const distToPlayer = Math.hypot(laser.x - player.x, laser.y - player.y);
          if (distToPlayer < laser.radius + 15) { // player ship size
            hit = true;
            sfx.playDamage();
            spawnSparks(laser.x, laser.y, '#ef4444', 6, 2.2);

            setShipHp((prev) => {
              const res = prev - laser.damage;
              if (res <= 0) onGameOver();
              return Math.max(0, res);
            });
          }
        } else {
          // Player lasers hitting METEORS or PIRATES
          // Check Meteors first
          for (let i = meteorsRef.current.length - 1; i >= 0; i--) {
            const m = meteorsRef.current[i];
            const dist = Math.hypot(laser.x - m.x, laser.y - m.y);
            if (dist < laser.radius + m.radius) {
              hit = true;
              m.hp -= laser.damage;
              spawnSparks(laser.x, laser.y, m.color, 5, 2);

              if (m.hp <= 0) {
                // Shatter!
                sfx.playExplosion('meteor');
                statsTrackerRef.current.meteorsDestroyed += 1;
                statsTrackerRef.current.score += Math.round(m.radius * 2);
                setStats({ ...statsTrackerRef.current });

                // Mineral drops
                spawnMineral(m.x, m.y, m.mineralType);

                // Split
                if (m.radius > 35) {
                  const splRadius = 24;
                  spawnMeteor(m.x, m.y, splRadius, { vx: m.vx + m.vy * 0.45, vy: m.vy - m.vx * 0.45 });
                  spawnMeteor(m.x, m.y, splRadius, { vx: m.vx - m.vx * 0.45, vy: m.vy + m.vx * 0.45 });
                } else if (m.radius > 22) {
                  const splRadius = 12;
                  spawnMeteor(m.x, m.y, splRadius, { vx: m.vx + 0.6, vy: m.vy - 0.6 });
                  spawnMeteor(m.x, m.y, splRadius, { vx: m.vx - 0.6, vy: m.vy + 0.6 });
                  spawnMeteor(m.x, m.y, splRadius, { vx: -m.vx * 0.8, vy: -m.vy * 0.8 });
                }

                // Delete meteor
                meteorsRef.current.splice(i, 1);
              }
              break; // exit loop check
            }
          }

          // Check Pirate ships
          if (!hit) {
            for (let i = piratesRef.current.length - 1; i >= 0; i--) {
              const p = piratesRef.current[i];
              const dist = Math.hypot(laser.x - p.x, laser.y - p.y);
              if (dist < laser.radius + p.radius) {
                hit = true;
                p.hp -= laser.damage;
                spawnSparks(laser.x, laser.y, '#f43f5e', 8);

                if (p.hp <= 0) {
                  sfx.playExplosion('pirate');
                  spawnSparks(p.x, p.y, '#f59e0b', 22, 4); // fire shards

                  statsTrackerRef.current.piratesDestroyed += 1;
                  statsTrackerRef.current.score += 250; // generous pirate points
                  setStats({ ...statsTrackerRef.current });

                  // Pirates drop multi-crystals of high status
                  spawnMineral(p.x, p.y, 'exotic');
                  spawnMineral(p.x - 12, p.y + 12, 'rare');
                  spawnMineral(p.x + 12, p.y - 12, 'rare');

                  piratesRef.current.splice(i, 1);
                }
                break;
              }
            }
          }
        }

        if (!hit) nextLasers.push(laser);
      }
    });
    lasersRef.current = nextLasers;

    // 9. Update & collect MINERAL CRYSTALS
    const nextMinerals: Mineral[] = [];
    mineralsRef.current.forEach((min) => {
      // apply slow friction context deceleration
      min.vx *= 0.96;
      min.vy *= 0.96;
      min.x += min.vx;
      min.y += min.vy;

      const dist = Math.hypot(min.x - player.x, min.y - player.y);

      // Tractor magnetic grab
      if (dist < player.magnet) {
        // Pull strong towards ship center
        const magnetForce = Math.min(8.5, 300 / dist);
        min.vx += ((player.x - min.x) / dist) * magnetForce;
        min.vy += ((player.y - min.y) / dist) * magnetForce;
      }

      // Collect crystal trigger
      if (dist < 18) {
        // Collect!
        sfx.playCrystalPickup(min.type);
        onMineralsCollected(min.value);
        statsTrackerRef.current.mineralsCollected += min.value;
        statsTrackerRef.current.score += min.value * 10;
        setStats({ ...statsTrackerRef.current });

        // collect light flashes
        spawnSparks(min.x, min.y, min.color, 4, 1.5);
        return; // drop from list update
      }

      // Floating bounds
      if (min.x > 0 && min.x < dimensions.width && min.y > 0 && min.y < dimensions.height) {
        nextMinerals.push(min);
      }
    });
    mineralsRef.current = nextMinerals;

    // 10. Move particles
    const nextParticles: Particle[] = [];
    particlesRef.current.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      if (p.life < p.maxLife) {
        nextParticles.push(p);
      }
    });
    particlesRef.current = nextParticles;

    // --- DRAWING PORTION SFX LINES ---
    
    // Draw Minerals
    mineralsRef.current.forEach((min) => {
      ctx.beginPath();
      ctx.strokeStyle = min.color;
      ctx.fillStyle = min.color + '40'; // neon bleed fill
      ctx.lineWidth = 1.5;
      
      // glowing diamond shape
      ctx.moveTo(min.x, min.y - 6);
      ctx.lineTo(min.x + 4.5, min.y);
      ctx.lineTo(min.x, min.y + 6);
      ctx.lineTo(min.x - 4.5, min.y);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();

      // inner glowing core
      ctx.beginPath();
      ctx.fillStyle = '#ffffff';
      ctx.arc(min.x, min.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Laser Beams
    lasersRef.current.forEach((laser) => {
      ctx.save();
      ctx.beginPath();
      ctx.lineCap = 'round';
      
      const beamLength = 16;
      const startX = laser.x - Math.cos(laser.angle) * beamLength;
      const startY = laser.y - Math.sin(laser.angle) * beamLength;

      ctx.moveTo(startX, startY);
      ctx.lineTo(laser.x, laser.y);

      if (laser.isEnemy) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3.5;
        // Outer hazard bloom glow
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 8;
      } else {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#0ea5e9';
        ctx.shadowBlur = 8;
      }
      ctx.stroke();
      ctx.restore();
    });

    // Draw Meteors
    meteorsRef.current.forEach((m) => {
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.angle);

      ctx.beginPath();
      // Draw custom rugged star shape coordinates
      ctx.moveTo(m.points[0].x, m.points[0].y);
      for (let i = 1; i < m.points.length; i++) {
        ctx.lineTo(m.points[i].x, m.points[i].y);
      }
      ctx.closePath();

      // Rock gradient fill
      const grad = ctx.createRadialGradient(0, 0, m.radius * 0.2, 0, 0, m.radius);
      grad.addColorStop(0, '#475569');
      grad.addColorStop(0.7, '#1e293b');
      grad.addColorStop(1, '#0f172a');
      
      ctx.fillStyle = grad;
      ctx.strokeStyle = m.color;
      ctx.lineWidth = 1.8;
      
      // Glow depending on core
      ctx.shadowColor = m.color;
      ctx.shadowBlur = m.mineralType === 'exotic' ? 12 : m.mineralType === 'rare' ? 6 : 0;

      ctx.fill();
      ctx.stroke();

      // Shading crater lines for realism
      ctx.strokeStyle = '#47556950';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(-m.radius * 0.3, -m.radius * 0.2, m.radius * 0.2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(m.radius * 0.2, m.radius * 0.3, m.radius * 0.15, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    });

    // Draw Pirate ships
    piratesRef.current.forEach((pirate) => {
      ctx.save();
      ctx.translate(pirate.x, pirate.y);
      ctx.rotate(pirate.angle);

      // Draw Menacing Triangle Interceptor
      ctx.beginPath();
      ctx.moveTo(pirate.radius * 1.5, 0); // Nose pointing right
      ctx.lineTo(-pirate.radius, -pirate.radius * 1.1); // Left Rear wing
      ctx.lineTo(-pirate.radius * 0.4, 0); // Thruster indent
      ctx.lineTo(-pirate.radius, pirate.radius * 1.1); // Right Rear wing
      ctx.closePath();

      ctx.fillStyle = '#1e1b4b'; // deep gothic violet
      ctx.strokeStyle = '#f43f5e'; // glowing hot red contour
      ctx.lineWidth = 2.2;
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.stroke();

      // Red central command visor glowing light
      ctx.beginPath();
      ctx.fillStyle = '#ef4444';
      ctx.arc(pirate.radius * 0.3, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Thruster flash engine
      ctx.beginPath();
      ctx.fillStyle = '#f43f5e';
      ctx.moveTo(-pirate.radius * 0.4, -4);
      ctx.lineTo(-pirate.radius * 1.3, 0);
      ctx.lineTo(-pirate.radius * 0.4, 4);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    });

    // Draw particles
    particlesRef.current.forEach((p) => {
      const remainingLife = (p.maxLife - p.life) / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = remainingLife;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * remainingLife, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0; // restore
    });

    // Draw weapons auto range ring around spaceship
    ctx.save();
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.range, 0, Math.PI * 2);
    ctx.strokeStyle = nearestEnemy ? 'rgba(56, 189, 248, 0.16)' : 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.restore();

    // Draw Player Spaceship
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    // Engine flame sparks (creates dynamic thrust aesthetic trailing mouse!)
    if (distMouse > 15) {
      ctx.beginPath();
      const flameLength = Math.min(22, 10 + distMouse * 0.08);
      ctx.moveTo(-12, -4);
      ctx.lineTo(-12 - flameLength - Math.random() * 6, 0);
      ctx.lineTo(-12, 4);
      ctx.closePath();
      
      const flameGrad = ctx.createLinearGradient(-12, 0, -30, 0);
      flameGrad.addColorStop(0, '#67e8f9'); // cyan flame
      flameGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');
      ctx.fillStyle = flameGrad;
      ctx.fill();
    }

    // Outer fighter shape
    ctx.beginPath();
    ctx.moveTo(18, 0); // nose pointing right
    ctx.lineTo(-12, -13); // wing port
    ctx.lineTo(-7, -4); // port engine deck
    ctx.lineTo(-12, 0); // tail center
    ctx.lineTo(-7, 4); // starboard engine deck
    ctx.lineTo(-12, 13); // wing starboard
    ctx.closePath();

    ctx.fillStyle = '#0f172a'; // dark metal core color
    ctx.strokeStyle = '#38bdf8'; // neon light blue wing plates
    ctx.lineWidth = 2.2;
    ctx.shadowColor = '#0ea5e9';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.stroke();

    // Glow wingtips based on projectile counts to show upgrading severity
    ctx.fillStyle = '#38bdf8';
    
    // Left wingtip weapon dot
    ctx.beginPath();
    ctx.arc(-11, -12, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Right wingtip weapon dot
    ctx.beginPath();
    ctx.arc(-11, 12, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Cockpit windshield screen
    ctx.beginPath();
    ctx.moveTo(6, -4);
    ctx.lineTo(13, 0);
    ctx.lineTo(6, 4);
    ctx.closePath();
    ctx.fillStyle = '#e2e8f0'; // bright silver cockpit
    ctx.fill();

    ctx.restore();

    // Enqueue next loop
    frameIdRef.current = requestAnimationFrame(gameLoop);
  };

  // Attach loops
  useEffect(() => {
    if (isPlaying && !isPaused) {
      frameIdRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    };
  }, [isPlaying, isPaused, dimensions]);

  return (
    <div 
      className="w-full h-full relative cursor-crosshair rounded-2xl overflow-hidden border border-neutral-800/60 bg-neutral-950" 
      ref={containerRef}
    >
      <canvas
        id="space-arena-canvas"
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="block"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
      />
      
      {/* Dynamic guidance overlay when game starts */}
      {!isMouseInCanvasRef.current && isPlaying && (
        <div className="absolute inset-0 bg-neutral-950/40 flex items-center justify-center text-center pointer-events-none transition-all duration-300">
          <div className="px-5 py-3 rounded-full bg-black/60 border border-neutral-800/80 backdrop-blur-md animate-pulse">
            <p className="text-xs text-neutral-400 font-sans tracking-wide">
              마우스 커서를 이 영역으로 가져오면 비행선을 조종할 수 있습니다!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

import { useState, useEffect } from 'react';
import { GameStats, DefenseUpgrades, SheepUnit, SheepType } from './types';
import { GameCanvas } from './components/GameCanvas';
import { UpgradePanel } from './components/UpgradePanel';
import { GameHUD } from './components/GameHUD';
import { sfx } from './utils/audio';
import { 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Play, 
  HelpCircle,
  TrendingUp,
  CircleCheck,
  Zap,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const INITIAL_STATS: GameStats = {
  score: 0,
  gold: 140, // generous starter funds to test and enjoy immediately!
  waveNum: 1,
  waveTimeLeft: 22,
  waveTotalDuration: 22, // 22 seconds per wave difficulty multiplier
  goldSheepCount: 2, // start with a nice pair of golden sheep
  wolvesDefeated: 0,
  fenceHp: 1000,
  fenceMaxHp: 1000,
  fenceRegen: 0,
  highScore: 0,
};

const INITIAL_UPGRADES: DefenseUpgrades = {
  normalAtkLevel: 0,
  fireAtkLevel: 0,
  freezeSlowLevel: 0,
  lightningAtkLevel: 0,
  poisonAtkLevel: 0,
  fenceUpgradeLevel: 0,
  fenceRegenLevel: 0,
};

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // Game state values
  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const [upgrades, setUpgrades] = useState<DefenseUpgrades>(INITIAL_UPGRADES);
  
  // Active roster of defensive sheeps on pasture grid
  const [sheepUnits, setSheepUnits] = useState<SheepUnit[]>([]);
  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number | null>(null);

  // Persistent high scores
  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sheep_defense_high_score');
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });

  const handleToggleMute = () => {
    const isNowMuted = sfx.toggleMute();
    setIsMuted(isNowMuted);
  };

  // Convert slot index (0-15) to pasture 2D coordinates (copied matching GameCanvas scale)
  const getSlotCoord = (idx: number) => {
    const gridConfig = {
      colCount: 4,
      slotSize: 62,
      gap: 12,
      xOffset: 50,
      yOffset: 160,
    };
    const row = Math.floor(idx / gridConfig.colCount);
    const col = idx % gridConfig.colCount;
    const x = gridConfig.xOffset + col * (gridConfig.slotSize + gridConfig.gap) + gridConfig.slotSize / 2;
    const y = gridConfig.yOffset + row * (gridConfig.slotSize + gridConfig.gap) + gridConfig.slotSize / 2;
    return { x, y };
  };

  const handleStartGame = () => {
    // 1. Reset metrics
    setStats({
      ...INITIAL_STATS,
      highScore: highScore,
    });
    setUpgrades({ ...INITIAL_UPGRADES });
    setSelectedSlotIdx(null);

    // 2. Spawn 3 complimentary defensive starter sheeps of random attribute types on empty slots
    const starterSheep: SheepUnit[] = [];
    const usedSlots = new Set<number>();
    const types: SheepType[] = ['normal', 'fire', 'freeze'];

    for (let i = 0; i < 3; i++) {
      let slotIdx = Math.floor(Math.random() * 16);
      while (usedSlots.has(slotIdx)) {
        slotIdx = Math.floor(Math.random() * 16);
      }
      usedSlots.add(slotIdx);

      const coord = getSlotCoord(slotIdx);
      starterSheep.push({
        id: Math.random().toString(36).substring(2, 9),
        type: types[i],
        tier: 1,
        slotIdx,
        x: coord.x,
        y: coord.y,
        lastShotTime: 0,
      });
    }

    setSheepUnits(starterSheep);
    setGameState('playing');
    setIsPaused(false);
    sfx.playBaa();
  };

  // Upgrades triggered via panel
  const handleUpgradeClassAtk = (type: SheepType) => {
    let cost = 0;
    let level = 0;

    switch(type) {
      case 'normal': 
        level = upgrades.normalAtkLevel;
        cost = Math.round(45 * Math.pow(1.3, level));
        break;
      case 'fire': 
        level = upgrades.fireAtkLevel;
        cost = Math.round(55 * Math.pow(1.3, level));
        break;
      case 'freeze': 
        level = upgrades.freezeSlowLevel;
        cost = Math.round(50 * Math.pow(1.3, level));
        break;
      case 'lightning': 
        level = upgrades.lightningAtkLevel;
        cost = Math.round(55 * Math.pow(1.3, level));
        break;
      case 'poison': 
        level = upgrades.poisonAtkLevel;
        cost = Math.round(50 * Math.pow(1.3, level));
        break;
    }

    if (stats.gold >= cost) {
      setStats((prev) => ({ ...prev, gold: prev.gold - cost }));
      setUpgrades((prev) => {
        const next = { ...prev };
        if (type === 'normal') next.normalAtkLevel++;
        else if (type === 'fire') next.fireAtkLevel++;
        else if (type === 'freeze') next.freezeSlowLevel++;
        else if (type === 'lightning') next.lightningAtkLevel++;
        else if (type === 'poison') next.poisonAtkLevel++;
        return next;
      });
      sfx.playMerge(); // melodical play
    }
  };

  // Repair fence back to full max health
  const handleRepairFence = () => {
    const repairCost = 30;
    if (stats.gold >= repairCost && stats.fenceHp < stats.fenceMaxHp) {
      setStats((prev) => ({
        ...prev,
        gold: prev.gold - repairCost,
        fenceHp: prev.fenceMaxHp, // cure fully!
      }));
      sfx.playMerge();
    }
  };

  // Upgrade fence maximum HP capacity
  const handleUpgradeFenceMaxHp = () => {
    const cost = Math.round(60 * Math.pow(1.35, upgrades.fenceUpgradeLevel));
    if (stats.gold >= cost) {
      setStats((prev) => ({
        ...prev,
        gold: prev.gold - cost,
        fenceMaxHp: prev.fenceMaxHp + 100, // add 100 max health
        fenceHp: prev.fenceHp + 100, // heal the upgrade portion
      }));
      setUpgrades((prev) => ({
        ...prev,
        fenceUpgradeLevel: prev.fenceUpgradeLevel + 1,
      }));
      sfx.playMerge();
    }
  };

  // Upgrade automatically fence regeneration rate per second
  const handleUpgradeFenceRegen = () => {
    const cost = Math.round(75 * Math.pow(1.45, upgrades.fenceRegenLevel));
    if (stats.gold >= cost) {
      setStats((prev) => ({
        ...prev,
        gold: prev.gold - cost,
      }));
      setUpgrades((prev) => ({
        ...prev,
        fenceRegenLevel: prev.fenceRegenLevel + 1,
      }));
      sfx.playMerge();
    }
  };

  // Click handler to buy randomized defensive attack sheep
  const handleBuySheepUnit = () => {
    const cost = 50 + sheepUnits.length * 3; // slight scaling
    if (stats.gold >= cost && sheepUnits.length < 16) {
      // Find empty slot (index 0 to 15)
      const occupiedSlots = new Set(sheepUnits.map((u) => u.slotIdx));
      const availableSlots: number[] = [];
      for (let i = 0; i < 16; i++) {
        if (!occupiedSlots.has(i)) {
          availableSlots.push(i);
        }
      }

      if (availableSlots.length > 0) {
        // Pick random empty slot
        const randomAvailableSlot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
        const coord = getSlotCoord(randomAvailableSlot);

        // Pick random type attribute
        const pool: SheepType[] = ['normal', 'fire', 'freeze', 'lightning', 'poison'];
        const randomType = pool[Math.floor(Math.random() * pool.length)];

        const newSheep: SheepUnit = {
          id: Math.random().toString(36).substring(2, 9),
          type: randomType,
          tier: 1, // starter tier
          slotIdx: randomAvailableSlot,
          x: coord.x,
          y: coord.y,
          lastShotTime: 0,
        };

        setStats((prev) => ({ ...prev, gold: prev.gold - cost }));
        setSheepUnits((prev) => [...prev, newSheep]);
        sfx.playBaa(1.0 + Math.random() * 0.2); // play cute random pitch bleat
      }
    }
  };

  // Click handler to buy Golden Income Sheep
  const handleBuyGoldSheep = () => {
    const cost = Math.round(40 * Math.pow(1.4, stats.goldSheepCount - 1));
    if (stats.gold >= cost) {
      setStats((prev) => ({
        ...prev,
        gold: prev.gold - cost,
        goldSheepCount: prev.goldSheepCount + 1,
      }));
      sfx.playBaa(0.85); // lower pitch for gold sheep
    }
  };

  // Helper checks if selected sheep is mergeable (has 2 other matching on pasture)
  const isSelectedSheepMergeable = (): boolean => {
    if (selectedSlotIdx === null) return false;
    const target = sheepUnits.find((u) => u.slotIdx === selectedSlotIdx);
    if (!target) return false;

    // Must have at least 3 matching type and tier units to merge
    const matchesCount = sheepUnits.filter(
      (u) => u.type === target.type && u.tier === target.tier
    ).length;

    return matchesCount >= 3;
  };

  // Merge specific active triplet selected sheep unit
  const handleMergeSpecific = (unit: SheepUnit) => {
    const matches = sheepUnits.filter(
      (u) => u.type === unit.type && u.tier === unit.tier
    );

    if (matches.length >= 3) {
      // Keep the targeted selected unit but upgrade its tier
      // Delete the other 2 matches
      const updatedRoster: SheepUnit[] = [];
      let deletedCount = 0;

      sheepUnits.forEach((u) => {
        if (u.id === unit.id) {
          // Upgrade targeted selected element
          updatedRoster.push({
            ...u,
            tier: u.tier + 1,
          });
        } else if (u.type === unit.type && u.tier === unit.tier && deletedCount < 2) {
          // Melt away other matching duplicate units (free up slots)
          deletedCount++;
        } else {
          updatedRoster.push(u);
        }
      });

      setSheepUnits(updatedRoster);
      setSelectedSlotIdx(null); // release highlight
      sfx.playMerge();
    }
  };

  // Universal Auto-Merge triplets: Scans entire board and merges any matching triplets
  // Very satisfying idling cleanup helper!
  const handleAutoMergeAll = () => {
    let currentRoster = [...sheepUnits];
    let mergedSomething = false;
    let keepScanning = true;

    while (keepScanning) {
      let mergeFoundThisScan = false;

      // Group units by type and tier
      const map: Record<string, SheepUnit[]> = {};
      currentRoster.forEach((u) => {
        const key = `${u.type}_tier_${u.tier}`;
        if (!map[key]) map[key] = [];
        map[key].push(u);
      });

      // Find any key with 3 or more segments
      for (const key in map) {
        const list = map[key];
        if (list.length >= 3) {
          // Merge triplets!
          const keepUnit = list[0];
          const removeUnit1 = list[1];
          const removeUnit2 = list[2];

          // Rebuild roster: upgrade keepUnit, remove target duplicates
          currentRoster = currentRoster.map((u) => {
            if (u.id === keepUnit.id) {
              return { ...u, tier: u.tier + 1 };
            }
            return u;
          }).filter((u) => u.id !== removeUnit1.id && u.id !== removeUnit2.id);

          mergeFoundThisScan = true;
          mergedSomething = true;
          break; // break loop to rebuild and re-group next scan to cascade up
        }
      }

      if (!mergeFoundThisScan) {
        keepScanning = false;
      }
    }

    if (mergedSomething) {
      setSheepUnits(currentRoster);
      setSelectedSlotIdx(null); // clear selection
      sfx.playMerge();
    } else {
      // Feedback: play a mild buzz/baa or ignore
      sfx.playBaa(1.35); // quick alert bleat
    }
  };

  // Game over coordinator
  const handleGameOver = () => {
    setGameState('gameover');
    sfx.playBaa(0.7); // sad bleat

    // Register highscore
    if (stats.score > highScore) {
      setHighScore(stats.score);
      localStorage.setItem('sheep_defense_high_score', stats.score.toString());
    }
  };

  // Sell defense sheep unit
  const handleSellSheep = (unit: SheepUnit) => {
    let refund = 35;
    if (unit.tier === 2) refund = 105;
    if (unit.tier === 3) refund = 315;

    setSheepUnits((prev) => prev.filter((u) => u.id !== unit.id));
    setSelectedSlotIdx(null);
    setStats((prev) => ({
      ...prev,
      gold: prev.gold + refund,
    }));
    sfx.playCoin();
  };

  // Map elements
  const currentSelectedUnit = selectedSlotIdx !== null 
    ? sheepUnits.find((u) => u.slotIdx === selectedSlotIdx) || null 
    : null;

  return (
    <div id="game-app-root" className="min-h-screen bg-[#070b0c] text-neutral-100 flex flex-col justify-between overflow-x-hidden relative selection:bg-indigo-500/30 selection:text-white">
      
      {/* Grass/Pasture Ambient Matrix Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/15 via-[#060a0b] to-[#040607] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0" />

      {/* Main Top Header */}
      <header className="w-full max-w-7xl mx-auto px-5 py-4 z-10 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-emerald-600 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.2)] border border-indigo-400/20">
            <span className="text-xl shrink-0 select-none">🐑</span>
          </div>
          <div>
            <h1 className="font-sans font-black text-lg tracking-tight bg-gradient-to-r from-emerald-400 via-indigo-250 to-white bg-clip-text text-transparent uppercase">
              양덤디 : 양 랜덤 디펜스
            </h1>
            <p className="font-sans text-[10px] text-emerald-400 font-bold tracking-widest">SHEEP RANDOM DEFENSE • RANCH GUARDIANS</p>
          </div>
        </div>

        {/* Global Controls HUD */}
        <div className="flex items-center gap-3.5">
          {/* High Score Panel */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/15 rounded-full border border-indigo-500/25 text-indigo-300">
            <span className="text-xs">🏆</span>
            <span className="font-sans text-[10px] font-bold">최고 기록:</span>
            <span className="font-mono text-xs font-bold text-amber-300">{highScore.toLocaleString()}</span>
          </div>

          <button
            onClick={handleToggleMute}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-850 hover:bg-neutral-800 transition-all hover:scale-105 active:scale-95 cursor-pointer text-indigo-350"
            title={isMuted ? '음소거 해제' : '음소거'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Main Game Segment */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-5 py-1 z-10 flex flex-col md:flex-row gap-5 items-stretch h-[calc(100vh-140px)] min-h-[460px]">
        {gameState === 'menu' && (
          <div className="w-full flex flex-col items-center justify-center p-4 bg-neutral-950/50 rounded-2xl border border-neutral-900/80 backdrop-blur-sm self-center max-w-2xl mx-auto py-8 shadow-3xl text-center">
            <div className="mb-5 relative">
              <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-indigo-600 border border-emerald-300/20 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(16,185,129,0.3)] select-none">
                <span className="text-4xl animate-bounce">🐑</span>
              </div>
            </div>

            <h2 className="text-2xl font-sans font-black tracking-tight mb-1 text-white uppercase">
              목장의 평화를 위협하는 늑대 군대를 막아내세요!
            </h2>
            <p className="text-neutral-400 text-xs max-w-md mx-auto leading-relaxed mb-6">
              양덤디는 방목 농장을 덮치는 교활하고 포악한 늑대 무리에 대항하는 하이브리드 전략 디펜스 게임입니다. 양들을 무작위 배치하고, 강화된 속성의 신세대 초강력 3성 양으로 합성 진화시켜 울타리를 보강하세요!
            </p>

            {/* Rules Bento Items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl mb-6 text-left">
              <div className="p-3 bg-neutral-900/60 border border-neutral-850 rounded-xl flex items-start gap-2.5">
                <span className="text-xl shrink-0 p-1 bg-neutral-800 rounded-lg">🎲</span>
                <div>
                  <h4 className="font-sans font-bold text-xs text-neutral-200">랜덤 뽑기와 무제한 이동</h4>
                  <p className="text-[10px] text-neutral-400 leading-normal mt-0.5">골드로 수비용 양을 무작위 소환합니다. 아레나의 칸을 클릭하여 유치 장소를 언제든 이동/교체할 수 있습니다.</p>
                </div>
              </div>

              <div className="p-3 bg-neutral-900/60 border border-neutral-850 rounded-xl flex items-start gap-2.5">
                <span className="text-xl shrink-0 p-1 bg-neutral-800 rounded-lg">🧬</span>
                <div>
                  <h4 className="font-sans font-bold text-xs text-neutral-200">동일 등급 3마리 합성 (Merge)</h4>
                  <p className="text-[10px] text-neutral-400 leading-normal mt-0.5">목장에 동일 성향, 동일 등급의 양이 3마리 모였을 때 자동으로 혹은 클릭 병합하여, 높은 공격력의 상급 양으로 합성 진화합니다.</p>
                </div>
              </div>

              <div className="p-3 bg-neutral-900/60 border border-neutral-850 rounded-xl flex items-start gap-2.5">
                <span className="text-xl shrink-0 p-1 bg-neutral-800 rounded-lg">🔥</span>
                <div>
                  <h4 className="font-sans font-bold text-xs text-neutral-200">5대 원소 속성 조합</h4>
                  <p className="text-[10px] text-neutral-400 leading-normal mt-0.5">일반(강력), 화염(영역 화약), 빙결(소화전 감속), 전격(체쇄 타격), 맹독(부식 도트) 원소들의 연쇄 전략 효과를 조율하세요.</p>
                </div>
              </div>

              <div className="p-3 bg-neutral-900/60 border border-neutral-850 rounded-xl flex items-start gap-2.5">
                <span className="text-xl shrink-0 p-1 bg-neutral-800 rounded-lg">🪙</span>
                <div>
                  <h4 className="font-sans font-bold text-xs text-neutral-200">골드량 비례 정규 인컴</h4>
                  <p className="text-[10px] text-neutral-400 leading-normal mt-0.5">생산용 인컴 골드양을 따로 구매 배치할수록 매 5초 단위의 지급 골드 생산 배율이 기하급수적으로 부풀어 오릅니다.</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleStartGame}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-650 hover:from-emerald-400 hover:to-indigo-550 font-sans font-black text-neutral-950 flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 cursor-pointer select-none"
            >
              <span>목장 디펜스 전투 개시</span>
              <Play className="w-4 h-4 fill-neutral-950" />
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="flex-1 w-full h-full flex flex-col md:flex-row gap-4 items-stretch">
            {/* Left Sector: Stage Map and Header Details */}
            <div className="flex-1 flex flex-col gap-3.5 min-w-0 h-full">
              <GameHUD stats={stats} />

              <div className="flex-1 relative min-h-[380px]">
                <GameCanvas
                  stats={stats}
                  setStats={setStats}
                  upgrades={upgrades}
                  sheepUnits={sheepUnits}
                  setSheepUnits={setSheepUnits}
                  selectedSlotIdx={selectedSlotIdx}
                  setSelectedSlotIdx={setSelectedSlotIdx}
                  isPlaying={gameState === 'playing'}
                  isPaused={isPaused}
                  onGameOver={handleGameOver}
                />

                {/* Pause Button */}
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="absolute bottom-4 left-4 px-3 py-1.5 bg-neutral-950/80 border border-neutral-800 text-[10px] font-bold text-neutral-300 hover:text-white rounded-lg pointer-events-auto backdrop-blur-md cursor-pointer hover:bg-neutral-900 select-none"
                >
                  {isPaused ? '전투 재개' : '일시 정지'}
                </button>

                {/* Pause Overlay Grid */}
                {isPaused && (
                  <div className="absolute inset-0 bg-neutral-950/85 pointer-events-auto flex items-center justify-center z-20 backdrop-blur-sm rounded-2xl">
                    <div className="text-center p-6 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-3xl max-w-sm">
                      <HelpCircle className="w-10 h-10 text-indigo-400 mx-auto mb-3 animate-pulse" />
                      <h3 className="text-lg font-sans font-black mb-1 text-emerald-400">목장 통제 임시 락</h3>
                      <p className="text-xs text-neutral-400 mb-5 leading-relaxed">디펜스 전력 관리 전원 코드가 잠시 소켓 분리되었습니다. 휴식 후 공격을 이어가세요.</p>
                      <button
                        onClick={() => setIsPaused(false)}
                        className="px-5 py-2.5 bg-emerald-500 text-neutral-950 font-sans font-black text-xs rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      >
                        계속 방어하기
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Sector: Upgrades panel on Sidebar */}
            <div className="shrink-0 md:w-85 lg:w-90 flex flex-col justify-start h-full">
              <UpgradePanel 
                stats={stats}
                upgrades={upgrades}
                sheepUnitCount={sheepUnits.length}
                selectedSheep={currentSelectedUnit}
                hasMergeableMatch={isSelectedSheepMergeable()}
                onBuySheepUnit={handleBuySheepUnit}
                onBuyGoldSheep={handleBuyGoldSheep}
                onRepairFence={handleRepairFence}
                onUpgradeFenceMaxHp={handleUpgradeFenceMaxHp}
                onUpgradeFenceRegen={handleUpgradeFenceRegen}
                onUpgradeClassAtk={handleUpgradeClassAtk}
                onAutoMergeAll={handleAutoMergeAll}
                onMergeSpecific={handleMergeSpecific}
                onDeselect={() => setSelectedSlotIdx(null)}
                onSellSheep={handleSellSheep}
              />
            </div>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="w-full flex flex-col items-center justify-center p-4 bg-neutral-950/50 rounded-2xl border border-red-950/80 backdrop-blur-sm self-center max-w-md mx-auto py-8 shadow-3xl text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4 animate-pulse select-none">
              <span className="text-2xl">☠️</span>
            </div>

            <h2 className="text-xl font-sans font-black tracking-tight mb-1 text-red-500 uppercase">
              목장 점령당함!
            </h2>
            <p className="text-[10px] text-indigo-400 tracking-wider font-mono font-medium uppercase mb-6">Mission Failed • Wolves Invaded</p>

            {/* Metrics scoreboard summary */}
            <div className="w-full bg-neutral-900/60 border border-neutral-850 rounded-xl p-4 flex flex-col gap-3.5 mb-6 text-left">
              <div className="flex items-center justify-between border-b border-neutral-850 pb-1.5">
                <span className="text-xs text-neutral-400">최종 늑대 제압수</span>
                <span className="text-xs font-mono font-bold text-sky-400">{stats.wolvesDefeated} 마리</span>
              </div>
              <div className="flex items-center justify-between border-b border-neutral-850 pb-1.5">
                <span className="text-xs text-neutral-400">최종 공헌도 점수 </span>
                <span className="text-sm font-mono font-bold text-amber-300">{stats.score.toLocaleString()} pts</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">최대 웨이브 진출</span>
                <span className="text-xs font-mono font-bold text-indigo-305">{stats.waveNum} 단계 웨이브</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-zinc-600" />
                  팁: 생산골드양(인컴)을 골고루 배치하는 것이 경제 순환의 시작입니다!
                </span>
              </div>
            </div>

            <button
              onClick={handleStartGame}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-indigo-650 hover:from-red-400 hover:to-indigo-550 font-sans font-black text-neutral-950 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-250 cursor-pointer select-none"
            >
              <RotateCcw className="w-4 h-4 text-neutral-950" />
              양 목장 복구하기 (다시 시작)
            </button>
          </div>
        )}
      </main>

      {/* Footer Block */}
      <footer className="w-full text-center py-4 text-[10px] text-neutral-600 shrink-0 border-t border-[#090e0c]/30 mt-auto">
        <p>© 2026 SHEEP RANDOM DEFENSE LTD • WEBAUDIO PRO-SYNTH • Coded in Clean HTML5 Engine</p>
      </footer>
    </div>
  );
}

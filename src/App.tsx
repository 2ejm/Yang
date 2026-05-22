import { useState, useEffect } from 'react';
import { GameStats, Upgrade, UpgradeType, CosmicEvent } from './types';
import { GameCanvas } from './components/GameCanvas';
import { UpgradePanel } from './components/UpgradePanel';
import { GameHUD } from './components/GameHUD';
import { sfx } from './utils/audio';
import { 
  Rocket, 
  Volume2, 
  VolumeX, 
  Coins, 
  Sparkles, 
  Play, 
  RotateCcw, 
  Info, 
  Trophy,
  Activity,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const INITIAL_UPGRADES: Upgrade[] = [
  { id: 'damage', name: '플라즈마 탄두 (공격력)', desc: '레이저 공격력이 +5 강화됩니다.', level: 0, maxLevel: 10, baseCost: 15, costMultiplier: 1.45, valuePerLevel: 5 },
  { id: 'fireRate', name: '초고속 축전기 (연사)', desc: '레이저 자동 발사 주기 속도가 가속됩니다.', level: 0, maxLevel: 10, baseCost: 20, costMultiplier: 1.5, valuePerLevel: 0.5 },
  { id: 'range', name: '유도 센서 개방 (공격 범위)', desc: '적선 및 유성 자동 잠금 범위가 +25px 확장됩니다.', level: 0, maxLevel: 8, baseCost: 25, costMultiplier: 1.6, valuePerLevel: 25 },
  { id: 'maxHp', name: '강화 장갑 격벽 (선체 체력)', desc: '최대 내구도가 +20 확장되며 즉시 보강됩니다.', level: 0, maxLevel: 10, baseCost: 15, costMultiplier: 1.4, valuePerLevel: 20 },
  { id: 'regen', name: '나노 봇 자가 수리 (회복)', desc: '매 초당 손상된 선체 내구도가 +0.5 복구됩니다.', level: 0, maxLevel: 8, baseCost: 35, costMultiplier: 1.7, valuePerLevel: 0.5 },
  { id: 'speed', name: '양자 중력 가속기 (추력)', desc: '비행선의 선회 및 마우스 자석 반응 기동성이 향상됩니다.', level: 0, maxLevel: 8, baseCost: 10, costMultiplier: 1.4, valuePerLevel: 0.7 },
  { id: 'magnet', name: '전자기 융합 장치 (자석)', desc: '원거리 희귀 광물을 끌어당기는 자력 범위가 +30px 확대됩니다.', level: 0, maxLevel: 8, baseCost: 12, costMultiplier: 1.45, valuePerLevel: 30 },
  { id: 'projectileCount', name: '보조 분할 레이저 (추가 포탑)', desc: '다중 동시 발사 포탑을 추가 장착합니다.', level: 0, maxLevel: 4, baseCost: 80, costMultiplier: 2.8, valuePerLevel: 1 },
];

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // Game state values
  const [minerals, setMinerals] = useState(0);
  const [shipHp, setShipHp] = useState(100);
  const [pirateActive, setPirateActive] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<CosmicEvent | null>(null);
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    mineralsCollected: 0,
    meteorsDestroyed: 0,
    piratesDestroyed: 0,
    timeSurvived: 0,
  });

  // Upgrades level tracker
  const [upgrades, setUpgrades] = useState<Upgrade[]>(INITIAL_UPGRADES);
  
  // Persistent Local High Score
  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cosmic_drifter_high_score');
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });

  // Mute audio synchronization
  const handleToggleMute = () => {
    const isNowMuted = sfx.toggleMute();
    setIsMuted(isNowMuted);
  };

  // Start a brand new simulation reset
  const handleStartGame = () => {
    setUpgrades(JSON.parse(JSON.stringify(INITIAL_UPGRADES))); // deep clone
    setMinerals(0);
    setShipHp(100);
    setPirateActive(false);
    setCurrentEvent(null);
    setStats({
      score: 0,
      mineralsCollected: 0,
      meteorsDestroyed: 0,
      piratesDestroyed: 0,
      timeSurvived: 0,
    });
    setGameState('playing');
    setIsPaused(false);
    
    // Play upgrade sound to indicate loading transition
    sfx.playUpgrade();
  };

  // Upgrading triggered
  const handleUpgrade = (type: UpgradeType) => {
    const targetIdx = upgrades.findIndex((u) => u.id === type);
    if (targetIdx === -1) return;

    const currentUpgrade = upgrades[targetIdx];
    const cost = Math.round(currentUpgrade.baseCost * Math.pow(currentUpgrade.costMultiplier, currentUpgrade.level));

    if (minerals >= cost && currentUpgrade.level < currentUpgrade.maxLevel) {
      setMinerals((prev) => prev - cost);
      
      const newUpgrades = [...upgrades];
      newUpgrades[targetIdx].level += 1;
      setUpgrades(newUpgrades);

      // Apply HP boost instantly to current HP if hull upgrade was selected
      if (type === 'maxHp') {
        const hpBuff = currentUpgrade.valuePerLevel;
        setShipHp((prev) => prev + hpBuff);
      }

      sfx.playUpgrade();
    }
  };

  // Handling collect crystal
  const handleMineralsCollected = (value: number) => {
    setMinerals((prev) => prev + value);
  };

  // Game over state
  const handleGameOver = () => {
    setGameState('gameover');
    sfx.playExplosion('player');

    // Register highscore
    if (stats.score > highScore) {
      setHighScore(stats.score);
      localStorage.setItem('cosmic_drifter_high_score', stats.score.toString());
    }
  };

  // Upgrades values mapping
  const getUpgradeModifierValue = (type: UpgradeType): number => {
    const up = upgrades.find((u) => u.id === type);
    if (!up) return 0;
    return up.level * up.valuePerLevel;
  };

  const maxHpBonus = getUpgradeModifierValue('maxHp');
  const regenBonus = getUpgradeModifierValue('regen');
  const damageBonus = getUpgradeModifierValue('damage');
  const fireRateBonus = getUpgradeModifierValue('fireRate');
  const rangeBonus = getUpgradeModifierValue('range');
  const speedBonus = getUpgradeModifierValue('speed');
  const magnetBonus = getUpgradeModifierValue('magnet');
  const projectileBonus = getUpgradeModifierValue('projectileCount');

  return (
    <div id="game-app-root" className="min-h-screen bg-[#030208] text-neutral-100 flex flex-col justify-between overflow-x-hidden relative selection:bg-rose-500/30 selection:text-white">
      
      {/* Visual Ambient Grid / Star Nebula */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-950/20 via-neutral-950/90 to-[#020205] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0" />

      {/* Main Top Header */}
      <header className="w-full max-w-7xl mx-auto px-4 py-4 z-10 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-cyan-400/20">
            <Rocket className="w-5 h-5 text-neutral-100 animate-pulse" />
          </div>
          <div>
            <h1 className="font-sans font-black text-lg tracking-tight bg-gradient-to-r from-cyan-400 via-indigo-200 to-white bg-clip-text text-transparent uppercase">
              우주 개척선 : 코스믹 드리프터
            </h1>
            <p className="font-sans text-[10px] text-indigo-400 font-medium tracking-wide">COSMIC DRIFTER • HARVESTER ENGINE</p>
          </div>
        </div>

        {/* Global Controls HUD */}
        <div className="flex items-center gap-3.5">
          {/* High Score Panel */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 rounded-full border border-indigo-500/20 text-indigo-300">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-sans text-[10px] font-bold">최고 점수:</span>
            <span className="font-mono text-xs font-bold text-amber-300">{highScore.toLocaleString()}</span>
          </div>

          <button
            onClick={handleToggleMute}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition-all hover:scale-105 active:scale-95 cursor-pointer text-indigo-300"
            title={isMuted ? '음소거 해제' : '음소거'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </header>

      {/* Main Interactive Screen Segment */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-1.5 z-10 flex flex-col md:flex-row gap-5 items-stretch h-[calc(100vh-140px)] min-h-[460px]">
        {gameState === 'menu' && (
          <div className="w-full flex flex-col items-center justify-center p-4 bg-neutral-950/40 rounded-2xl border border-neutral-900/60 backdrop-blur-sm self-center max-w-2xl mx-auto py-10 shadow-3xl text-center">
            <div className="mb-6 relative">
              <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-600 border border-cyan-300/30 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(6,182,212,0.4)]">
                <Rocket className="w-12 h-12 text-white animate-bounce" />
              </div>
            </div>

            <h2 className="text-3xl font-sans font-black tracking-tight mb-2 text-white uppercase">
              우주의 방랑자가 될 준비가 되셨습니까?
            </h2>
            <p className="text-neutral-400 text-sm max-w-md mx-auto leading-relaxed mb-8">
              광활한 코스믹 공역속을 유영하며 유성을 안전하게 마이닝하십시오. 외계 무리와 해적의 공격에 반격하면서 광물을 매각해 최강의 비행 함대를 공정 구축해 보세요.
            </p>

            {/* Quick Tutorial Bento Items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg mb-8 text-left">
              <div className="p-3.5 bg-neutral-900/60 border border-neutral-800 rounded-xl flex items-start gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-sans font-bold text-xs text-neutral-200">기본 마우스 비행</h4>
                  <p className="text-[10px] text-neutral-400 leading-normal mt-0.5">마우스 커서를 따라 비행선이 자유롭게 회전 및 선회 가속합니다.</p>
                </div>
              </div>

              <div className="p-3.5 bg-neutral-900/60 border border-neutral-800 rounded-xl flex items-start gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-sans font-bold text-xs text-neutral-200">자동 타겟팅 무장</h4>
                  <p className="text-[10px] text-neutral-400 leading-normal mt-0.5">사격 사정범위 내 유성과 적 함선을 자동으로 조준하여 속사 레이저를 투사합니다.</p>
                </div>
              </div>

              <div className="p-3.5 bg-neutral-900/60 border border-neutral-800 rounded-xl flex items-start gap-2.5">
                <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400 shrink-0">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-sans font-bold text-xs text-neutral-200">지능적 자석 및 개조</h4>
                  <p className="text-[10px] text-neutral-400 leading-normal mt-0.5">잔해 분쇄 시 튀어나오는 광물을 끌어당겨 정교한 선제 업그레이드를 받으세요.</p>
                </div>
              </div>

              <div className="p-3.5 bg-neutral-900/60 border border-neutral-800 rounded-xl flex items-start gap-2.5">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 shrink-0">
                  <Star className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-sans font-bold text-xs text-neutral-200">외계 탐사 해적선</h4>
                  <p className="text-[10px] text-neutral-400 leading-normal mt-0.5">주기적으로 출몰하는 강력한 침투 전력의 붉은 함포 화망을 돌파하세요.</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleStartGame}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 font-sans font-bold text-neutral-950 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-neutral-950" />
              탐험 시작하기
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="flex-1 w-full h-full flex flex-col md:flex-row gap-4 items-stretch">
            {/* Arena Game View Screen */}
            <div className="flex-1 flex flex-col gap-3 min-w-0 h-full">
              <GameHUD 
                hp={shipHp} 
                maxHp={100 + maxHpBonus} 
                stats={stats} 
                pirateActive={pirateActive}
                minerals={minerals}
              />

              {/* === COSMIC EVENTS BANNER === */}
              <AnimatePresence mode="popLayout">
                {currentEvent && (
                  <motion.div 
                    id="cosmic-event-banner"
                    initial={{ opacity: 0, height: 0, y: -20 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -20 }}
                    className={`px-4 py-3 rounded-xl border flex flex-col gap-1 backdrop-blur-md shadow-lg transition-all duration-300 ${
                      currentEvent.type === 'idle'
                        ? 'bg-emerald-950/20 border-emerald-500/25 text-emerald-300'
                        : currentEvent.type === 'space_market'
                        ? 'bg-amber-950/20 border-amber-500/35 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.06)]'
                        : currentEvent.type === 'blackhole_anomaly'
                        ? 'bg-purple-950/20 border-purple-500/35 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.06)]'
                        : 'bg-rose-950/20 border-rose-500/35 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.06)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          currentEvent.type === 'idle' ? 'bg-emerald-400' : 'bg-rose-450 animate-ping'
                        } ${
                          currentEvent.type === 'space_market' ? 'bg-amber-400' : ''
                        } ${
                          currentEvent.type === 'blackhole_anomaly' ? 'bg-purple-400' : ''
                        } ${
                          currentEvent.type === 'pirate_raid' || currentEvent.type === 'meteor_storm' ? 'bg-rose-500' : ''
                        }`} />
                        <span className="font-sans font-black text-xs tracking-wider uppercase">{currentEvent.name}</span>
                      </div>
                      <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded-md bg-neutral-950/80 border border-neutral-800 text-indigo-300">
                        남은 주기: {currentEvent.timeLeft}초
                      </span>
                    </div>
                    <p className="font-sans text-[11px] opacity-80 leading-relaxed">{currentEvent.description}</p>
                    
                    {/* Linear Progress Bar of Current Event Duration */}
                    <div className="w-full h-1 bg-neutral-900/60 rounded-full overflow-hidden mt-1">
                      <div 
                        className={`h-full transition-all duration-1000 ${
                          currentEvent.type === 'idle'
                            ? 'bg-emerald-500'
                            : currentEvent.type === 'space_market'
                            ? 'bg-amber-500'
                            : currentEvent.type === 'blackhole_anomaly'
                            ? 'bg-purple-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${(currentEvent.timeLeft / currentEvent.totalDuration) * 100}%` }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex-1 relative min-h-[400px]">
                <GameCanvas
                  isPlaying={gameState === 'playing'}
                  isPaused={isPaused}
                  onGameOver={handleGameOver}
                  onMineralsCollected={handleMineralsCollected}
                  shipHp={shipHp}
                  setShipHp={setShipHp}
                  maxHpModifier={maxHpBonus}
                  regenModifier={regenBonus}
                  damageModifier={damageBonus}
                  fireRateModifier={fireRateBonus}
                  rangeModifier={rangeBonus}
                  speedModifier={speedBonus}
                  magnetModifier={magnetBonus}
                  projectileModifier={projectileBonus}
                  setStats={setStats}
                  setPirateActive={setPirateActive}
                  onEventTriggered={(evt) => setCurrentEvent(evt)}
                />

                {/* Pause Button */}
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="absolute bottom-4 right-4 px-4 py-2 bg-neutral-950/80 border border-neutral-800 text-xs font-bold text-neutral-300 hover:text-white rounded-lg pointer-events-auto backdrop-blur-md cursor-pointer hover:bg-neutral-900"
                >
                  {isPaused ? '게임 재개' : '일시 정지'}
                </button>

                {/* Pause Overlay Grid */}
                {isPaused && (
                  <div className="absolute inset-0 bg-neutral-950/80 pointer-events-auto flex items-center justify-center z-20 backdrop-blur-sm rounded-2xl">
                    <div className="text-center p-6 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-3xl max-w-sm">
                      <h3 className="text-xl font-sans font-black mb-1.5 text-cyan-400">일시정지 상태</h3>
                      <p className="text-xs text-neutral-400 mb-5 leading-relaxed">비행 조종 제어장치가 잠시 비활성화되었습니다. 준비 상태에서 언제든지 정지를 해제해 은하 개척을 계속할 수 있습니다.</p>
                      <button
                        onClick={() => setIsPaused(false)}
                        className="px-5 py-2.5 bg-cyan-500 text-neutral-950 font-sans font-bold text-xs rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                      >
                        계속 비행하기
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Upgrades panel on Sidebar */}
            <div className="shrink-0 md:w-85 lg:w-96 flex flex-col justify-start">
              <UpgradePanel 
                upgrades={upgrades} 
                minerals={minerals} 
                onUpgrade={handleUpgrade} 
                currentEvent={currentEvent}
              />
            </div>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="w-full flex flex-col items-center justify-center p-4 bg-neutral-950/40 rounded-2xl border border-rose-950/30 backdrop-blur-sm self-center max-w-md mx-auto py-10 shadow-3xl text-center">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <VolumeX className="w-8 h-8 text-rose-500" />
            </div>

            <h2 className="text-2xl font-sans font-black tracking-tight mb-1 text-rose-500 uppercase">
              비행선 격침 당함!
            </h2>
            <p className="text-[11px] text-indigo-400 tracking-wider font-mono font-medium uppercase mb-6">Mission Failed • Ship Destroyed</p>

            {/* Historic metrics details stats summary */}
            <div className="w-full bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3.5 mb-6 text-left">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
                <span className="text-xs text-neutral-400">최종 스코어 점수</span>
                <span className="text-sm font-mono font-bold text-amber-300">{stats.score.toLocaleString()} pts</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">생존 생체 시간</span>
                <span className="text-xs font-mono font-medium text-neutral-300">{Math.floor(stats.timeSurvived / 60)}분 {stats.timeSurvived % 60}초</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400 font-medium">분쇄한 잔해 유성</span>
                <span className="text-xs font-mono font-medium text-neutral-300">{stats.meteorsDestroyed}개</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">제압한 침입 해적선</span>
                <span className="text-xs font-mono text-medium text-rose-400">{stats.piratesDestroyed}척</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">총 수집 희귀 광물량</span>
                <span className="text-xs font-mono font-medium text-yellow-300">{stats.mineralsCollected}개</span>
              </div>
            </div>

            <button
              onClick={handleStartGame}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-400 hover:to-indigo-500 font-sans font-bold text-neutral-950 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-neutral-950" />
              개척선 재발진 (다시 시작)
            </button>
          </div>
        )}
      </main>

      {/* Footer System Status Block */}
      <footer className="w-full text-center py-4 text-[10px] text-neutral-600 shrink-0 border-t border-neutral-900/40 mt-auto">
        <p>© 2026 COSMIC DRIFTER LTD • WARP MATRIX ACTIVE • Coded in Premium HTML5 Engine</p>
      </footer>
    </div>
  );
}

import React from 'react';
import { GameStats } from '../types';
import { Shield, Target, Waves, Hourglass, ShieldAlert } from 'lucide-react';

interface GameHUDProps {
  hp: number;
  maxHp: number;
  stats: GameStats;
  pirateActive: boolean;
  minerals: number;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hp,
  maxHp,
  stats,
  pirateActive,
  minerals,
}) => {
  const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const isLp = hpPercent < 30;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full flex flex-col gap-3 pointer-events-none select-none">
      {/* Top Bar for status indicators */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-neutral-950/75 backdrop-blur-md px-6 py-3.5 rounded-2xl border border-neutral-800/80 shadow-xl">
        {/* HP Bar */}
        <div className="flex flex-col gap-1 w-64">
          <div className="flex justify-between items-center px-1">
            <span className="flex items-center gap-1.5 text-xs text-neutral-300 font-sans font-medium">
              <Shield className={`w-3.5 h-3.5 ${isLp ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`} />
              선체 에너지
            </span>
            <span className="text-xs font-mono font-bold text-neutral-200">
              {Math.max(0, Math.floor(hp))} / {maxHp}
            </span>
          </div>
          <div className="w-full h-3 bg-neutral-900 border border-neutral-800 rounded-full overflow-hidden relative">
            <div 
              className={`h-full transition-all duration-150 ${
                isLp 
                  ? 'bg-gradient-to-r from-rose-600 to-rose-400 animate-pulse' 
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400'
              }`}
              style={{ width: `${hpPercent}%` }}
            />
            {isLp && (
              <div className="absolute inset-0 bg-red-600/10 animate-ping pointer-events-none rounded-full" />
            )}
          </div>
        </div>

        {/* HUD Statistics */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-neutral-500 uppercase font-sans tracking-wider">생존 시간</span>
            <span className="text-sm font-mono font-bold text-neutral-300 flex items-center gap-1.5 mt-0.5">
              <Hourglass className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              {formatTime(stats.timeSurvived)}
            </span>
          </div>

          <div className="h-6 w-px bg-neutral-800" />

          <div className="flex flex-col items-center">
            <span className="text-[10px] text-neutral-500 uppercase font-sans tracking-wider font-medium">유성 파괴</span>
            <span className="text-sm font-mono font-bold text-neutral-300 flex items-center gap-1.5 mt-0.5">
              <Target className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              {stats.meteorsDestroyed}
            </span>
          </div>

          <div className="h-6 w-px bg-neutral-800" />

          <div className="flex flex-col items-center border-rose-500/15">
            <span className="text-[10px] text-neutral-500 uppercase font-sans tracking-wider font-medium">해적 격추</span>
            <span className="text-sm font-mono font-bold text-rose-400 flex items-center gap-1.5 mt-0.5">
              <Waves className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              {stats.piratesDestroyed}
            </span>
          </div>
        </div>

        {/* HUD Game Score */}
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium font-sans">획득 점수</span>
          <span className="text-lg font-mono font-black text-rose-400 tracking-tight mt-0.5">
            {stats.score.toLocaleString()} <span className="text-xs text-neutral-400 font-sans font-normal">pts</span>
          </span>
        </div>
      </div>

      {/* Alert banner for active Pirate attack */}
      {pirateActive && (
        <div className="w-full flex justify-center animate-bounce mt-2">
          <div className="flex items-center gap-2.5 px-6 py-2.5 bg-rose-950/90 border-2 border-rose-600 rounded-xl shadow-[0_0_15px_rgba(224,36,36,0.3)] backdrop-blur-md">
            <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse shrink-0" />
            <span className="text-rose-100 font-sans font-bold text-xs tracking-wider uppercase animate-pulse">
              경고: 우주 해적선 침입! 무기를 가동하십시오!
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
